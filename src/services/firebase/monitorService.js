import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Data sources for the Monitor tab that aren't scans/users:
//
//   errorLogs/{id}          app errors written by utils/errorLogger.js
//   modelOps/current        admin-maintained model + dataset status
//   datasetVersions/{id}    one snapshot per dataset version, for the
//                           dataset-growth chart
//
// The model is bundled in the app and trained offline (Colab / Roboflow),
// so the app can't measure the dataset itself — the admin records each
// dataset version and the retraining schedule here.

const ERROR_LOG_LIMIT = 300;

export function subscribeToErrorLogs(callback, onError) {
  return onSnapshot(
    query(collection(db, 'errorLogs'), orderBy('createdAt', 'desc'), limit(ERROR_LOG_LIMIT)),
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error('[monitorService] subscribeToErrorLogs failed', { code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

export function subscribeToModelOps(callback, onError) {
  return onSnapshot(
    doc(db, 'modelOps', 'current'),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    (error) => {
      console.error('[monitorService] subscribeToModelOps failed', { code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

export function subscribeToDatasetVersions(callback, onError) {
  return onSnapshot(
    query(collection(db, 'datasetVersions'), orderBy('recordedAt', 'asc')),
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error('[monitorService] subscribeToDatasetVersions failed', { code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

// Saves the current model/dataset status. When `datasetVersion` differs
// from the previous one, a snapshot is also added to datasetVersions so the
// growth chart gains a point.
//   data = { datasetVersion, classCounts: { label: n }, lastTrainedAt: Date|null,
//            nextRetrainAt: Date|null, notes }
export async function saveModelOps(data, previousVersion) {
  const classCounts = data.classCounts || {};
  const totalImages = Object.values(classCounts).reduce((sum, n) => sum + (Number(n) || 0), 0);

  await setDoc(
    doc(db, 'modelOps', 'current'),
    {
      datasetVersion: data.datasetVersion || '',
      classCounts,
      totalImages,
      lastTrainedAt: data.lastTrainedAt || null,
      nextRetrainAt: data.nextRetrainAt || null,
      notes: data.notes || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (data.datasetVersion && data.datasetVersion !== previousVersion) {
    await addDoc(collection(db, 'datasetVersions'), {
      version: data.datasetVersion,
      classCounts,
      totalImages,
      recordedAt: serverTimestamp(),
    });
  }
}
