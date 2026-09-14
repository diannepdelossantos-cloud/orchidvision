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
      return loadTensorflowModel({ url: asset.localUri || asset.uri }, []);
    })();
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