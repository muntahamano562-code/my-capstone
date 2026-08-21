# AI Career Assistant

An AI-powered career guidance chat application built as a frontend engineering
capstone. It streams helpful, context-aware career advice and can analyze a
GitHub profile to produce a structured career insight.

## What I Built

A responsive single-page chat app where users ask an AI career assistant about
learning priorities, skill gaps, and project ideas. The assistant streams
responses token-by-token over Server-Sent Events (SSE), and can invoke a GitHub
analysis tool that returns a structured career summary (repos, stars, followers,
activity score, top languages, recommended focus).

Key product behaviors:

- Streaming chat with a polished pending/skeleton state and Stop control.
- A "Jump to latest" control when the user scrolls up during streaming.
- GitHub analysis tool with a documented input/output lifecycle surfaced to the UI.
- Graceful error states (network, API, rate-limit, mid-stream failures) with retry.
- A mock provider fallback so the app runs end-to-end without a paid API key.

## Live Demo

Production URL: [add final Vercel URL after deployment]

> The app currently runs in **mock mode** on the public URL unless a real
> `GOOGLE_GENERATIVE_AI_API_KEY` is configured in the Vercel project. Mock mode
> returns clearly-labeled `Mock:` replies and exercises the full streaming UI.

## Screenshots

Screenshots are not yet committed to the repository. Add real captures to
`docs/screenshots/` and update the paths below.

### Main Experience
![Main chat experience](docs/screenshots/main.png)

### GitHub Analysis Tool Result
![GitHub analysis result](docs/screenshots/github-analysis.png)

### Error / Rate-limit State
![Error state](docs/screenshots/error-state.png)

**TODO (manual):** Capture and add the three screenshots above to `docs/screenshots/`.

## Features

- Streaming AI chat (SSE).
- GitHub profile analysis tool with structured output.
- Stop generation and Jump-to-latest scroll controls.
- Empty, pending, error, and rate-limit UI states.
- Mock provider fallback (no API key required to run).
- Input validation and lightweight rate limiting on the API route.

## Tech Stack

- React 19 + Vite (frontend, JavaScript/JSX)
- Express (local development API adapter)
- Vercel serverless functions (production API)
- `@ai-sdk/google` + `ai` SDK (streaming, tool calls)
- `zod` (tool input/output validation)
- Vitest + Testing Library (unit tests)
- Playwright (end-to-end tests)

## Getting Started

```bash
npm install
npm run dev
```

This starts the Vite dev server (frontend) and, in a separate terminal, the
local Express API on port 3001. Vite proxies `/api` to `http://localhost:3001`
(see `vite.config.js`), so the frontend just calls `/api/chat`.

To run the API server separately:

```bash
npm run server
```

### Production build / preview

```bash
npm run build
npm run preview
```

For a true production deployment, use Vercel (see Deployment below). On Vercel
the `api/chat.js` file is deployed as a serverless function directly; no separate
Express process is needed.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | No (optional) | Google AI (Gemini) API key. When absent, the app uses the mock provider fallback. Never commit a real key. |
| `GOOGLE_MODEL` | No (optional) | Override the Gemini model id. Defaults to `gemini-3.5-flash`. |

Only server-side code reads these variables (via `process.env`). No secrets are
exposed to the frontend. `.env` is gitignored; use `.env.example` as a template.

## Architecture

- **React/Vite frontend** (`src/`): chat UI, streaming consumer, tool-call card,
  error/empty/pending states.
- **API/serverless chat route** (`api/chat.js`): the canonical production
  handler. It performs input validation, rate limiting, then either calls the
  mock provider or the real Google AI model via the `ai` SDK, streaming results
  back as SSE.
- **Local Express adapter** (`server/api/chat.js` + `server/server.js`): in
  development the same canonical `api/chat.js` handler is reused via Express so
  local and production behavior match exactly. There is no second chat
  implementation.
- **AI provider configuration** (`server/config/aiConfig.js`): model selection
  and system prompt.
- **Mock provider fallback** (`server/providers/mockProvider.js`): deterministic
  replies when no API key is present.
- **GitHub analysis tool** (`server/tools/githubAnalysis.js`): `zod`-validated
  input/output, calls the GitHub REST API, returns a structured career summary.
- **SSE streaming**: both the mock path and the real model path emit SSE events
  (`meta`, `chunk`, `tool-input-start`, `tool-input-delta`, `tool-call`,
  `tool-result`, `tool-error`, `done`, `error`).

## Request / Streaming Flow

```
Frontend (React) --POST /api/chat { messages }-->
  api/chat.js
    -> rate limit + input validation
    -> if no API key: mock provider (chunked SSE)
    -> if API key:  streamText({ model, system, messages, tools, stopWhen: stepCountIs(4) })
  <-- SSE stream (chunks + tool lifecycle) -->
Frontend renders streaming text, tool card, and stops on "done".
```

Tool-call lifecycle: the model emits `tool-input-start` (preparing), `tool-call`
(input available, e.g. GitHub username), the tool executes (GitHub API), then
`tool-result` renders the structured analysis. A `stopWhen: stepCountIs(4)` bound
keeps tool/agent loops from running unbounded.

## Production & Security

- **Input caps** (see `api/chat.js`): messages must be an array; non-empty; max
  **30** messages per request; max **4,000** characters per message; max
  **30,000** characters total per request; each message must have a valid
  `role` (`system`/`user`/`assistant`) and a string `content`. Oversized or
  malformed payloads are rejected with HTTP **400** and a safe message (request
  contents are never echoed back).
- **Rate limiting**: best-effort, per-instance, in-memory limiter allowing about
  **10 requests per minute per client IP**. Exceeding it returns HTTP **429**
  with a `Retry-After` header. Because serverless instances do not share memory,
  this is **not** a globally distributed limit — it is a small abuse deterrent,
  not a hard guarantee (see Known Limitations).
- **maxDuration**: the `/api/chat` serverless function is configured with
  `maxDuration: 60` seconds in `vercel.json` to bound streaming execution cost.
- **Environment handling**: secrets are read only from `process.env`; no keys are
  hardcoded; no secrets reach the frontend; `.env` is gitignored.
- **Mock fallback**: without an API key the route serves deterministic mock
  replies, so the public deployment works without incurring API cost.

## Key Technical Decisions

- **Single canonical chat handler** shared by local Express and Vercel
  serverless deployments, so behavior is identical across environments.
- **SSE streaming** for a responsive, token-by-token experience and to surface the
  tool-call lifecycle cleanly to the UI.
- **Mock provider** so the app runs and is demoable without a paid provider key.
- **Tool step limit** (`stepCountIs(4)`) to prevent runaway agent loops.
- **Input protection + lightweight rate limiting** as minimal, dependency-free
  production hardening appropriate for a capstone (no Redis/Upstash added).

## Performance Notes

SSE streaming starts the first token/state immediately and avoids buffering the
entire response, which keeps perceived latency low. The frontend reuses a single
AbortController per request to support Stop and retry without duplicate
generations. (No Lighthouse/bundle-size measurements were performed for this
milestone; bundle size can be assessed with `npm run build` output.)

## How AI Tools Built This

AI coding tools were used as an assistant during development, but their
suggestions were **not** treated as automatically correct:

- Used AI tools to explore implementation approaches (SSE streaming, the `ai`
  SDK tool-call lifecycle, Vercel serverless function configuration).
- Generated and refined implementation suggestions for the chat handler, mock
  provider, and GitHub tool.
- Used AI assistance for debugging streaming/parsing edge cases.
- Reviewed and adapted generated code to fit the existing React/Vite project
  conventions.
- Used the **mock provider during development** to avoid requiring a paid
  provider key while building and testing the full UX.
- Manually tested the resulting behavior (unit tests, end-to-end tests, and
  manual browser checks of the streaming and error states).

## Testing / Verification

Automated checks run in CI and locally:

```bash
npm run lint
npm run build
npm run test:run      # Vitest unit tests
npx playwright test   # end-to-end (requires `npx playwright install chromium`)
```

**Verified automatically (this milestone):** `npm run lint`, `npm run build`,
and `npm run test:run` were executed; the chat handler changes preserve the
existing valid flow and add validation/rate-limit paths.

**Not yet verified (manual):** live Vercel deployment, and cross-browser/device
passes (Chrome, Firefox, Safari, mobile Safari). Do not claim these until
actually tested on real devices/browsers.

## Known Limitations

- **Best-effort per-instance rate limiting**: the in-memory limiter is scoped to
  a single serverless instance and is not globally distributed. A determined
  abuser hitting many instances could still send traffic; a managed rate-limit
  service (e.g. Upstash/Vercel KV) would be the follow-up for stricter control.
- **Provider/API-key dependency for real AI**: without `GOOGLE_GENERATIVE_AI_API_KEY`
  the app only returns mock replies; real generation requires a valid key and
  incurs provider cost.
- **GitHub API unauthenticated rate limits**: the analysis tool uses the public
  GitHub API without a token, so it is subject to GitHub's stricter anonymous
  rate limits.
- **maxDuration**: very long tool/agent conversations could approach the 60s
  serverless limit.

## Deployment

Deploy to Vercel:

1. Push the repository to GitHub and import it in Vercel (or run `vercel` from
   the project root).
2. Set environment variables in the Vercel project dashboard if you want real AI
   generation:
   - `GOOGLE_GENERATIVE_AI_API_KEY` (optional — mock mode is used without it)
   - `GOOGLE_MODEL` (optional)
   Do **not** commit secrets; Vercel injects them at runtime.
3. Vercel detects `api/chat.js` as a serverless function and uses `vercel.json`
   (`buildCommand: npm run build`, `outputDirectory: dist`,
   `functions.api/chat.js.maxDuration: 60`).
4. Deploy. The production URL serves the built frontend and proxies `/api/chat`
   to the serverless function.

No rewrites or extra routes are required; the existing frontend already calls
`/api/chat` and Vite's dev proxy points to the local Express server.
