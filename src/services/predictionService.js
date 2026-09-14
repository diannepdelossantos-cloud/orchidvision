import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

import LABELS from '../assets/models/labels.json';

const INPUT_SIZE = 224;
export const CONFIDENCE_THRESHOLD = 0.6;
export { LABELS };

let modelPromise = null;

/**
 * Load the model once and reuse it.
 *
 * The tflite library is require()'d lazily rather than imported at the top of
 * the file. A top-level import is evaluated as soon as this module loads, which
 * would crash the app immediately on web (predictDisease never even calls
 * getModel there, but the crash would happen before that check could run).
 *
 * Resolving the bundled .tflite file's path goes through expo-asset rather
 * than handing the require() number straight to loadTensorflowModel: in an
 * Android release build, the library's own resolver (RN's
 * Image.resolveAssetSource, meant for images) produces a bare filename with
 * no file://-style protocol for non-image assets, which crashes with
 * "MalformedURLException: no protocol". expo-asset's downloadAsync() is the
 * same asset-resolution path already used elsewhere in this app and returns
 * a real local file:// URI in both dev and release builds.
 */
function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      const asset = Asset.fromModule(require('../assets/models/orchid_health.tflite'));
      await asset.downloadAsync();
      // The delegates array is a required argument (not optional) — an
      // empty array means "use the default CPU delegate".
      const model = await loadTensorflowModel({ url: asset.localUri || asset.uri }, []);
      warnIfShapeMismatch(model);
      return model;
    })();
  }
  return modelPromise;
}

// A model whose input/output shape doesn't match what imageToInput() feeds
// it and buildResult() expects back doesn't throw — model.run() just
// returns numbers, which buildResult() will happily zip against LABELS
// even if the lengths don't line up. Checked once at load time, against
// the actual shapes reported by the native library, so a mismatched
// export (wrong image size, wrong class count) is loud in the logs
// instead of silently producing plausible-looking garbage predictions.
function warnIfShapeMismatch(model) {
  const input = model.inputs[0];
  const output = model.outputs[0];
  // NCHW: [batch, channels, height, width] — this model was exported with
  // channels-first layout, unlike the NHWC ([1,224,224,3]) layout typical
  // of a Keras-native export. Don't assume one over the other; it's a
  // property of how the specific model was converted.
  const expectedInput = [1, 3, INPUT_SIZE, INPUT_SIZE];
  const expectedOutputLength = LABELS.length;

  if (!input || !arraysEqual(input.shape, expectedInput) || input.dataType !== 'float32') {
    console.warn(
      '[predictionService] Model input does not match expectations.',
      { expected: { shape: expectedInput, dataType: 'float32' }, actual: input }
    );
  }
  const outputLength = output?.shape?.[output.shape.length - 1];
  if (!output || outputLength !== expectedOutputLength || output.dataType !== 'float32') {
    console.warn(
      '[predictionService] Model output does not match labels.json.',
      { expectedClassCount: expectedOutputLength, labels: LABELS, actual: output }
    );
  }
}

function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}

// ImageNet mean/std (RGB order), matching this model's training preprocessing.
// IMPORTANT: this is specific to how this particular model was trained — it
// is not a universal TFLite convention. Do not reuse these constants for a
// future model swap without confirming the new model's own training
// normalization first.
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/**
 * Turn a photo URI into the flat, normalized, channels-first buffer the
 * model expects: [1, 3, 224, 224] float32, each pixel as
 * (value/255 - mean) / std, per RGB channel.
 */
async function imageToInput(uri) {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  const rawBytes = Buffer.from(resized.base64, 'base64');
  const { data } = jpeg.decode(rawBytes, { useTArray: true }); // RGBA, interleaved, HWC

  // The decoded pixels are interleaved RGBA (HWC). The model wants planar
  // CHW: all of the R channel, then all of G, then all of B — so channel c's
  // plane starts at offset c * planeSize, not every 3rd/4th value.
  const planeSize = INPUT_SIZE * INPUT_SIZE;
  const input = new Float32Array(planeSize * 3);
  for (let px = 0; px < planeSize; px++) {
    const i = px * 4; // index into the interleaved RGBA source
    input[px] = (data[i] / 255 - MEAN[0]) / STD[0]; // R plane
    input[planeSize + px] = (data[i + 1] / 255 - MEAN[1]) / STD[1]; // G plane
    input[2 * planeSize + px] = (data[i + 2] / 255 - MEAN[2]) / STD[2]; // B plane
  }
  return input;
}

function buildResult(scores) {
  const ranked = LABELS
    .map((label, i) => ({ label, score: scores[i] }))
    .sort((a, b) => b.score - a.score);

  return {
    top: ranked[0],
    ranked,
    isConfident: ranked[0].score >= CONFIDENCE_THRESHOLD,
  };
}

// react-native-fast-tflite is a native module with no web binding, so a
// browser tab has no way to run the real .tflite model at all — this is
// the one platform where a stand-in is unavoidable, and it's obviously
// fake (random, clearly commented) rather than a plausible-looking
// constant that could be mistaken for a working model. Every other
// platform (a dev client or a built app on Android/iOS) always runs the
// actual MobileNetV3 model end to end; if that native module is missing
// there (e.g. Expo Go instead of a dev client), predictDisease throws a
// real error instead of silently pretending to have classified anything.
async function runWebPreviewMock() {
  await new Promise((r) => setTimeout(r, 1200));
  const raw = LABELS.map(() => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  return buildResult(raw.map((v) => v / sum));
}

export async function predictDisease(imageUri) {
  if (Platform.OS === 'web') {
    return runWebPreviewMock();
  }

  const model = await getModel();
  const input = await imageToInput(imageUri);
  // model.run() takes/returns raw ArrayBuffers, not typed-array views —
  // input.buffer unwraps the Float32Array to what the native side expects,
  // and the output needs to be re-wrapped as a Float32Array before reading
  // the per-class scores back out of it.
  const outputs = await model.run([input.buffer]);
  const scores = new Float32Array(outputs[0]);

  return buildResult(Array.from(scores));
}