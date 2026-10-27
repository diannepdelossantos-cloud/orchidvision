import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as diseasesService from '../services/firebase/diseasesService';

// Keeps the Disease Knowledge Base loaded and live for the whole app, so the
// scan result can look up a label instantly (no extra fetch per scan) and
// admin edits show up on the next scan without restarting.
// Firestore's offline cache also means this keeps working without signal
// once the list has loaded at least once.
const DiseasesContext = createContext({
  diseases: [],
  byLabel: {},
  isLoading: true,
  error: null,
});

export function DiseasesProvider({ children }) {
  const [diseases, setDiseases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = diseasesService.subscribeToAllDiseases(
      (list) => {
        setDiseases(list);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const byLabel = useMemo(() => {
    const map = {};
    diseases.forEach((d) => {
      map[diseasesService.normalizeLabel(d.classificationLabel)] = d;
    });
    return map;
  }, [diseases]);

  const value = useMemo(() => ({ diseases, byLabel, isLoading, error }), [diseases, byLabel, isLoading, error]);

  return <DiseasesContext.Provider value={value}>{children}</DiseasesContext.Provider>;
}

export const useDiseases = () => useContext(DiseasesContext);

// Returns the knowledge-base entry for a model label, or null if the admin
// hasn't added one yet.
export function useDiseaseForLabel(label) {
  const { byLabel, isLoading } = useDiseases();
  const entry = label ? byLabel[diseasesService.normalizeLabel(label)] || null : null;
  return { entry, isLoading };
}
