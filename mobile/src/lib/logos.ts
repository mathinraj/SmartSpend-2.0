/** Bank and brand logos from Brandfetch, in the same URL format as the web app so backups round-trip. */
const CLIENT_ID = process.env.EXPO_PUBLIC_BRANDFETCH_CLIENT_ID ?? '';

/** False when no Brandfetch client ID is configured; the logo picker is hidden then. */
export const logosAvailable = CLIENT_ID !== '';

export function logoUrlForDomain(domain: string): string {
  return `https://cdn.brandfetch.io/${encodeURIComponent(domain)}/w/128/h/128/theme/light/fallback/lettermark/type/icon?c=${CLIENT_ID}`;
}

export interface LogoResult {
  name: string;
  domain: string;
}

const cache = new Map<string, LogoResult[]>();

/** Brand search by name, e.g. "HDFC". Returns `null` when Brandfetch can't be reached. */
export async function searchLogos(query: string): Promise<LogoResult[] | null> {
  const key = query.trim().toLowerCase();
  if (!key || !logosAvailable) return [];
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(key)}?c=${CLIENT_ID}`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const results = (Array.isArray(data) ? data : [])
      .filter((item): item is { name?: string; domain: string } => typeof item?.domain === 'string')
      .map((item) => ({ name: item.name || item.domain, domain: item.domain }))
      .slice(0, 8);
    cache.set(key, results);
    return results;
  } catch {
    return null;
  }
}
