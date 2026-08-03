import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Real-time subscription to all user profile documents, for the Admin
// Users screen. Ordered by fullName so the list is stable and scannable.
export function subscribeToAllUsers(callback) {
  const usersQuery = query(collection(db, 'users'), orderBy('fullName'));
  return onSnapshot(usersQuery, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
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

// Real-time subscription to all scan records, for the Admin Content
// screen. Adjust the collection name/fields here if your ScanScreen.js
// writes scans somewhere else or with a different shape.
export function subscribeToAllScans(callback) {
  const scansQuery = query(collection(db, 'scans'), orderBy('createdAt', 'desc'));
  return onSnapshot(scansQuery, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
}

export async function deleteScan(scanId) {
  await deleteDoc(doc(db, 'scans', scanId));
}