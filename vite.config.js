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
        globPatterns: ['**/*.{js,css,html,svg,webp,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
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
