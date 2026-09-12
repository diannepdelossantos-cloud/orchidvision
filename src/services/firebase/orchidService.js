import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Registered orchids live in a top-level orchids/{orchidId} collection
// (tagged with a userId field), mirroring scanRecordService's shape. Each
// orchid keeps denormalized "last scan" fields (lastLabel/lastScanAt/
// scanCount) so the My Orchids list can render stats without joining
// against the scans collection.

function orchidsCollection() {
  return collection(db, 'orchids');
}

// Real-time subscription to every registered orchid for the signed-in user,
// most recently scanned first. Without an error callback, onSnapshot leaves
// the caller's loading state stuck forever on any failure (denied rules, an
// index still building, etc.) instead of surfacing it.
export function subscribeToOrchids(uid, callback, onError) {
  const q = query(orchidsCollection(), where('userId', '==', uid), orderBy('lastScanAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('[orchidService] subscribeToOrchids failed', { uid, code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

// Registers a new orchid from a scan result. `scanId`/`imageUrl` come from
// the scan record the user just saved (scanRecordService.createScanRecord),
// so this reuses that upload instead of re-uploading the photo. Links the
// scan back to the orchid via orchidId so future scans of the same plant
// can be told apart from its first one.
export async function createOrchid(uid, { nickname, speciesName, scanId, imageUrl, label, confidence }) {
  const orchidRef = doc(orchidsCollection());

  try {
    await setDoc(orchidRef, {
      userId: uid,
      nickname,
      speciesName,
      imageUrl,
      lastLabel: label,
      lastConfidence: confidence,
      lastScanId: scanId,
      lastScanAt: serverTimestamp(),
      scanCount: 1,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[orchidService] setDoc orchids failed', { uid, orchidId: orchidRef.id, code: error?.code, message: error?.message });
    throw error;
  }

  if (scanId) {
    try {
      await updateDoc(doc(db, 'scans', scanId), { orchidId: orchidRef.id });
    } catch (error) {
      console.error('[orchidService] updateDoc scans failed', { uid, scanId, code: error?.code, message: error?.message });
      throw error;
    }
  }

  return orchidRef.id;
}

// Real-time subscription to a single orchid, for the detail screen's header
// stats (status/confidence/severity) and photo, which need to reflect a
// freshly attached scan without a manual refresh.
export function subscribeToOrchid(orchidId, callback, onError) {
  return onSnapshot(
    doc(db, 'orchids', orchidId),
    (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    (error) => {
      console.error('[orchidService] subscribeToOrchid failed', { orchidId, code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

// Real-time subscription to every scan tagged with this orchid (newest
// first), for the detail screen's Scan History list. Filters by userId as
// well as orchidId: Firestore rejects a query outright (not just its
// results) unless every field the security rule reads is also constrained
// by the query itself, and /scans/{scanId}'s rule reads resource.data.userId.
export function subscribeToOrchidScans(uid, orchidId, callback, onError) {
  const q = query(
    collection(db, 'scans'),
    where('userId', '==', uid),
    where('orchidId', '==', orchidId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.error('[orchidService] subscribeToOrchidScans failed', { orchidId, code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

// Attaches a freshly taken scan to an *existing* orchid (the "Scan this
// orchid now" flow), instead of registering a new one. Updates the orchid's
// denormalized "last scan" fields and bumps scanCount, then tags the scan
// itself with orchidId the same way createOrchid does for a brand-new one.
export async function attachScanToOrchid(uid, orchidId, { scanId, imageUrl, label, confidence }) {
  await updateDoc(doc(db, 'orchids', orchidId), {
    imageUrl,
    lastLabel: label,
    lastConfidence: confidence,
    lastScanId: scanId,
    lastScanAt: serverTimestamp(),
    scanCount: increment(1),
  });

  if (scanId) {
    await updateDoc(doc(db, 'scans', scanId), { orchidId });
  }
}
