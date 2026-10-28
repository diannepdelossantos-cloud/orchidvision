import { Platform } from 'react-native';
import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { db } from './firebaseConfig';
import { supabase } from '../supabase/supabaseClient';

// Scan history lives in a top-level scans/{scanId} collection (each doc
// tagged with a userId field), not a per-user subcollection — this is the
// shape adminService.subscribeToAllScans/deleteScan already expect for the
// Admin Content screen, so both screens read/write the same records. Soft-
// deleted records keep their document (with a deletedAt timestamp) so the
// Restore screen can bring them back; permanent deletion is a separate,
// explicit action.

function scansCollection() {
  return collection(db, 'scans');
}

// Real-time subscription to every scan record (active and soft-deleted) for
// the signed-in user, newest first. The context splits active/deleted so
// screens never have to filter deletedAt themselves.
export function subscribeToScanRecords(uid, callback) {
  const q = query(scansCollection(), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// Same pattern as authService.uploadAvatar: read the local file as base64
// (native) or blob (web) and upload to Supabase Storage, since Firebase
// Storage requires the paid Blaze plan.
async function uploadScanImage(uid, scanId, localUri) {
  const filePath = `${uid}/${scanId}.jpg`;
  let fileData;

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    fileData = await response.blob();
  } else {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    fileData = decode(base64);
  }

  const { error: uploadError } = await supabase.storage
    .from('scans')
    .upload(filePath, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('scans').getPublicUrl(filePath);
  return data.publicUrl;
}

// Names records "Waling-Waling #N" using an atomic counter on the user's
// profile doc (users/{uid}.scanCount), so two scans saved back-to-back never
// collide on the same number.
async function nextScanName(uid) {
  const userRef = doc(db, 'users', uid);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(userRef);
    const nextCount = (snapshot.data()?.scanCount || 0) + 1;
    tx.update(userRef, { scanCount: nextCount });
    return `Waling-Waling #${nextCount}`;
  });
}

// Saves a completed scan result to history. `label` is the raw model label
// (e.g. "healthy", "bacterial_brown_spot") as returned by the classifier.
// `plantName` duplicates `name` under the field AdminContentScreen reads, so
// admins see a real title instead of falling back to "Scan result".
// Returns { id, imageUrl } so callers (e.g. the "Save to My Orchids" flow)
// can reuse the already-uploaded photo instead of re-uploading it.
// Pass `name` (the orchid's nickname) to store the record under that name;
// without it, the auto-numbered "Waling-Waling #N" name is used.
export async function createScanRecord(uid, { name: givenName, label, confidence, imageUri, source, detections = [] }) {
  const scanRef = doc(scansCollection());
  const [name, imageUrl] = await Promise.all([
    givenName ? Promise.resolve(givenName) : nextScanName(uid),
    uploadScanImage(uid, scanRef.id, imageUri),
  ]);

  await setDoc(scanRef, {
    userId: uid,
    name,
    plantName: name,
    label,
    confidence,
    imageUrl,
    source,
    // YOLOv8 bounding boxes: [{ box: {x,y,width,height} (0-1 normalized),
    // label, confidence }]. Empty array means the detector ran and found
    // nothing above threshold, same as a healthy scan.
    detections,
    orchidId: null,
    createdAt: serverTimestamp(),
    deletedAt: null,
  });

  return { id: scanRef.id, imageUrl };
}

export async function softDeleteScanRecord(uid, scanId) {
  await updateDoc(doc(scansCollection(), scanId), { deletedAt: serverTimestamp() });
}

export async function softDeleteScanRecords(uid, scanIds) {
  await Promise.all(scanIds.map((id) => softDeleteScanRecord(uid, id)));
}

// Restoring a scan that was removed together with its orchid (My Orchids
// delete) also restores that orchid and the other scans deleted with it, so
// the orchid reappears in My Orchids with its full history.
export async function restoreScanRecord(uid, scanId) {
  const scanRef = doc(scansCollection(), scanId);
  const scanSnap = await getDoc(scanRef);
  const orchidId = scanSnap.data()?.orchidId;

  await updateDoc(scanRef, { deletedAt: null, deletedWithOrchid: false });

  if (!orchidId) return;
  const orchidRef = doc(db, 'orchids', orchidId);
  const orchidSnap = await getDoc(orchidRef);
  if (!orchidSnap.exists() || !orchidSnap.data()?.deletedAt) return;

  const siblings = await getDocs(
    query(scansCollection(), where('userId', '==', uid), where('orchidId', '==', orchidId)),
  );
  const batch = writeBatch(db);
  batch.update(orchidRef, { deletedAt: null });
  siblings.forEach((d) => {
    if (d.id !== scanId && d.data()?.deletedWithOrchid) {
      batch.update(d.ref, { deletedAt: null, deletedWithOrchid: false });
    }
  });
  await batch.commit();
}

// Best-effort image cleanup: the Firestore doc is the source of truth, so a
// failed storage removal (e.g. already gone) shouldn't block the doc delete.
export async function permanentlyDeleteScanRecord(uid, scanId) {
  const scanRef = doc(scansCollection(), scanId);
  const orchidId = (await getDoc(scanRef).catch(() => null))?.data()?.orchidId;

  await deleteDoc(scanRef);
  try {
    await supabase.storage.from('scans').remove([`${uid}/${scanId}.jpg`]);
  } catch (error) {
    // Non-fatal — the record itself is already gone.
  }

  // A deleted orchid is erased for good once its last scan is gone (it can
  // no longer be restored from History at that point).
  if (orchidId) {
    try {
      const orchidRef = doc(db, 'orchids', orchidId);
      const orchidSnap = await getDoc(orchidRef);
      if (orchidSnap.exists() && orchidSnap.data()?.deletedAt) {
        const remaining = await getDocs(
          query(scansCollection(), where('userId', '==', uid), where('orchidId', '==', orchidId)),
        );
        if (remaining.empty) await deleteDoc(orchidRef);
      }
    } catch (error) {
      // Non-fatal — a leftover hidden orchid doc does no harm.
    }
  }
}

export async function permanentlyDeleteScanRecords(uid, scanIds) {
  await Promise.all(scanIds.map((id) => permanentlyDeleteScanRecord(uid, id)));
}