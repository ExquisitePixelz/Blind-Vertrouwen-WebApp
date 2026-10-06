import { copyFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages answers unknown paths with 404.html. Copying index.html there
// makes a refresh on any page load the app (ARCHITECTURE.md 3.8).
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist')
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
    },
  }
}

// Content Security Policy (ARCHITECTURE.md, Phase 4 known gap 2): the page
// may only run its own scripts and Google's sign-in script, and only talk to
// itself, Supabase and Google sign-in. If a script were ever injected, it
// could not load code or send data anywhere else. GitHub Pages cannot send
// headers, so it is a <meta> tag, added to the build only: the dev server
// needs inline scripts. 'unsafe-inline' styles are needed for style={{}}
// attributes and Google's button; styles cannot run code.
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is needed for the Content Security Policy.')
      const policy = [
        "default-src 'self'",
        "script-src 'self' https://accounts.google.com/gsi/client",
        "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
        `connect-src 'self' ${new URL(supabaseUrl).origin} https://accounts.google.com/gsi/`,
        'frame-src https://accounts.google.com/gsi/',
        "img-src 'self' data: https://*.googleusercontent.com",
        "font-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }]
    },
  }
}

// The app's version (ARCHITECTURE.md 3.9) lives in package.json only.
const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')) as { version: string }

export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    rolldownOptions: {
      output: {
        // React, the router and Supabase change rarely: one shared file of
        // their own, so a new version of the app usually changes only small
        // files and phones download just those (ARCHITECTURE.md 1.11 A1).
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[/\\](react|react-dom|scheduler|react-router|cookie|set-cookie-parser|@supabase|tslib)[/\\]/,
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // Ask before switching to a new version ("New version, tap to reload").
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'DnD Companion App',
        short_name: 'DnD Companion',
        description: 'Characters, gods and piety for our Theros campaigns.',
        theme_color: '#121214',
        background_color: '#121214',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only the app shell is cached. Data always comes from the server (3.4).
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
    contentSecurityPolicy(loadEnv(mode, import.meta.dirname).VITE_SUPABASE_URL),
    spaFallback(),
  ],
}))
