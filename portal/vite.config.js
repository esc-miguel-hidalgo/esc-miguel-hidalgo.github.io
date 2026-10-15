import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Se publica en https://esc-miguel-hidalgo.github.io/portal/ (ver .github/workflows/pages.yml).
// `npm run demo` usa un Supabase falso en memoria (demo/supabase-falso.js) para
// recorrer la interfaz sin proyecto real; ese archivo nunca entra al build normal.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/portal/',
  resolve: {
    alias: mode === 'demo'
      ? [{ find: /^(\.\.?\/)+(lib\/)?supabase\.js$/, replacement: fileURLToPath(new URL('./demo/supabase-falso.js', import.meta.url)) }]
      : [],
  },
  test: { environment: 'node' },
}));
