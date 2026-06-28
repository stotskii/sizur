import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      // The wardrobe images (~32MB) are precached so the app works fully offline
      // once installed to the home screen — single user, fixed dataset.
      workbox: {
        // Precache the shell + all images (incl. the new ~320px grid thumbs) so
        // the app is instant and fully offline once installed.
        globPatterns: ['**/*.{js,css,html,svg,webp,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // 23MB background-removal WASM — too big to precache; cache on first
            // use so the 2nd "Вещь с фото" is instant instead of re-downloading.
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-runtime',
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // @imgly background-removal model files (fetched from their CDN).
            urlPattern: ({ url }) => /(^|\.)(staticimgly|imgly)\.com$/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'imgly-models',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Стиль — гардероб и образы',
        short_name: 'Стиль',
        description: 'Личный цифровой гардероб и ИИ-стилист',
        lang: 'ru',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f1ec',
        theme_color: '#f4f1ec',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
