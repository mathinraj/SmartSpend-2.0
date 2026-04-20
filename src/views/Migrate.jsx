'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import * as gDrive from '../utils/googleDrive';

const NEW_SITE_URL = 'https://spendtrak.vercel.app';

export default function Migrate() {
  const { state } = useApp();
  const { settings, accounts, transactions } = state;
  const toast = useToast();

  const [downloaded, setDownloaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  function buildExportData() {
    return {
      _app: 'SpendTrak',
      _version: '2.1.0',
      _exportedAt: new Date().toISOString(),
      settings: { ...settings, onboardStep: undefined },
      accounts,
      transactions,
      categories: state.categories,
      plannedPayments: state.plannedPayments,
      splitLedger: state.splitLedger,
    };
  }

  function buildSyncPayload() {
    const payload = {
      settings: {
        ...settings,
        onboardStep: undefined,
        gdriveEmail: undefined,
        gdriveName: undefined,
        gdrivePhoto: undefined,
        gdriveLastSync: undefined,
        balancePeekUntil: undefined,
      },
      accounts,
      transactions,
      categories: state.categories,
      plannedPayments: state.plannedPayments,
      splitLedger: state.splitLedger,
    };
    if (settings.syncProfilePhoto) {
      const photo = typeof window !== 'undefined' ? localStorage.getItem('spendtraq_profile_photo') : null;
      if (photo) payload.profilePhoto = photo;
    }
    return payload;
  }

  function handleDownload() {
    const json = JSON.stringify(buildExportData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendtrak-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast('Backup downloaded. Keep this file safe.', 'success');
  }

  async function handleDriveBackup() {
    setSyncing(true);
    try {
      if (!gDrive.isConfigured()) {
        toast('Google Drive is not configured. Use Download option instead.', 'warning');
        setSyncing(false);
        return;
      }
      const token = await gDrive.requestAccessToken({ prompt: 'consent' });
      if (!token) {
        toast('Google Drive sign-in cancelled', 'warning');
        setSyncing(false);
        return;
      }
      await gDrive.uploadSyncData(buildSyncPayload());
      setSynced(true);
      toast('Data backed up to Google Drive', 'success');
    } catch (err) {
      console.error('Drive backup error:', err);
      toast('Failed to back up to Google Drive', 'error');
    }
    setSyncing(false);
  }

  function handleGoToNewSite() {
    window.location.href = NEW_SITE_URL;
  }

  const canProceed = downloaded || synced;

  return (
    <div className="migrate-page">
      <div className="migrate-container">
        <div className="migrate-header">
          <div className="migrate-icon">
            <i className="fa-solid fa-right-left" />
          </div>
          <h1>Migrate your data</h1>
          <p className="migrate-subtitle">
            This site is moving to <strong>spendtrak.vercel.app</strong> on <strong>Apr 30, 2026</strong>.
            Please save your data below before switching to the new site.
          </p>
        </div>

        <div className="migrate-step">
          <div className="migrate-step-header">
            <span className="migrate-step-num">1</span>
            <h2>Save your data</h2>
          </div>
          <p className="migrate-step-desc">Choose at least one option to keep your data safe.</p>

          <div className="migrate-options">
            <div className={`migrate-option ${downloaded ? 'done' : ''}`}>
              <div className="migrate-option-info">
                <i className="fa-solid fa-download" />
                <div>
                  <p className="migrate-option-title">Download backup file</p>
                  <p className="migrate-option-desc">
                    Save a <code>.json</code> file to your device. You&apos;ll import it on the new site.
                  </p>
                </div>
              </div>
              <button className="migrate-btn" onClick={handleDownload}>
                {downloaded ? (<><i className="fa-solid fa-check" /> Downloaded</>) : 'Download'}
              </button>
            </div>

            <div className={`migrate-option ${synced ? 'done' : ''}`}>
              <div className="migrate-option-info">
                <i className="fa-brands fa-google-drive" />
                <div>
                  <p className="migrate-option-title">Back up to Google Drive</p>
                  <p className="migrate-option-desc">
                    Sign in and push your data to Drive. Pull it on the new site with the same Google account.
                  </p>
                </div>
              </div>
              <button className="migrate-btn" onClick={handleDriveBackup} disabled={syncing}>
                {syncing ? (<><i className="fa-solid fa-spinner fa-spin" /> Backing up...</>) : synced ? (<><i className="fa-solid fa-check" /> Done</>) : 'Back up'}
              </button>
            </div>
          </div>
        </div>

        <div className={`migrate-step ${canProceed ? '' : 'disabled'}`}>
          <div className="migrate-step-header">
            <span className="migrate-step-num">2</span>
            <h2>Go to the new site</h2>
          </div>
          <p className="migrate-step-desc">
            {canProceed
              ? 'On spendtrak.vercel.app, use Preferences → Backup & Sync to import your file or pull from Google Drive.'
              : 'Complete step 1 first.'}
          </p>
          <button
            className="migrate-btn primary large"
            onClick={handleGoToNewSite}
            disabled={!canProceed}
          >
            Go to spendtrak.vercel.app <i className="fa-solid fa-arrow-right" />
          </button>
        </div>

        <p className="migrate-footnote">
          Your data stays private — it never leaves your device unless you sync to Google Drive.
        </p>
      </div>
    </div>
  );
}
