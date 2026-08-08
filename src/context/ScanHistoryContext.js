import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as scanRecordService from '../services/firebase/scanRecordService';

const ScanHistoryContext = createContext(null);

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Keeps the signed-in user's scan history (users/{uid}/scans) in sync via a
// real-time listener, split into active vs. soft-deleted records, and
// exposes the actions the Profile History/Restore UI needs. Mirrors
// ProfileContext's shape/pattern.
export function ScanHistoryProvider({ children }) {
  const { user } = useAuth();
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAllRecords([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = scanRecordService.subscribeToScanRecords(user.uid, (records) => {
      setAllRecords(records);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  // No server cron purges expired soft-deletes, so sweep them opportunistically
  // whenever the list changes. Fire-and-forget: a failed purge just gets
  // retried on the next snapshot.
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const expiredIds = allRecords
      .filter((r) => r.deletedAt?.toDate && now - r.deletedAt.toDate().getTime() > RETENTION_MS)
      .map((r) => r.id);
    if (expiredIds.length > 0) {
      scanRecordService.permanentlyDeleteScanRecords(user.uid, expiredIds).catch(() => {});
    }
  }, [allRecords, user]);

  const records = useMemo(() => allRecords.filter((r) => !r.deletedAt), [allRecords]);
  const deletedRecords = useMemo(() => allRecords.filter((r) => !!r.deletedAt), [allRecords]);

  const addScanRecord = useCallback(
    (data) => scanRecordService.createScanRecord(user.uid, data),
    [user],
  );
  const deleteRecord = useCallback(
    (id) => scanRecordService.softDeleteScanRecord(user.uid, id),
    [user],
  );
  const restoreRecord = useCallback(
    (id) => scanRecordService.restoreScanRecord(user.uid, id),
    [user],
  );
  const permanentlyDelete = useCallback(
    (id) => scanRecordService.permanentlyDeleteScanRecord(user.uid, id),
    [user],
  );
  const permanentlyDeleteAll = useCallback(
    (ids) => scanRecordService.permanentlyDeleteScanRecords(user.uid, ids),
    [user],
  );

  const value = useMemo(
    () => ({
      records,
      deletedRecords,
      loading,
      addScanRecord,
      deleteRecord,
      restoreRecord,
      permanentlyDelete,
      permanentlyDeleteAll,
    }),
    [records, deletedRecords, loading, addScanRecord, deleteRecord, restoreRecord, permanentlyDelete, permanentlyDeleteAll],
  );

  return <ScanHistoryContext.Provider value={value}>{children}</ScanHistoryContext.Provider>;
}

export function useScanHistory() {
  const context = useContext(ScanHistoryContext);
  if (!context) {
    throw new Error('useScanHistory must be used within a ScanHistoryProvider');
  }
  return context;
}
