// ---------------------------------------------------------------------------
// Derived statistics for the Admin Control Center.
//
// Every export here is a pure function over data the admin screens already
// subscribe to (adminService.subscribeToAllUsers / subscribeToAllScans,
// diseasesService.subscribeToAllDiseases). Nothing is fabricated: if there
// is no data, these return empty results and the UI shows an empty state.
//
// Replaces the scan-volume trend, disease distribution, and recent-activity
// placeholders that previously lived in adminMockData.js.
// ---------------------------------------------------------------------------

import { CHART_COLORS } from './theme';
import { humanizeLabel, isHealthyLabel } from './diseaseInfo';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Firestore hands back a Timestamp; serverTimestamp() reads as null on the
// writing client until the server round-trip completes, so every caller has
// to tolerate a missing date rather than assume one.
export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// scanRecordService soft-deletes by stamping deletedAt and keeping the
// document so RestoreScreen can recover it. adminService.subscribeToAllScans
// returns those too, so every aggregate must filter them out — otherwise
// "Total Scans" counts trashed records and goes UP when a user deletes one.
export function activeScans(scans = []) {
  return scans.filter((scan) => !scan.deletedAt);
}

// Maps a raw classifier label ("bacterial_brown_spot") to the curated name
// from the knowledge base, falling back to mechanical title-casing when no
// admin entry exists for that label yet.
function buildLabelNameMap(diseases = []) {
  const map = new Map();
  diseases.forEach((disease) => {
    if (disease.classificationLabel) {
      map.set(disease.classificationLabel, disease.name);
    }
  });
  return map;
}

function resolveLabelName(label, nameMap) {
  if (!label) return 'Unclassified';
  return nameMap.get(label) || humanizeLabel(label);
}

// Rounds a max value up to a clean gridline so the top data point doesn't sit
// flush against the ceiling of the chart. Returns a floor of 4 for empty data
// so the axis still renders 0-4 instead of collapsing.
export function niceCeiling(values = []) {
  const max = Math.max(...values, 0);
  if (max <= 0) return 4;
  const step = 10 ** Math.floor(Math.log10(max));
  const rounded = Math.ceil(max / step) * step;
  return rounded === max ? rounded + step : rounded;
}

// Scans per calendar month for the trailing `monthCount` months, oldest
// first — the shape LineAreaChart expects. Months with no scans stay at 0
// rather than being dropped, so the x-axis is continuous.
export function buildScanVolumeTrend(scans = [], monthCount = 8, now = new Date()) {
  const buckets = [];
  const byKey = new Map();

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const bucket = { label: MONTH_LABELS[date.getMonth()], value: 0 };
    byKey.set(`${date.getFullYear()}-${date.getMonth()}`, bucket);
    buckets.push(bucket);
  }

  activeScans(scans).forEach((scan) => {
    const date = toDate(scan.createdAt);
    if (!date) return;
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  });

  return buckets;
}

// Share of scans per detected label, largest first. `value` is a rounded
// percentage for the legend; `count` is the raw number. DonutChart normalizes
// its own segments, so rounding drift in the legend never distorts the ring.
// Colors are assigned by rank, so the palette stays stable as counts shift.
export function buildDiseaseDistribution(scans = [], diseases = []) {
  const nameMap = buildLabelNameMap(diseases);
  const counts = new Map();
  let total = 0;

  activeScans(scans).forEach((scan) => {
    if (!scan.label) return;
    counts.set(scan.label, (counts.get(scan.label) || 0) + 1);
    total += 1;
  });

  if (total === 0) return [];

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], index) => ({
      rawLabel: label,
      label: resolveLabelName(label, nameMap),
      count,
      value: Math.round((count / total) * 100),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
}

export function formatRelativeTime(date, now = new Date()) {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Merged feed of the newest scans and newest registrations. Records whose
// timestamp hasn't resolved yet are skipped rather than shown undated.
export function buildRecentActivity(scans = [], users = [], diseases = [], limit = 5) {
  const nameMap = buildLabelNameMap(diseases);
  const userNames = new Map();
  users.forEach((user) => {
    const key = user.uid || user.id;
    if (key) userNames.set(key, user.fullName || user.email || 'Unknown user');
  });

  const scanEvents = activeScans(scans)
    .map((scan) => {
      const date = toDate(scan.createdAt);
      if (!date) return null;
      const healthy = isHealthyLabel(scan.label);
      return {
        id: `scan-${scan.id}`,
        date,
        icon: healthy ? 'leaf-outline' : 'pulse-outline',
        name: userNames.get(scan.userId) || 'Unknown user',
        action: healthy
          ? 'Healthy scan recorded'
          : `${resolveLabelName(scan.label, nameMap)} detected`,
      };
    })
    .filter(Boolean);

  const userEvents = users
    .map((user) => {
      const date = toDate(user.createdAt);
      if (!date) return null;
      return {
        id: `user-${user.uid || user.id}`,
        date,
        icon: 'person-add-outline',
        name: user.fullName || user.email || 'New user',
        action: 'New user registered',
      };
    })
    .filter(Boolean);

  return [...scanEvents, ...userEvents]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}