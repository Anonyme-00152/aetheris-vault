import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

const headers: Record<string, string> = JSON.parse(readFileSync(new URL('./security-headers.json', import.meta.url), 'utf8'))

// HSTS and upgrade-insecure-requests would break plain-http local previews.
const localHeaders: Record<string, string> = {
  ...headers,
  'Content-Security-Policy': headers['Content-Security-Policy'].replace('; upgrade-insecure-requests', ''),
}
delete localHeaders['Strict-Transport-Security']

/**
 * Emits /sw.js with the exact list of built files, so the whole app
 * (lazy chunks and fonts included) is available offline after one visit.
 */
function serviceWorker(): Plugin {
  return {
    name: 'aetheris-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      // Only the Latin font subsets: the others are fetched on demand by unicode-range.
      const files = Object.keys(bundle).filter(
        (f) => !f.endsWith('.map') && f !== 'index.html' && !/(cyrillic|vietnamese|greek|symbols)/.test(f),
      )
      const precache = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', ...files.map((f) => `/${f}`)]
      const source = readFileSync(new URL('./scripts/sw-template.js', import.meta.url), 'utf8')
        .replace('__VERSION__', Date.now().toString(36))
        .replace('__PRECACHE__', JSON.stringify(precache))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  preview: { headers: localHeaders },
  build: { target: 'es2022' },
})
