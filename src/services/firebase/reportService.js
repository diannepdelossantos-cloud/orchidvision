import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// User-reported issues / flagged content, in the top-level reports/{id}
// collection. The Firestore rules require a new report to be filed by the
// caller for themselves (reporterId == auth.uid), start as 'open' and carry
// an empty adminNote; only admins can read every report, change its status
// or delete it.

export const REPORT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'];

export const REPORT_STATUS_META = {
  open: { label: 'Open', tone: 'severe' },
  in_review: { label: 'In review', tone: 'moderate' },
  resolved: { label: 'Resolved', tone: 'active' },
  dismissed: { label: 'Dismissed', tone: 'inactive' },
};

export const REPORT_TYPES = {
  wrong_diagnosis: 'Wrong diagnosis',
  inappropriate_image: 'Inappropriate image',
  app_problem: 'App problem',
  other: 'Other',
};

function reportsCollection() {
  return collection(db, 'reports');
}

// Called by a signed-in user. `scan` is optional: when the report is about
// a scan result, a snapshot of it is stored so the admin sees what the user
// saw even if the scan is later deleted.
export async function createReport(
  reporter,
  { type, message, scan = null, reportedUserId = null },
) {
  const ref = await addDoc(reportsCollection(), {
    reporterId: reporter.uid,
    reporterName: reporter.displayName || reporter.email || '',
    reporterEmail: reporter.email || '',
    type,
    message: message || '',
    scanId: scan?.id || null,
    scanLabel: scan?.label || null,
    scanConfidence: typeof scan?.confidence === 'number' ? scan.confidence : null,
    scanImageUrl: scan?.imageUrl || null,
    // Whose content is being flagged (the scan owner). For a user reporting
    // their own scan result this is the reporter.
    reportedUserId: reportedUserId || reporter.uid,
    status: 'open',
    adminNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// Admin only (rules enforce it). Newest first.
export function subscribeToAllReports(callback, onError) {
  return onSnapshot(
    query(reportsCollection(), orderBy('createdAt', 'desc')),
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error('[reportService] subscribeToAllReports failed', { code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

export async function updateReport(reportId, { status, adminNote }) {
  const patch = { updatedAt: serverTimestamp() };
  if (status) {
    patch.status = status;
    patch.resolvedAt = status === 'resolved' || status === 'dismissed' ? serverTimestamp() : null;
  }
  if (typeof adminNote === 'string') patch.adminNote = adminNote;
  await updateDoc(doc(db, 'reports', reportId), patch);
}

export async function deleteReport(reportId) {
  await deleteDoc(doc(db, 'reports', reportId));
}
