const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const SYNC_FILENAME = 'spendtrak-sync.json';
const TOKEN_KEY = 'spendtraq_gdrive_token';
const TOKEN_EXPIRY_KEY = 'spendtraq_gdrive_token_expiry';

let tokenClient = null;
let accessToken = restoreToken();
let resolveTokenPromise = null;

function restoreToken() {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
  if (token && expiry > Date.now()) return token;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  return null;
}

function persistToken(token, expiresIn) {
  accessToken = token;
  if (token && expiresIn) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + (expiresIn - 60) * 1000));
  }
}

function clearPersistedToken() {
  accessToken = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function isConfigured() {
  return !!CLIENT_ID;
}

export function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', resolve);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export async function initTokenClient() {
  if (tokenClient) return tokenClient;
  await loadGisScript();

  return new Promise((resolve) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          if (resolveTokenPromise) resolveTokenPromise(null);
          return;
        }
        persistToken(response.access_token, response.expires_in || 3600);
        if (resolveTokenPromise) resolveTokenPromise(response.access_token);
      },
    });
    resolve(tokenClient);
  });
}

export async function requestAccessToken({ prompt = 'consent' } = {}) {
  const client = await initTokenClient();
  return new Promise((resolve) => {
    resolveTokenPromise = resolve;
    if (prompt === 'none') {
      client.requestAccessToken({ prompt: '' });
    } else {
      client.requestAccessToken({ prompt: 'consent' });
    }
  });
}

export async function ensureTokenSilently() {
  if (accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) return accessToken;
    } catch { /* token invalid, continue */ }
    clearPersistedToken();
  }

  try {
    const token = await requestAccessToken({ prompt: 'none' });
    if (token) return token;
  } catch { /* silent refresh failed */ }

  return null;
}

export function revokeToken() {
  if (accessToken) {
    window.google?.accounts?.oauth2?.revoke?.(accessToken);
  }
  clearPersistedToken();
  tokenClient = null;
}

export function getAccessToken() {
  return accessToken;
}

async function driveRequest(url, options = {}) {
  if (!accessToken) throw new Error('Not authenticated');

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearPersistedToken();
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }

  return res;
}

async function findSyncFile() {
  const q = `name='${SYNC_FILENAME}'`;
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,size)&pageSize=1`
  );
  const data = await res.json();
  return data.files?.[0] || null;
}

export async function uploadSyncData(appData) {
  const existing = await findSyncFile();

  const content = JSON.stringify({
    _app: 'SpendTrak',
    _version: '2.1.0',
    _syncedAt: new Date().toISOString(),
    ...appData,
  }, null, 2);

  if (existing) {
    const res = await driveRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: content,
      }
    );
    return res.json();
  }

  const metadata = {
    name: SYNC_FILENAME,
    parents: ['appDataFolder'],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'application/json' }));

  const res = await driveRequest(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', body: form }
  );
  return res.json();
}

export async function downloadSyncData() {
  const existing = await findSyncFile();
  if (!existing) return null;

  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`
  );
  return res.json();
}

export async function getSyncFileInfo() {
  return findSyncFile();
}

export async function deleteSyncFile() {
  const existing = await findSyncFile();
  if (!existing) return;
  await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${existing.id}`,
    { method: 'DELETE' }
  );
}

export async function getUserInfo() {
  if (!accessToken) return null;
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
