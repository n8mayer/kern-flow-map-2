import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa'

// Basic PWA options
const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate', // Automatically update the service worker without prompting
  // injectRegister: 'auto', // Default is 'auto', can also be 'script' or null
  devOptions: {
    enabled: true, // Enable PWA in development mode (optional)
  },
  manifest: {
    name: 'Kern Flow Dashboard',
    short_name: 'KernFlow',
    description: 'Dashboard for visualizing Kern River water flow data.',
    theme_color: '#2563eb', // A blue theme color, e.g., blue-600
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: 'pwa-192x192.png', // Path relative to public directory
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'pwa-512x512.png', // Path relative to public directory
        sizes: '512x512',
        type: 'image/png',
      },
      { // Maskable icon example - ensure you have such an icon
        src: 'pwa-512x512.png', // Using the same for simplicity, ideally a separate maskable icon
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
  },
  // Service worker strategies (using GenerateSW for simplicity)
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'], // Files to cache
    runtimeCaching: [ // Example: Cache Google Fonts (if used)
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA(pwaOptions)
  ],
})
