// ---------------------------------------------------------------------------
// The classifier and detector ship inside the app bundle as .tflite assets,
// so there is no server-side model registry to query and no way to swap
// versions at runtime — a build is the deployment.
//
// This file is therefore a build-time constant, not a data source. Update it
// in the same commit that replaces a bundled .tflite asset.
//
// ACTION REQUIRED before the demo: fill in the values below from the actual
// training run. `accuracy: null` renders as "accuracy pending" rather than a
// number, so an unfilled field is visibly unfilled instead of quietly wrong.
// ---------------------------------------------------------------------------

export const ACTIVE_MODEL = {
  // Your own version string for the bundled assets, e.g. 'v1.0'.
  version: 'v1.0',

  // Test-set accuracy as a number (e.g. 92.4), from the teammate who trained
  // the classifier. Leave null until you have the real figure — do not
  // estimate it, and do not reuse the old placeholder 94.7.
  accuracy: null,

  // Date the bundled assets were produced, e.g. 'Aug 12, 2026'.
  trainedOn: null,

  classifierArchitecture: 'MobileNetV3',
  detectorArchitecture: 'YOLOv8',
};

// Formats the Model stat card value. Keeps the "pending" state explicit so a
// missing accuracy never renders as "null%" or a silent zero.
export function formatModelSummary(model = ACTIVE_MODEL) {
  if (typeof model.accuracy !== 'number') {
    return `${model.version} · accuracy pending`;
  }
  return `${model.version} · ${model.accuracy}% acc`;
}