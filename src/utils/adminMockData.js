// ---------------------------------------------------------------------------
// Placeholder data for the Admin Control Center.
//
// Some widgets in the storyboard (scan-volume trend, disease distribution,
// model registry, pending-review images, system health/monitoring) don't
// have a backing Firestore collection yet. Rather than leaving those cards
// empty, this file centralizes realistic sample data so the screens render
// exactly like the approved design. Swap each export for a real
// query/service call once the corresponding backend piece exists — every
// screen that consumes these is written so that only the data source needs
// to change, not the UI.
// ---------------------------------------------------------------------------

import { CHART_COLORS } from './theme';

export const SCAN_VOLUME_TREND = [
  { label: 'Jan', value: 360 },
  { label: 'Feb', value: 620 },
  { label: 'Mar', value: 780 },
  { label: 'Apr', value: 560 },
  { label: 'May', value: 900 },
  { label: 'Jun', value: 1080 },
  { label: 'Jul', value: 1150 },
  { label: 'Aug', value: 1260 },
];

export const DISEASE_DISTRIBUTION = [
  { label: 'Leaf Spot', value: 38, color: CHART_COLORS[0] },
  { label: 'Root Rot', value: 22, color: CHART_COLORS[1] },
  { label: 'Viral Mosaic', value: 18, color: CHART_COLORS[2] },
  { label: 'Blight', value: 12, color: CHART_COLORS[3] },
  { label: 'Healthy', value: 10, color: CHART_COLORS[4] },
];

export const RECENT_ACTIVITY = [
  { id: 'a1', icon: 'pulse-outline', tone: 'success', name: 'Maria Santos', action: 'Leaf spot detected', time: '2m ago' },
  { id: 'a2', icon: 'alert-circle-outline', tone: 'danger', name: 'James Reyes', action: 'Account flagged', time: '14m ago' },
  { id: 'a3', icon: 'person-add-outline', tone: 'info', name: 'Ana Lim', action: 'New user registered', time: '31m ago' },
  { id: 'a4', icon: 'construct-outline', tone: 'admin', name: 'Admin', action: 'Model v2.4.1 deployed', time: '1h ago' },
  { id: 'a5', icon: 'cloud-upload-outline', tone: 'warning', name: 'Carlo Cruz', action: '12 images submitted', time: '2h ago' },
];

export const MODEL_VERSIONS = [
  { id: 'v2.4.1', version: 'v2.4.1', accuracy: 94.7, status: 'Active', deployedOn: 'Aug 1, 2026' },
  { id: 'v2.3.0', version: 'v2.3.0', accuracy: 92.1, status: 'Archived', deployedOn: 'Jun 15, 2026' },
  { id: 'v2.2.5', version: 'v2.2.5', accuracy: 89.4, status: 'Archived', deployedOn: 'Apr 3, 2026' },
];

export const ACCURACY_BY_VERSION = [
  { label: 'v2.1', value: 84 },
  { label: 'v2.2', value: 88 },
  { label: 'v2.3', value: 92 },
  { label: 'v2.4', value: 94.7 },
];

export const DATA_METRICS_SUMMARY = {
  totalLabeledImages: 12840,
  currentAccuracy: 94.7,
  nextRetrain: 'Aug 15, 2026',
};

export const PENDING_REVIEW_IMAGES = [
  { id: 'p1', fileName: 'vanda_leaf_001.jpg', uploader: 'Ana Lim', predictedLabel: 'Leaf Spot' },
  { id: 'p2', fileName: 'orchid_root_04.jpg', uploader: 'Marco V.', predictedLabel: 'Root Rot' },
  { id: 'p3', fileName: 'mosaic_scan.jpg', uploader: 'Rosa Flores', predictedLabel: 'Viral Mosaic' },
];

export const SYSTEM_HEALTH = {
  cpu: 42,
  memory: 61,
  storage: 74,
  uptime: 99.8,
};

export const MONITOR_SUMMARY = {
  totalScans: 284,
  newUsers: 17,
  flaggedSubmissions: 3,
  apiErrors: 2,
  avgConfidence: 88.4,
  mostDetected: 'Leaf Spot',
};

export const ERROR_LOG = [
  { id: 'e1', level: 'ERROR', source: 'scan-api', time: '08:31 AM', message: 'Scan pipeline timeout — retry #2 failed' },
  { id: 'e2', level: 'WARN', source: 'ml-engine', time: '07:14 AM', message: 'Confidence below threshold (62%)' },
  { id: 'e3', level: 'INFO', source: 'storage', time: '06:50 AM', message: 'Dataset backup completed — 12,840 images' },
  { id: 'e4', level: 'ERROR', source: 'db-pool', time: 'Jun 30', message: 'DB connection pool exhausted' },
];

export const RETRAINING_SCHEDULE = {
  lastRetrain: 'Jun 15, 2026',
  nextScheduled: 'Aug 15, 2026',
  autoTrigger: '+2,000 new images',
};

export const DISEASE_SEED = [
  {
    name: 'Leaf Spot',
    classificationLabel: 'leaf_spot',
    category: 'Fungal',
    severity: 'Moderate',
    protocols: [
      'Remove affected tissue.',
      'Apply copper-based fungicide every 7 days.',
      'Isolate plant to prevent spread.',
    ],
    updatedLabel: 'Jun 28',
  },
  {
    name: 'Root Rot',
    classificationLabel: 'root_rot',
    category: 'Bacterial',
    severity: 'Severe',
    protocols: [
      'Remove plant from pot and trim rotted roots.',
      'Repot in fresh, sterile bark mix.',
      'Reduce watering frequency.',
      'Apply bactericide to remaining healthy roots.',
    ],
    updatedLabel: 'Jun 20',
  },
  {
    name: 'Viral Mosaic',
    classificationLabel: 'viral_mosaic',
    category: 'Viral',
    severity: 'Moderate',
    protocols: ['Isolate plant immediately.', 'Sterilize all tools used on the plant.'],
    updatedLabel: 'Jun 15',
  },
  {
    name: 'Crown Blight',
    classificationLabel: 'crown_blight',
    category: 'Fungal',
    severity: 'Severe',
    protocols: [
      'Cut away all blackened crown tissue.',
      'Apply broad-spectrum fungicide.',
      'Improve air circulation around plant.',
      'Avoid overhead watering.',
      'Monitor daily for 2 weeks.',
    ],
    updatedLabel: 'Jun 10',
  },
  {
    name: 'Botrytis Blight',
    classificationLabel: 'botrytis',
    category: 'Fungal',
    severity: 'Mild',
    protocols: [
      'Remove spotted flowers/buds.',
      'Increase airflow, reduce humidity.',
      'Apply preventive fungicide spray.',
    ],
    updatedLabel: 'May 30',
  },
];