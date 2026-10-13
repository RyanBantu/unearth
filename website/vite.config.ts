import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Social crawlers (WhatsApp, X, iMessage) need absolute og:image URLs.
// Set SITE_URL for a custom domain; on Vercel the production domain is used automatically.
function siteUrl(): Plugin {
  const url =
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url.replace(/\/$/, '')),
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrl()],
})
