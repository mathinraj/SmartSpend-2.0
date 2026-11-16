/** Same format as the web app's IDs, so imported backups and new rows look alike. */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
