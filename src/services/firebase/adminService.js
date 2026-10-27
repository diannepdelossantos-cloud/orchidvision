import {
  addDoc,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { supabase } from '../supabase/supabaseClient';

// Real-time subscription to all user profile documents, for the Admin
// Users screen. Ordered by fullName so the list is stable and scannable.
//
// NOTE: a Firestore orderBy silently EXCLUDES documents missing that field,
// so any user doc written without fullName will not appear here at all.
// signUp and ensureUserDocument both always write it (possibly as ''), so
// this only bites on hand-edited docs.
//
// Without an error callback, onSnapshot failures (denied rules, an index
// still building) only surface as console noise while the UI sits at zero
// looking plausible — same pattern orchidService already uses.
export function subscribeToAllUsers(callback, onError) {
  const usersQuery = query(collection(db, 'users'), orderBy('fullName'));
  return onSnapshot(
    usersQuery,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    },
    (error) => {
      console.error('[adminService] subscribeToAllUsers failed', { code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// NOTE: this only removes the Firestore profile document, not the
// underlying Firebase Auth account. Deleting the Auth account itself
// requires the Admin SDK (a backend/Cloud Function) since client apps
// can't delete other users' auth accounts directly.
export async function deleteUserProfile(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

// Real-time subscription to all scan records, for the Admin Content screen
// and the dashboard aggregates.
//
// This returns soft-deleted records too (scanRecordService stamps deletedAt
// and keeps the document for RestoreScreen). Callers must filter them out —
// use activeScans() from utils/adminStats.js rather than re-implementing it.
export function subscribeToAllScans(callback, onError) {
  const scansQuery = query(collection(db, 'scans'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    scansQuery,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    },
    (error) => {
      console.error('[adminService] subscribeToAllScans failed', { code: error?.code, message: error?.message });
      onError?.(error);
    },
  );
}

// Permanently removes a scan record AND its Supabase image, mirroring
// scanRecordService.permanentlyDeleteScanRecord. `userId` comes from the
// scan document itself and is required to build the storage path — without
// it the photo is orphaned in the bucket with nothing left pointing at it.
//
// Best-effort on the storage side: the Firestore doc is the source of truth,
// so a failed removal (already gone, transient network) shouldn't block it.
export async function deleteScan(scanId, userId) {
  await deleteDoc(doc(db, 'scans', scanId));

  if (!userId) {
    console.warn('[adminService] deleteScan called without userId — image not removed', { scanId });
    return;
  }

  try {
    await supabase.storage.from('scans').remove([`${userId}/${scanId}.jpg`]);
  } catch (error) {
    console.warn('[adminService] scan image cleanup failed', { scanId, message: error?.message });
  }
}

// Used by the User Management "+ Add" flow. NOTE: this only creates the
// Firestore profile document, mirroring deleteUserProfile's limitation —
// it does NOT create a Firebase Auth account, so the invited person can't
// actually sign in yet. A real invite flow needs a backend/Cloud Function
// (e.g. admin.auth().createUser + emailed set-password link).
export async function addUserPlaceholder({ fullName, email, role = 'user' }) {
  await addDoc(collection(db, 'users'), {
    fullName,
    email,
    role,
    createdAt: serverTimestamp(),
  });
}