import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

import LABELS from '../assets/models/labels.json';

// Flip to false ONLY in a development build. react-native-fast-tflite is a
// native module and does not exist in Expo Go or on web.
const USE_MOCK = true;

const INPUT_SIZE = 224;
export const CONFIDENCE_THRESHOLD = 0.6;
export { LABELS };

let modelPromise = null;

/**
 * Load the model once and reuse it.
 *
 * The tflite library is require()'d lazily rather than imported at the top of
 * the file. A top-level import is evaluated as soon as this module loads, which
 * would crash the app in Expo Go even when USE_MOCK is true.
 */
function getModel() {
  if (!modelPromise) {
    const { loadTensorflowModel } = require('react-native-fast-tflite');
    modelPromise = loadTensorflowModel(
      require('../assets/models/orchid_health.tflite')
    );
  }
  return modelPromise;
}

/**
 * Turn a photo URI into the flat pixel array the model expects.
 *
 * IMPORTANT: values stay in the 0-255 range. Keras' MobileNetV3 has
 * preprocessing baked into the model graph, so dividing by 255 here
 * would double-normalise and quietly wreck accuracy.
 */
async function imageToInput(uri) {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  const rawBytes = Buffer.from(resized.base64, 'base64');
  const { data } = jpeg.decode(rawBytes, { useTArray: true }); // RGBA

  // Drop the alpha channel: RGBA -> RGB
  const input = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let i = 0, j = 0; j < input.length; i += 4, j += 3) {
    input[j] = data[i];
    input[j + 1] = data[i + 1];
    input[j + 2] = data[i + 2];
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

export async function predictDisease(imageUri) {
  if (USE_MOCK) {
    // Random scores that always sum to 1, sized to however many labels exist.
    // Deliberately obvious nonsense: a plausible-looking constant is easy to
    // mistake for a working model.
    await new Promise((r) => setTimeout(r, 1200));
    const raw = LABELS.map(() => Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    return buildResult(raw.map((v) => v / sum));
  }

  const model = await getModel();
  const input = await imageToInput(imageUri);
  const outputs = await model.run([input]);

  return buildResult(Array.from(outputs[0]));
}