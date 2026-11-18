// Lets `node --test` resolve the app's `@/` imports to TypeScript files in src/, and the web app's
// extensionless relative imports (`./sampleData`) to their .js files.
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const src = new URL('../src/', import.meta.url);

function withSuffix(base, suffixes) {
  return suffixes.map((s) => base + s).find((url) => existsSync(fileURLToPath(url)));
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const found = withSuffix(new URL(specifier.slice(2), src).href, ['.ts', '.tsx', '/index.ts']);
      if (found) return nextResolve(found, context);
    }
    if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      const found = withSuffix(new URL(specifier, context.parentURL).href, ['.js', '.ts']);
      if (found) return nextResolve(found, context);
    }
    return nextResolve(specifier, context);
  },
});
