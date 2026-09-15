import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

import YOLO_LABELS from '../assets/models/yolo_labels.json';

const INPUT_SIZE = 640;
export const DETECTION_CONFIDENCE_THRESHOLD = 0.4;
const NMS_IOU_THRESHOLD = 0.45;
const MAX_DETECTIONS = 8;
export { YOLO_LABELS };

let modelPromise = null;

// Same lazy-require + expo-asset resolution as predictionService.js, and for
// the same two reasons: a top-level `require('react-native-fast-tflite')`
// would crash immediately on web before predictDiseaseRegions's own
// Platform.OS check could run, and expo-asset's downloadAsync() is what
// produces a real file:// URI for a non-image asset in an Android release
// build (the library's own resolver expects an image and mishandles it).
function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      const asset = Asset.fromModule(require('../assets/models/orchid_disease_yolo.tflite'));
      await asset.downloadAsync();
      const model = await loadTensorflowModel({ url: asset.localUri || asset.uri }, []);
      warnIfShapeMismatch(model);
      return model;
    })();
  }
  return modelPromise;
}

// Logged, not thrown: a mismatched export (wrong imgsz, wrong class count)
// should be loud in the logs rather than silently feeding decodeDetections()
// numbers it'll misinterpret as boxes.
function warnIfShapeMismatch(model) {
  const input = model.inputs[0];
  const output = model.outputs[0];
  const expectedAttrs = YOLO_LABELS.length + 4;

  const inputLooksRight =
    input?.shape?.length === 4 &&
    input.shape.includes(3) &&
    input.shape.includes(INPUT_SIZE) &&
    input.dataType === 'float32';
  if (!inputLooksRight) {
    console.warn('[detectionService] Model input does not match expectations.', {
      expected: { rank: 4, mustInclude: [3, INPUT_SIZE], dataType: 'float32' },
      actual: input,
    });
  }

  const outputLooksRight =
    output?.shape?.length === 3 && output.shape.includes(expectedAttrs) && output.dataType === 'float32';
  if (!outputLooksRight) {
    console.warn('[detectionService] Model output does not match the 7-class detection head.', {
      expectedAttrs,
      actual: output,
    });
  }
}

// Resizes to a fixed 640x640 (no letterbox padding) and normalizes pixels to
// 0-1 — Ultralytics' own preprocessing, unlike the classifier's ImageNet
// mean/std. Because this is a plain stretch rather than a letterboxed resize,
// a box normalized as a *fraction* of the 640x640 frame is the same fraction
// of the original photo on each axis independently, so no unletterboxing
// math is needed to interpret decodeDetections()'s output against the
// original image — only DetectionOverlay's cover-fit math (a separate
// concern: how the *displayed* image box crops that original photo).
async function imageToDetectionInput(uri, inputShape) {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  const rawBytes = Buffer.from(resized.base64, 'base64');
  const { data } = jpeg.decode(rawBytes, { useTArray: true }); // RGBA, interleaved, HWC

  // Same NCHW-vs-NHWC ambiguity as the classifier's model — detected from
  // the model's own reported input shape rather than assumed, since it's a
  // property of how this particular export was converted.
  const channelsFirst = inputShape?.[1] === 3;
  const planeSize = INPUT_SIZE * INPUT_SIZE;
  const input = new Float32Array(planeSize * 3);

  if (channelsFirst) {
    for (let px = 0; px < planeSize; px++) {
      const i = px * 4;
      input[px] = data[i] / 255;
      input[planeSize + px] = data[i + 1] / 255;
      input[2 * planeSize + px] = data[i + 2] / 255;
    }
  } else {
    for (let px = 0; px < planeSize; px++) {
      const i = px * 4;
      const o = px * 3;
      input[o] = data[i] / 255;
      input[o + 1] = data[i + 1] / 255;
      input[o + 2] = data[i + 2] / 255;
    }
  }
  return input.buffer;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function iou(a, b) {
  const interX1 = Math.max(a.x, b.x);
  const interY1 = Math.max(a.y, b.y);
  const interX2 = Math.min(a.x + a.width, b.x + b.width);
  const interY2 = Math.min(a.y + a.height, b.y + b.height);
  const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
  const unionArea = a.width * a.height + b.width * b.height - interArea;
  return unionArea <= 0 ? 0 : interArea / unionArea;
}

// Greedy per-class suppression: a raw YOLO head fires many overlapping
// anchors on the same real symptom, so without this every detection would
// render as a cluster of near-duplicate boxes instead of one.
function nonMaxSuppression(candidates) {
  const byClass = new Map();
  for (const c of candidates) {
    if (!byClass.has(c.label)) byClass.set(c.label, []);
    byClass.get(c.label).push(c);
  }

  const kept = [];
  for (const boxes of byClass.values()) {
    boxes.sort((a, b) => b.confidence - a.confidence);
    const suppressed = new Array(boxes.length).fill(false);
    for (let i = 0; i < boxes.length; i++) {
      if (suppressed[i]) continue;
      kept.push(boxes[i]);
      for (let j = i + 1; j < boxes.length; j++) {
        if (!suppressed[j] && iou(boxes[i].box, boxes[j].box) > NMS_IOU_THRESHOLD) {
          suppressed[j] = true;
        }
      }
    }
  }

  return kept.sort((a, b) => b.confidence - a.confidence).slice(0, MAX_DETECTIONS);
}

// Raw (non end-to-end) YOLOv8 TFLite heads output [batch, 4+numClasses,
// numAnchors] or [batch, numAnchors, 4+numClasses] depending on the export
// path — detected here from which axis actually equals 4+numClasses rather
// than assumed, since both layouts show up across Ultralytics versions.
function decodeDetections(rawOutput, outputShape) {
  const numClasses = YOLO_LABELS.length;
  const numAttrs = numClasses + 4;
  const dimA = outputShape[1];
  const dimB = outputShape[2];
  const channelsFirst = dimA === numAttrs;
  const numAnchors = channelsFirst ? dimB : dimA;

  const raw = [];
  for (let i = 0; i < numAnchors; i++) {
    let cx, cy, w, h;
    let bestScore = 0;
    let bestClass = -1;

    if (channelsFirst) {
      cx = rawOutput[i];
      cy = rawOutput[numAnchors + i];
      w = rawOutput[2 * numAnchors + i];
      h = rawOutput[3 * numAnchors + i];
      for (let c = 0; c < numClasses; c++) {
        const score = rawOutput[(4 + c) * numAnchors + i];
        if (score > bestScore) {
          bestScore = score;
          bestClass = c;
        }
      }
    } else {
      const base = i * numAttrs;
      cx = rawOutput[base];
      cy = rawOutput[base + 1];
      w = rawOutput[base + 2];
      h = rawOutput[base + 3];
      for (let c = 0; c < numClasses; c++) {
        const score = rawOutput[base + 4 + c];
        if (score > bestScore) {
          bestScore = score;
          bestClass = c;
        }
      }
    }

    if (bestScore < DETECTION_CONFIDENCE_THRESHOLD || bestClass < 0) continue;
    raw.push({ cx, cy, w, h, label: YOLO_LABELS[bestClass], confidence: bestScore });
  }

  if (raw.length === 0) return [];

  // Box coordinates come out in the model's 640x640 input-pixel space in
  // most raw exports, but some export paths already normalize to 0-1 —
  // detected from the values themselves rather than hard-coded, since
  // guessing wrong either way produces boxes clustered in one corner.
  const looksAlreadyNormalized = raw.every((d) => d.cx <= 1.5 && d.cy <= 1.5 && d.w <= 1.5 && d.h <= 1.5);
  const scale = looksAlreadyNormalized ? 1 : INPUT_SIZE;

  const candidates = raw.map((d) => ({
    box: {
      x: clamp01((d.cx - d.w / 2) / scale),
      y: clamp01((d.cy - d.h / 2) / scale),
      width: Math.min(d.w / scale, 1),
      height: Math.min(d.h / scale, 1),
    },
    label: d.label,
    confidence: d.confidence,
  }));

  return nonMaxSuppression(candidates);
}

// react-native-fast-tflite has no web binding, so a browser tab has no way
// to run the real .tflite model — same unavoidable exception as
// predictionService's web mock, and equally obviously fake (random box
// count/position) rather than a fixed constant someone could mistake for a
// working detector.
async function runWebDetectionMock() {
  await new Promise((r) => setTimeout(r, 800));
  const count = 1 + Math.floor(Math.random() * 2);
  return Array.from({ length: count }, () => {
    const width = 0.2 + Math.random() * 0.25;
    const height = 0.15 + Math.random() * 0.2;
    return {
      box: {
        x: Math.random() * (1 - width),
        y: Math.random() * (1 - height),
        width,
        height,
      },
      label: YOLO_LABELS[Math.floor(Math.random() * YOLO_LABELS.length)],
      confidence: 0.5 + Math.random() * 0.4,
    };
  });
}

// Returns an array of { box: { x, y, width, height }, label, confidence },
// all box fields normalized 0-1 against the full original photo. Empty
// array means "model ran, nothing above threshold" — same as a healthy scan.
export async function detectDiseaseRegions(imageUri) {
  if (Platform.OS === 'web') {
    return runWebDetectionMock();
  }

  const model = await getModel();
  const buffer = await imageToDetectionInput(imageUri, model.inputs[0].shape);
  const outputs = await model.run([buffer]);
  const raw = new Float32Array(outputs[0]);

  return decodeDetections(raw, model.outputs[0].shape);
}
