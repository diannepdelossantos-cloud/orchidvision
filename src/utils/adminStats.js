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
import { normalizeLabel } from '../services/firebase/diseasesService';
import { HEALTHY_LABELS } from './modelLabels';
import { CHART_COLORS } from './theme';
import { isHealthyLabel } from './diseaseInfo';

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

// Only diseases entered in the admin Disease Knowledge Base are named.
// A label with no entry (e.g. "tip_burn") resolves to UNRECOGNIZED_NAME
// instead of a title-cased model label, so admin screens never show a
// disease the admin hasn't defined.
export const UNRECOGNIZED_NAME = 'Unrecognized';

// Maps a normalized classifier label ("bacterial_brown_spot") to the curated
// name from the knowledge base. Keys are normalized so model labels like
// "Black Rot" still match an entry saved as "black_rot".
export function buildLabelNameMap(diseases = []) {
  const map = new Map();
  diseases.forEach((disease) => {
    if (disease.classificationLabel) {
      map.set(normalizeLabel(disease.classificationLabel), disease.name);
    }
  });
  return map;
}

export function resolveLabelName(label, nameMap = new Map()) {
  if (!label) return 'Unclassified';
  const key = normalizeLabel(label);
  if (nameMap.has(key)) return nameMap.get(key);
  if (HEALTHY_LABELS.includes(key)) return 'Healthy';
  return UNRECOGNIZED_NAME;
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

const HEALTHY_SLICE_COLOR = '#66bb6a';
const UNRECOGNIZED_SLICE_COLOR = '#bdbdbd';

// Fixed slice colors for specific conditions, keyed by classification label.
// Any condition not listed here gets the next CHART_COLORS color.
const CONDITION_COLORS = {
  sunburn: '#FFD600', // bright yellow
};

// Share of ALL users' active scans (soft-deleted excluded), grouped by
// Disease Knowledge Base entry rather than raw model label:
//   - label matches an admin entry -> that entry's name
//   - healthy -> "Healthy" (green)
//   - no entry (e.g. tip_burn) -> one gray "Unrecognized" slice, listed last
// `value` is a whole percentage; the slices always add up to exactly 100.
// `count` is the raw number. Each disease keeps a fixed color (assigned by
// entry name) so slices don't swap colors as counts change.
export function buildDiseaseDistribution(scans = [], diseases = []) {
  const nameMap = buildLabelNameMap(diseases);

  const colorByName = new Map();
  [...diseases]
    .filter((d) => d.name)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((d, index) => {
      const fixed = CONDITION_COLORS[normalizeLabel(d.classificationLabel)];
      colorByName.set(d.name, fixed || CHART_COLORS[index % CHART_COLORS.length]);
    });

  const counts = new Map();
  let total = 0;

  activeScans(scans).forEach((scan) => {
    if (!scan.label) return;
    const name = resolveLabelName(scan.label, nameMap);
    const bucket = counts.get(name) || { rawLabel: normalizeLabel(scan.label), count: 0 };
    bucket.count += 1;
    counts.set(name, bucket);
    total += 1;
  });

  if (total === 0) return [];

  const slices = [...counts.entries()].map(([name, { rawLabel, count }]) => {
    const exact = (count / total) * 100;
    let color = colorByName.get(name) || CHART_COLORS[0];
    if (name === UNRECOGNIZED_NAME) color = UNRECOGNIZED_SLICE_COLOR;
    else if (HEALTHY_LABELS.includes(rawLabel)) color = HEALTHY_SLICE_COLOR;
    return {
      rawLabel: name === UNRECOGNIZED_NAME ? '__unrecognized__' : rawLabel,
      label: name,
      count,
      color,
      value: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  // Hand out the rounding leftovers so the legend totals exactly 100%.
  let leftover = 100 - slices.reduce((sum, s) => sum + s.value, 0);
  [...slices]
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((s) => {
      if (leftover > 0) {
        s.value += 1;
        leftover -= 1;
      }
    });

  return slices
    .sort((a, b) => {
      if (a.label === UNRECOGNIZED_NAME) return 1;
      if (b.label === UNRECOGNIZED_NAME) return -1;
      return b.count - a.count;
    })
    .map(({ remainder, ...slice }) => slice);
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
          : resolveLabelName(scan.label, nameMap) === UNRECOGNIZED_NAME
            ? 'Unrecognized condition detected'
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

  // Counted by knowledge-base name, so unrecognized labels (no admin entry)
  // never surface as the "most detected" disease.
  const diseaseCounts = new Map();
  inWindow.forEach((scan) => {
    if (!scan.label || isHealthyLabel(scan.label)) return;
    const name = resolveLabelName(scan.label, nameMap);
    if (name === UNRECOGNIZED_NAME) return;
    diseaseCounts.set(name, (diseaseCounts.get(name) || 0) + 1);
  });

  const topDisease = [...diseaseCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    windowDays,
    scansInWindow: inWindow.length,
    totalScans: all.length,
    newUsers,
    avgConfidence,
    lowConfidenceCount,
    mostDetected: topDisease ? topDisease[0] : null,
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
// ---------------------------------------------------------------------------
// Monitor: condition summary report
// ---------------------------------------------------------------------------

// Most commonly detected orchid conditions over the last `days` days
// (null = all time), across all users' active scans. Grouped by Disease
// Knowledge Base name; labels without an entry count as "Unrecognized".
// Returns { total, rows: [{ name, count, share (0-1), isHealthy, isUnrecognized }] }
// sorted by count, plus `topDisease` (most common non-healthy, recognized).
export function buildConditionReport(scans = [], diseases = [], days = null, now = new Date()) {
  const nameMap = buildLabelNameMap(diseases);
  const cutoff = days ? now.getTime() - days * DAY_MS : null;

  const counts = new Map();
  let total = 0;

  activeScans(scans).forEach((scan) => {
    if (!scan.label) return;
    if (cutoff) {
      const date = toDate(scan.createdAt);
      if (!date || date.getTime() < cutoff) return;
    }
    const name = resolveLabelName(scan.label, nameMap);
    const row = counts.get(name) || {
      name,
      count: 0,
      isHealthy: isHealthyLabel(scan.label),
      isUnrecognized: name === UNRECOGNIZED_NAME,
    };
    row.count += 1;
    counts.set(name, row);
    total += 1;
  });

  const rows = [...counts.values()]
    .map((row) => ({ ...row, share: total ? row.count / total : 0 }))
    .sort((a, b) => b.count - a.count);

  const topDisease = rows.find((r) => !r.isHealthy && !r.isUnrecognized) || null;
  return { total, rows, topDisease };
}

// Plain-text CSV of a condition report, for exporting/sharing.
export function conditionReportToCsv(report, periodLabel, now = new Date()) {
  const lines = [
    `OrchidVision condition report,${periodLabel}`,
    `Generated,${now.toLocaleString()}`,
    `Total scans,${report.total}`,
    '',
    'Condition,Scans,Share',
    ...report.rows.map((r) => `"${String(r.name).replace(/"/g, '""')}",${r.count},${Math.round(r.share * 100)}%`),
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Monitor: error logs and system health
// ---------------------------------------------------------------------------

// Health from errorLogs (utils/errorLogger.js), open reports and recent
// classifier confidence. Status rule:
//   critical  10+ errors in 24h, or any classifier failure in 24h
//   degraded  any error in 24h, or 3+ open reports
//   healthy   otherwise
export function buildSystemHealth({ errorLogs = [], reports = [], scans = [] }, now = new Date()) {
  const dayCutoff = now.getTime() - DAY_MS;
  const weekCutoff = now.getTime() - 7 * DAY_MS;

  const dated = errorLogs
    .map((log) => ({ ...log, date: toDate(log.createdAt) }))
    .filter((log) => log.date);

  const last24h = dated.filter((l) => l.date.getTime() >= dayCutoff);
  const last7d = dated.filter((l) => l.date.getTime() >= weekCutoff);

  const bySource = new Map();
  last7d.forEach((l) => bySource.set(l.source, (bySource.get(l.source) || 0) + 1));
  const sources = [...bySource.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const classifierFailures24h = last24h.filter((l) => l.source === 'scan.predict').length;
  const openReports = reports.filter((r) => r.status === 'open').length;

  const weekScans = activeScans(scans).filter((s) => {
    const d = toDate(s.createdAt);
    return d && d.getTime() >= weekCutoff;
  });
  const confident = weekScans.filter(
    (s) => isValidConfidence(s.confidence) && s.confidence >= LOW_CONFIDENCE_THRESHOLD,
  ).length;

  let status = 'healthy';
  if (last24h.length >= 10 || classifierFailures24h > 0) status = 'critical';
  else if (last24h.length > 0 || openReports >= 3) status = 'degraded';

  return {
    status,
    errors24h: last24h.length,
    errors7d: last7d.length,
    classifierFailures24h,
    openReports,
    confidentShare7d: weekScans.length ? confident / weekScans.length : null,
    lastErrorAt: dated[0]?.date || null,
    sources,
    recent: dated.slice(0, 8),
  };
}

// ---------------------------------------------------------------------------
// Monitor: dataset growth and retraining
// ---------------------------------------------------------------------------

// Points for the dataset growth chart (one per recorded dataset version).
export function buildDatasetGrowth(versions = []) {
  return versions.map((v) => ({ label: String(v.version || '—'), value: Number(v.totalImages) || 0 }));
}

// Retraining status: schedule plus how much new, real-world data users have
// produced since the model was last trained (candidates for the next
// dataset version, e.g. to upload to Roboflow for labeling).
export function buildRetrainingStatus(modelOps, scans = [], diseases = [], now = new Date()) {
  const lastTrainedAt = toDate(modelOps?.lastTrainedAt);
  const nextRetrainAt = toDate(modelOps?.nextRetrainAt);
  const nameMap = buildLabelNameMap(diseases);

  const since = activeScans(scans).filter((s) => {
    if (!lastTrainedAt) return true;
    const d = toDate(s.createdAt);
    return d && d.getTime() > lastTrainedAt.getTime();
  });

  const byCondition = new Map();
  since.forEach((s) => {
    if (!s.label) return;
    const name = resolveLabelName(s.label, nameMap);
    byCondition.set(name, (byCondition.get(name) || 0) + 1);
  });

  const lowConfidenceSince = since.filter(
    (s) => isValidConfidence(s.confidence) && s.confidence < LOW_CONFIDENCE_THRESHOLD,
  ).length;

  const daysUntilNext = nextRetrainAt ? Math.ceil((nextRetrainAt.getTime() - now.getTime()) / DAY_MS) : null;

  return {
    lastTrainedAt,
    nextRetrainAt,
    daysUntilNext,
    overdue: daysUntilNext != null && daysUntilNext < 0,
    newScansSinceTraining: since.length,
    lowConfidenceSince,
    newByCondition: [...byCondition.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}