import { useEffect, useState } from 'react';
import { subscribeToAllDiseases } from '../services/firebase/diseasesService';

// Builds { [classificationLabel]: diseaseDoc } from the admin-managed
// Firestore knowledge base, so scan/orchid screens can look up name,
// category, severity and care protocols by the raw label a model returns —
// instead of a hardcoded file. A label with no entry yet simply isn't in the
// map; callers already handle that (no crash, just an empty-state message),
// since the knowledge base is populated over time by admins, not at build
// time.
export function useDiseaseInfo() {
  const [byLabel, setByLabel] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToAllDiseases((diseases) => {
      const map = {};
      diseases.forEach((entry) => {
        if (entry.classificationLabel) map[entry.classificationLabel] = entry;
      });
      setByLabel(map);
    });
    return unsubscribe;
  }, []);

  return byLabel;
}
