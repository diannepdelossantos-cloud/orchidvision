// ---------------------------------------------------------------------------
// Derived statistics for the Admin Control Center.
//
// Every export here is a pure function over data the admin screens already
// subscribe to (adminService.subscribeToAllUsers / subscribeToAllScans,
// diseasesService.subscribeToAllDiseases). Nothing is fabricated: if there
// is no data, these return empty results and the UI shows an empty state.
//
// Replaces the scan-volume trend, disease distribution, recent-activity and
// monitoring placeholders that previously lived in adminMockData.js.
// ---------------------------------------------------------------------------

import { CHART_COLORS } from './theme';
import { humanizeLabel, isHealthyLabel } from './diseaseInfo';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const ACTIVE_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// A scan below this confidence is worth an admin's attention: either the
// photo was poor or the model is weak on that class. Used for the Monitor
// screen's review queue.
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

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

export function deletedScans(scans = []) {
  return scans.filter((scan) => !!scan.deletedAt);
}

// Scan confidence is written as a 0-1 softmax probability. Some records hold
// values outside that range (seen in production: 3.66, 4.0), which would
// render as "366%" if multiplied blindly.
export function isValidConfidence(value) {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0 && value <= 1;
}

// Anything outside 0-1 renders as nothing at all — a missing confidence is a
// visible signal that the record needs looking at, while "4%" would silently
// pass for a real reading. Fix the writer, not this formatter.
export function formatConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (!isValidConfidence(value)) {
    console.warn('[adminStats] confidence outside 0-1 range, hidden from UI', { value });
    return null;
  }
  return `${Math.round(value * 100)}%`;
}

// Maps a raw classifier label ("bacterial_brown_spot") to the curated name
// from the knowledge base, falling back to mechanical title-casing when no
// admin entry exists for that label yet.
export function buildLabelNameMap(diseases = []) {
  const map = new Map();
  diseases.forEach((disease) => {
    if (disease.classificationLabel) {
      map.set(disease.classificationLabel, disease.name);
    }
  });
  return map;
}

export function resolveLabelName(label, nameMap = new Map()) {
  if (!label) return 'Unclassified';
  return nameMap.get(label) || humanizeLabel(label);
}

// uid -> display name, for screens that only hold a userId reference.
export function buildUserNameMap(users = []) {
  const map = new Map();
  users.forEach((user) => {
    const key = user.uid || user.id;
    if (key) map.set(key, user.fullName || user.email || 'Unknown user');
  });
  return map;
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

export function formatShortDate(date) {
  if (!date) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Merged feed of the newest scans and newest registrations. Records whose
// timestamp hasn't resolved yet are skipped rather than shown undated.
export function buildRecentActivity(scans = [], users = [], diseases = [], limit = 5) {
  const nameMap = buildLabelNameMap(diseases);
  const userNames = buildUserNameMap(users);

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

// Per-user scan totals and most recent scan date, counted from the scans
// collection itself.
//
// Do NOT use users/{uid}.scanCount for this: scanRecordService increments
// that field to number scan titles ("Waling-Waling #7") and never decrements
// it, so it is a naming sequence, not a count.
export function buildUserScanSummary(scans = []) {
  const summary = new Map();

  activeScans(scans).forEach((scan) => {
    if (!scan.userId) return;
    const entry = summary.get(scan.userId) || { count: 0, lastScanAt: null };
    entry.count += 1;

    const date = toDate(scan.createdAt);
    if (date && (!entry.lastScanAt || date > entry.lastScanAt)) {
      entry.lastScanAt = date;
    }

    summary.set(scan.userId, entry);
  });

  return summary;
}

// There is no presence or session tracking in this app, so "active" here
// means something narrower and checkable: the account has scanned, or was
// created, within the last 30 days.
export function isRecentlyActive(lastScanAt, createdAt, now = new Date(), days = ACTIVE_WINDOW_DAYS) {
  const cutoff = now.getTime() - days * DAY_MS;
  if (lastScanAt && lastScanAt.getTime() >= cutoff) return true;
  if (createdAt && createdAt.getTime() >= cutoff) return true;
  return false;
}

export const ACTIVITY_WINDOW_DAYS = ACTIVE_WINDOW_DAYS;

// ---------------------------------------------------------------------------
// Monitor screen
// ---------------------------------------------------------------------------

// Activity figures for a trailing window, plus the all-time scan total.
//
// Deliberately scoped: "new users" with no window is just the user count, and
// an all-time average confidence hides a model that recently got worse. Every
// field here traces to a document in `scans` or `users`.
//
// `mostDetected` excludes healthy scans — an admin watching for problems
// wants the most common DISEASE, and healthy usually dominates the raw count.
export function buildMonitorSummary(
  scans = [],
  users = [],
  diseases = [],
  now = new Date(),
  windowDays = 7,
) {
  const cutoff = now.getTime() - windowDays * DAY_MS;
  const nameMap = buildLabelNameMap(diseases);
  const all = activeScans(scans);

  const inWindow = all.filter((scan) => {
    const date = toDate(scan.createdAt);
    return date && date.getTime() >= cutoff;
  });

  const newUsers = users.filter((user) => {
    const date = toDate(user.createdAt);
    return date && date.getTime() >= cutoff;
  }).length;

  const confidences = inWindow.map((scan) => scan.confidence).filter(isValidConfidence);
  const avgConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : null;

  const lowConfidenceCount = inWindow.filter(
    (scan) => isValidConfidence(scan.confidence) && scan.confidence < LOW_CONFIDENCE_THRESHOLD,
  ).length;

  const diseaseCounts = new Map();
  inWindow.forEach((scan) => {
    if (!scan.label || isHealthyLabel(scan.label)) return;
    diseaseCounts.set(scan.label, (diseaseCounts.get(scan.label) || 0) + 1);
  });

  const topDisease = [...diseaseCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    windowDays,
    scansInWindow: inWindow.length,
    totalScans: all.length,
    newUsers,
    avgConfidence,
    lowConfidenceCount,
    mostDetected: topDisease ? resolveLabelName(topDisease[0], nameMap) : null,
    mostDetectedCount: topDisease ? topDisease[1] : 0,
    // Records whose confidence isn't a usable 0-1 value. Surfaced rather than
    // hidden: a non-zero number here means something is writing bad data.
    invalidConfidenceCount: inWindow.filter(
      (scan) => scan.confidence != null && !isValidConfidence(scan.confidence),
    ).length,
  };
}

// The scans an admin should actually look at: real records the model was
// least sure about, newest first. Replaces the fabricated error log — this is
// the closest thing to an operational signal that this app genuinely has.
export function buildLowConfidenceScans(
  scans = [],
  users = [],
  diseases = [],
  limit = 5,
  threshold = LOW_CONFIDENCE_THRESHOLD,
) {
  const nameMap = buildLabelNameMap(diseases);
  const userNames = buildUserNameMap(users);

  return activeScans(scans)
    .filter((scan) => isValidConfidence(scan.confidence) && scan.confidence < threshold)
    .map((scan) => ({
      id: scan.id,
      title: scan.plantName || scan.name || 'Untitled scan',
      label: resolveLabelName(scan.label, nameMap),
      confidence: scan.confidence,
      userName: userNames.get(scan.userId) || 'Unknown user',
      date: toDate(scan.createdAt),
    }))
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.getTime() - a.date.getTime();
    })
    .slice(0, limit);
}