// Treatment/severity/care content isn't hardcoded here — that's left for
// the disease knowledge base work to connect up. This file only keeps the
// one thing that genuinely isn't disease content: the species this app
// targets, plus a shared check for the classifier's one special label.

export const TARGET_SPECIES = 'Vanda sanderiana';

export function isHealthyLabel(label) {
  return label === 'healthy';
}

// Cosmetic only — turns the model's raw label ("bacterial_brown_spot") into
// something presentable ("Bacterial Brown Spot") when the knowledge base
// doesn't have a curated display name for it yet. This is mechanical text
// formatting, not disease knowledge, so it's fine to keep in code rather
// than waiting on an admin entry — it's what a label falls back to, not a
// substitute for one.
export function humanizeLabel(label) {
  if (!label) return '';
  return label
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
