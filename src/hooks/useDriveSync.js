'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { bindSync, flushSync, hasSyncProgress, scheduleSync, syncNow, syncOnResume } from '../utils/driveSync';

/** Keeps Google Drive in sync while the app is open. Mount once, inside AppProvider. */
export function useDriveAutoSync() {
  const { state, dispatch } = useApp();
  const latest = useRef(state);
  const ready = state.settings.onboardStep >= 3 && !!state.settings.gdriveEmail;

  useEffect(() => {
    latest.current = state;
  });

  useEffect(() => {
    bindSync(() => latest.current, dispatch);
  }, [dispatch]);

  // Earlier versions left `gdriveAutoSync: false` after any disconnect; until this browser has synced
  // with the current sync, treat that as unset so automatic sync is the default.
  useEffect(() => {
    if (state.settings.gdriveEmail && state.settings.gdriveAutoSync === false && !hasSyncProgress()) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: { gdriveAutoSync: true } });
    }
  }, [state.settings.gdriveEmail, state.settings.gdriveAutoSync, dispatch]);

  useEffect(() => {
    if (ready) scheduleSync();
  }, [ready, state.accounts, state.transactions, state.categories, state.plannedPayments, state.splitLedger, state.syncMeta]);

  // After the effect above, so the first sync replaces the change timer it just set.
  useEffect(() => {
    if (ready) syncNow();
  }, [ready]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') syncOnResume();
      else flushSync();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}
