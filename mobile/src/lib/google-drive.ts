import { fetch } from 'expo/fetch';

/** Google Drive REST calls on the hidden app folder (`appDataFolder`). */
const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_FIELDS = 'id,name,version,modifiedTime,size';

export interface DriveFile {
  id: string;
  name: string;
  /** Increases on every change to the file. */
  version: string;
  modifiedTime: string;
  size?: string;
}

/** Drive rejected the access token (expired or revoked). */
export class DriveAuthError extends Error {}

/** Drive couldn't be reached (offline, timeout, DNS). */
export class DriveNetworkError extends Error {}

async function request(token: string, url: string, init: { method?: string; headers?: Record<string, string>; body?: Uint8Array | string } = {}) {
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    const body = init.body instanceof Uint8Array ? new Uint8Array(init.body) : init.body;
    response = await fetch(url, { ...init, body, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  } catch (error) {
    throw new DriveNetworkError(error instanceof Error ? error.message : String(error));
  }
  if (response.status === 401) throw new DriveAuthError('Google Drive sign-in expired.');
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Google Drive error ${response.status}: ${detail}`);
  }
  return response;
}

export async function listFiles(token: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({ spaces: 'appDataFolder', fields: `files(${FILE_FIELDS})`, pageSize: '200' });
  const response = await request(token, `${FILES}?${params}`);
  return ((await response.json()) as { files?: DriveFile[] }).files ?? [];
}

export async function downloadFile(token: string, id: string): Promise<Uint8Array> {
  const response = await request(token, `${FILES}/${id}?alt=media`);
  return response.bytes();
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export async function createFile(token: string, name: string, data: Uint8Array, mimeType: string): Promise<DriveFile> {
  const boundary = `spendtrak${Date.now().toString(36)}`;
  const encoder = new TextEncoder();
  const metadata = JSON.stringify({ name, parents: ['appDataFolder'], mimeType });
  const body = concat([
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    data,
    encoder.encode(`\r\n--${boundary}--`),
  ]);
  const response = await request(token, `${UPLOAD}?uploadType=multipart&fields=${FILE_FIELDS}`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return response.json();
}

/** Replaces a file's content. Drive swaps it in one step, so a failed upload leaves the old content. */
export async function updateFile(token: string, id: string, data: Uint8Array, mimeType: string): Promise<DriveFile> {
  const response = await request(token, `${UPLOAD}/${id}?uploadType=media&fields=${FILE_FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': mimeType },
    body: data,
  });
  return response.json();
}

export async function deleteFile(token: string, id: string) {
  await request(token, `${FILES}/${id}`, { method: 'DELETE' });
}
