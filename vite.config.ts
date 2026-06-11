import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ctrain-app/',
  plugins: [
    tailwindcss(),
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CTrain',
        short_name: 'CTrain',
        description: 'Your personal training companion',
        theme_color: '#FAFAFA',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/ctrain-app/',
        icons: [
          {
            src: 'favicon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
