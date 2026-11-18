/** Pure helpers for reading a GitHub release; kept free of native modules so tests can run them. */

const NOTE_LENGTH = 160;

/** True if `a` is a higher version than `b` (`1.10.0` > `1.9.2`). */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/** The first paragraph of Markdown release notes as plain text, shortened. */
export function summarizeNotes(body: string | null | undefined): string | null {
  if (!body) return null;
  const paragraph: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('>') || line.startsWith('|') || /^-{3,}$/.test(line)) {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(line.replace(/^[-*]\s+/, ''));
  }
  const text = paragraph
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > NOTE_LENGTH ? `${text.slice(0, NOTE_LENGTH - 1).trimEnd()}…` : text;
}

export interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

/** The APK for the first processor type this phone supports, falling back to the universal build. */
export function pickApk(assets: ReleaseAsset[], abis: readonly string[]): ReleaseAsset | null {
  const apks = assets.filter((a) => a.name.endsWith('.apk'));
  for (const abi of abis) {
    const match = apks.find((a) => a.name.includes(abi));
    if (match) return match;
  }
  return apks.find((a) => a.name.includes('universal')) ?? apks[0] ?? null;
}
