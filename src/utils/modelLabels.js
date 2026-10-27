// The class names the bundled classifier outputs, written in normalized form
// (lowercase, spaces -> underscores). The model's raw labels like "Black Rot"
// and "Leaf Spot" are normalized the same way before lookup, so they still
// match. Update this list whenever the model is retrained.
export const MODEL_LABELS = [
  'anthracnose',
  'bacterial_brown_spot',
  'bacterial_soft_rot',
  'black_rot',
  'healthy',
  'leaf_spot',
  'sunburn',
];

// Labels that mean "no disease" — these don't get a treatment card.
export const HEALTHY_LABELS = ['healthy'];
