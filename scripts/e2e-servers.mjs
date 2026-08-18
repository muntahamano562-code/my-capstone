// Launches both the Vite frontend and the Express API server for E2E tests.
// The API key is intentionally cleared so the server-side mock provider is
// used (api/chat.js: useMock = !apiKey). dotenv will not override an
// already-defined env var, so the real Google provider is never contacted.
import { spawn } from 'node:child_process';

const env = { ...process.env, GOOGLE_GENERATIVE_AI_API_KEY: '' };

const frontend = spawn('npm', ['run', 'dev'], { stdio: 'inherit', env, shell: true });
const api = spawn('npm', ['run', 'server'], { stdio: 'inherit', env, shell: true });

function shutdown(code) {
  frontend.kill('SIGTERM');
  api.kill('SIGTERM');
  process.exit(code ?? 0);
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
