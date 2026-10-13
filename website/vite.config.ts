import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'

function siteUrlValue(): string {
  return (
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  ).replace(/\/$/, '')
}

function siteUrl(): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrlValue()),
    writeBundle(opts) {
      const dir = opts.dir ?? 'dist'
      const origin = siteUrlValue()
      writeFileSync(
        join(dir, 'robots.txt'),
        `User-agent: *\nAllow: /\n\nSitemap: ${origin || ''}/sitemap.xml\n`,
      )
    },
  }
}

type Handler = { GET?: (request: Request) => Promise<Response> | Response }

async function sendWebResponse(res: import('node:http').ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}

function localFunctions(): Plugin {
  return {
    name: 'local-functions',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        const path = url.split('?')[0] ?? ''
        let modPath: string | null = null
        if (path === '/sitemap.xml' || path === '/api/sitemap') modPath = '/api/sitemap.ts'
        else if (path.startsWith('/api/og/')) modPath = '/api/og/[...path].tsx'
        else if (path === '/api/page') modPath = '/api/page.ts'
        if (!modPath) return next()
        try {
          const mod = (await server.ssrLoadModule(modPath)) as Handler
          if (!mod.GET) return next()
          const origin = `http://${req.headers.host ?? 'localhost:5173'}`
          const request = new Request(new URL(url, origin), {
            method: 'GET',
            headers: req.headers as Record<string, string>,
          })
          await sendWebResponse(res, await mod.GET(request))
        } catch (err) {
          server.config.logger.error(String(err))
          next(err as Error)
        }
      })
    },
  }
}

const DEV_API_URL = (process.env.DEV_API_URL ?? 'https://unearth-1o4a.onrender.com').replace(/\/$/, '')

export default defineConfig({
  plugins: [react(), siteUrl(), localFunctions()],
  envPrefix: ['VITE_', 'APPLE_SERVICES_ID', 'APP_STORE_URL', 'WEB_SIGN_IN_ENABLED'],
  server: {
    proxy: {
      '/api': {
        target: DEV_API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        bypass(req) {
          const url = req.url ?? ''
          if (url.startsWith('/api/og') || url.startsWith('/api/page') || url.startsWith('/api/sitemap')) return url
        },
      },
    },
  },
})
