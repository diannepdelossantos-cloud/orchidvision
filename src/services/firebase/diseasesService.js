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

// Real-time subscription to the Disease Knowledge Base, for the Admin
// Diseases tab. Ordered by name so the list is stable and scannable, same
// convention as adminService.subscribeToAllUsers.
export function subscribeToAllDiseases(callback) {
  const diseasesQuery = query(collection(db, 'diseases'), orderBy('name'));
  return onSnapshot(diseasesQuery, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
}

// entry: { name, classificationLabel, category, severity, protocols: string[], sampleTreatment }
export async function addDisease(entry) {
  await addDoc(collection(db, 'diseases'), {
    ...entry,
    updatedAt: serverTimestamp(),
  });
}

export async function updateDisease(diseaseId, entry) {
  await updateDoc(doc(db, 'diseases', diseaseId), {
    ...entry,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDisease(diseaseId) {
  await deleteDoc(doc(db, 'diseases', diseaseId));
}