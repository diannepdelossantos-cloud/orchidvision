import { Platform } from 'react-native';
import {
  collection,
  doc,
  deleteDoc,
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
// (e.g. "healthy", "bacterial_brown_spot") so screens can look up display
// text/status via DISEASE_INFO the same way ScanResultCard already does.
// `plantName` duplicates `name` under the field AdminContentScreen reads, so
// admins see a real title instead of falling back to "Scan result".
export async function createScanRecord(uid, { label, confidence, imageUri, source }) {
  const scanRef = doc(scansCollection());
  const [name, imageUrl] = await Promise.all([
    nextScanName(uid),
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
    createdAt: serverTimestamp(),
    deletedAt: null,
  });

  return scanRef.id;
}

export async function softDeleteScanRecord(uid, scanId) {
  await updateDoc(doc(scansCollection(), scanId), { deletedAt: serverTimestamp() });
}

export async function softDeleteScanRecords(uid, scanIds) {
  await Promise.all(scanIds.map((id) => softDeleteScanRecord(uid, id)));
}

export async function restoreScanRecord(uid, scanId) {
  await updateDoc(doc(scansCollection(), scanId), { deletedAt: null });
}

// Best-effort image cleanup: the Firestore doc is the source of truth, so a
// failed storage removal (e.g. already gone) shouldn't block the doc delete.
export async function permanentlyDeleteScanRecord(uid, scanId) {
  await deleteDoc(doc(scansCollection(), scanId));
  try {
    await supabase.storage.from('scans').remove([`${uid}/${scanId}.jpg`]);
  } catch (error) {
    // Non-fatal — the record itself is already gone.
  }
}

export async function permanentlyDeleteScanRecords(uid, scanIds) {
  await Promise.all(scanIds.map((id) => permanentlyDeleteScanRecord(uid, id)));
}
