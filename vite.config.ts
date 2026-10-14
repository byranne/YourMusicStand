/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { colors } from './src/theme/colors';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'MusicStand',
        short_name: 'MusicStand',
        description: 'Track the songs you know, are learning, and want to learn.',
        display: 'standalone',
        start_url: '/',
        // The manifest takes a single color; index.html's theme-color metas follow the system.
        background_color: colors.dark.background,
        theme_color: colors.dark.background,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Covers of what you've saved are kept on the device, so a relaunch shows
      // them at once. The app fills and prunes the 'covers' cache itself
      // (keepCovers in src/lib/coverImages.ts); the service worker only reads
      // it and never stores what it fetches, so search covers aren't kept.
      // These functions are copied into the service worker as source, so they
      // can't use anything from this file.
      workbox: {
        runtimeCaching: [
          {
            // Cover Art Archive: front-250 redirects twice (to archive.org and
            // then one of its servers) with no cache headers. A kept cover is
            // stored under the original URL, which skips both hops.
            urlPattern: ({ url }) =>
              url.hostname === 'coverartarchive.org' ||
              url.hostname === 'archive.org' ||
              url.hostname.endsWith('.archive.org'),
            handler: 'CacheFirst',
            options: { cacheName: 'covers', plugins: [{ cacheWillUpdate: async () => null }] },
          },
          {
            // Uploaded song, jamlist and profile covers, kept by path without
            // the signing token (coverCacheKey), so a re-signed URL still hits.
            urlPattern: ({ url }) => /\/storage\/v1\/object\/sign\/resources\/[^/]+\/(covers|avatar)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers',
              plugins: [
                { cacheWillUpdate: async () => null },
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const url = new URL(request.url);
                    url.search = '';
                    return url.href;
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
  },
});
