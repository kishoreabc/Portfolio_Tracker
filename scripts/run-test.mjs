import createJiti from 'jiti';
import path from 'path';

const jiti = createJiti(import.meta.url, {
  alias: {
    '@': path.resolve('.'),
  },
  interopDefault: true,
});

await jiti.import(path.resolve('./scripts/verify-v2-hardening.ts'));
