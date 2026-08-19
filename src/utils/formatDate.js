// Shared date formatting for scan history rows and the Restore screen.
// Accepts a Firestore Timestamp, JS Date, or null (still-pending serverTimestamp
// write, which onSnapshot briefly reports as null before the round-trip resolves).

function toDate(value) {
  if (!value) return null;
  return typeof value.toDate === 'function' ? value.toDate() : value;
}

export function formatScanDate(value) {
  const date = toDate(value);
  if (!date) return 'Just now';
  const day = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} • ${time}`;
}

export function formatDeletedDate(value) {
  const date = toDate(value);
  if (!date) return 'Deleted just now';
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Deleted ${day} at ${time}`;
}

export function formatConfidence(score) {
  const pct = score * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}
