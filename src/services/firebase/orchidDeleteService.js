import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Firestore allows at most 500 writes per batch.
const BATCH_LIMIT = 450;

// "Deletes" orchids the same way History deletes scans: nothing is erased
// yet. The orchid and each of its scans get a deletedAt timestamp, so
//   - the orchid disappears from My Orchids,
//   - its scans move to Profile → History → Restore (under the orchid's name),
//   - restoring any of those scans brings the orchid back too
//     (scanRecordService.restoreScanRecord),
//   - after 30 days the History sweep deletes the scans permanently, and the
//     orchid is erased once its last scan is gone
//     (scanRecordService.permanentlyDeleteScanRecord).
// Scans keep their orchidId so the link survives the round trip;
// `deletedWithOrchid` marks the ones this delete removed, so a restore puts
// back exactly those.
export async function deleteOrchidsWithScans(userId, orchidIds) {
  const ops = [];

  for (const orchidId of orchidIds) {
    const orchidRef = doc(db, 'orchids', orchidId);
    const orchidSnap = await getDoc(orchidRef);
    if (!orchidSnap.exists()) continue;
    const nickname = orchidSnap.data()?.nickname;

    const scansSnap = await getDocs(
      query(collection(db, 'scans'), where('userId', '==', userId), where('orchidId', '==', orchidId))
    );
    scansSnap.forEach((scanDoc) => {
      if (scanDoc.data()?.deletedAt) return; // already in Restore on its own
      ops.push({
        ref: scanDoc.ref,
        data: {
          deletedAt: serverTimestamp(),
          deletedWithOrchid: true,
          ...(nickname ? { name: nickname, plantName: nickname } : {}),
        },
      });
    });

    ops.push({ ref: orchidRef, data: { deletedAt: serverTimestamp() } });
  }

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => batch.update(op.ref, op.data));
    await batch.commit();
  }

  return ops.length;
}

export const deleteOrchidWithScans = (userId, orchidId) => deleteOrchidsWithScans(userId, [orchidId]);