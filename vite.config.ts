import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Runs our Vercel API routes (api/**) locally under plain `vite dev`, so the
// frontend can call /api/* without needing `vercel dev` / a Vercel account.
// Production still runs these files as real Vercel serverless functions.
function localApiPlugin(): Plugin {
  function jsonHandler(handler: (query: URLSearchParams) => Promise<unknown>) {
    return async (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
      try {
        const url = new URL(req.url ?? '', 'http://localhost')
        const result = await handler(url.searchParams)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result))
      } catch (error) {
        res.statusCode = error instanceof MissingParamError ? 400 : 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
      }
    }
  }

  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use(
        '/api/sheets',
        jsonHandler(async (query) => {
          const spreadsheetId = query.get('spreadsheetId')
          if (!spreadsheetId) throw new MissingParamError('Missing "spreadsheetId" query parameter')

          const { fetchSheetTitles } = await server.ssrLoadModule('/api/_lib/google-sheets.ts')
          return { sheets: await fetchSheetTitles(spreadsheetId) }
        }),
      )

      server.middlewares.use(
        '/api/schedule',
        jsonHandler(async (query) => {
          const group = query.get('group')
          if (!group) throw new MissingParamError('Missing "group" query parameter')

          const { fetchGroupSchedule } = await server.ssrLoadModule('/api/_lib/schedule.ts')
          return { schedule: await fetchGroupSchedule(group) }
        }),
      )

      server.middlewares.use('/api/roster', async (req, res) => {
        try {
          if (req.method === 'GET') {
            const url = new URL(req.url ?? '', 'http://localhost')
            const group = url.searchParams.get('group')
            const date = url.searchParams.get('date')
            if (!group || !date) throw new MissingParamError('Missing "group" or "date" query parameter')

            const { getRoster } = await server.ssrLoadModule('/api/_lib/roster.ts')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ entries: await getRoster(group, date) }))
            return
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
            const { group, date, updates } = body
            if (!group || !date || !Array.isArray(updates)) {
              throw new MissingParamError('Expected { group, date, updates } in body')
            }

            const { saveAttendance } = await server.ssrLoadModule('/api/_lib/roster.ts')
            await saveAttendance(group, date, updates)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
            return
          }

          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (error) {
          res.statusCode = error instanceof MissingParamError ? 400 : 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
        }
      })

      server.middlewares.use(
        '/api/auth-status',
        postJsonHandler(async (body) => {
          const { initData } = body
          if (typeof initData !== 'string' || !initData) {
            throw new MissingParamError('Missing "initData" in body')
          }

          const { verifyInitData } = await server.ssrLoadModule('/api/_lib/telegram.ts')
          const user = verifyInitData(initData)
          if (!user) return { status: 401, body: { error: 'Invalid Telegram signature' } }

          const { isUserAllowed } = await server.ssrLoadModule('/api/_lib/users-sheet.ts')
          return { status: 200, body: { allowed: await isUserAllowed(user.id), user } }
        }),
      )

      server.middlewares.use(
        '/api/auth-request',
        postJsonHandler(async (body) => {
          const { initData } = body
          if (typeof initData !== 'string' || !initData) {
            throw new MissingParamError('Missing "initData" in body')
          }

          const { verifyInitData } = await server.ssrLoadModule('/api/_lib/telegram.ts')
          const user = verifyInitData(initData)
          if (!user) return { status: 401, body: { error: 'Invalid Telegram signature' } }

          const { requestAccess } = await server.ssrLoadModule('/api/_lib/access-request.ts')
          const { alreadyAllowed } = await requestAccess(user)
          return { status: 200, body: { ok: true, alreadyAllowed } }
        }),
      )
    },
  }
}

function postJsonHandler(
  handler: (body: Record<string, unknown>) => Promise<{ status: number; body: unknown }>,
) {
  return async (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
      const { status, body: responseBody } = await handler(body)
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(responseBody))
    } catch (error) {
      res.statusCode = error instanceof MissingParamError ? 400 : 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
    }
  }
}

class MissingParamError extends Error {}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value
  }

  return {
    plugins: [react(), tailwindcss(), localApiPlugin()],
  }
})
