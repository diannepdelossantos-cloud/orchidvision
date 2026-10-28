import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const COLLECTION = 'diseases';
const diseasesRef = collection(db, COLLECTION);

// The model's output label and the admin-entered label must match exactly,
// so both sides go through this: "Leaf Spot", "leaf-spot", "leaf_spot" -> "leaf_spot".
export const normalizeLabel = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const toPayload = (entry) => ({
  name: entry.name,
  classificationLabel: normalizeLabel(entry.classificationLabel),
  category: entry.category,
  severity: entry.severity,
  symptoms: entry.symptoms || [],
  protocols: entry.protocols || [], // treatment steps
  prevention: entry.prevention || [],
  sampleTreatment: entry.sampleTreatment || '',
  updatedAt: serverTimestamp(),
});

const fromDoc = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

export function subscribeToAllDiseases(onChange, onError) {
  const q = query(diseasesRef, orderBy('name'));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(fromDoc)),
    (error) => {
      console.warn('[diseasesService] subscription failed:', error.message);
      onError?.(error);
    }
  );
}

// Two entries with the same label would make scan results ambiguous.
async function assertLabelIsUnique(label, ignoreId) {
  const snapshot = await getDocs(
    query(diseasesRef, where('classificationLabel', '==', label), limit(2))
  );
  const clash = snapshot.docs.find((d) => d.id !== ignoreId);
  if (clash) {
    throw new Error(`"${clash.data().name}" already uses the label "${label}".`);
  }
}

export async function addDisease(entry) {
  const payload = toPayload(entry);
  await assertLabelIsUnique(payload.classificationLabel);
  const ref = await addDoc(diseasesRef, { ...payload, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateDisease(id, entry) {
  const payload = toPayload(entry);
  await assertLabelIsUnique(payload.classificationLabel, id);
  await updateDoc(doc(db, COLLECTION, id), payload);
}

export function deleteDisease(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}

// One-off lookup (e.g. when saving a scan record). Screens should prefer
// the DiseasesContext, which is already loaded and live.
export async function getDiseaseByLabel(label) {
  const snapshot = await getDocs(
    query(diseasesRef, where('classificationLabel', '==', normalizeLabel(label)), limit(1))
  );
  return snapshot.empty ? null : fromDoc(snapshot.docs[0]);
}
