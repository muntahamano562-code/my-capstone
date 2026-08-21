import { streamText, stepCountIs } from 'ai';
import { googleModel, AI_SYSTEM_PROMPT, PROVIDER_API_KEY_ENV } from '../server/config/aiConfig.js';
import { generateTextMock } from '../server/providers/mockProvider.js';
import { analyzeGithubProfile } from '../server/tools/githubAnalysis.js';

// ---------------------------------------------------------------------------
// Production input caps and lightweight rate limiting.
//
// These constants are intentionally conservative to prevent strangers from
// trivially draining AI API credits or flooding the endpoint. They are also
// documented in README.md.
// ---------------------------------------------------------------------------
const MAX_MESSAGES = 30; // max messages per request
const MAX_MESSAGE_CHARS = 4000; // max characters per individual message
const MAX_TOTAL_CHARS = 30000; // max total conversation characters per request
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

const RATE_LIMIT_MAX = 10; // max requests per window per client
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

// Best-effort, per-instance in-memory rate limiter. NOTE: on serverless
// platforms such as Vercel each function instance keeps its own memory, so
// this is NOT a globally distributed limit. It is a small abuse deterrent,
// not a guarantee. See README "Production & Security".
const rateBuckets = new Map();

function getClientIdentifier(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return 'unknown';
}

function checkRateLimit(clientId) {
  const now = Date.now();
  const bucket = rateBuckets.get(clientId);

  // Prune expired buckets opportunistically to avoid unbounded memory growth.
  if (rateBuckets.size > 500) {
    for (const [key, value] of rateBuckets) {
      if (now >= value.resetAt) rateBuckets.delete(key);
    }
  }

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

// Validate the incoming conversation payload. Returns { ok, error }.
// Never echoes request contents back to the client.
function validateConversation(messages) {
  if (!Array.isArray(messages)) {
    return { ok: false, error: 'messages must be an array.' };
  }
  if (messages.length === 0) {
    return { ok: false, error: 'A conversation must include at least one message.' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: `Too many messages. Limit is ${MAX_MESSAGES} per request.` };
  }

  let totalChars = 0;
  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i];
    if (msg === null || typeof msg !== 'object') {
      return { ok: false, error: 'Each message must be an object with a role and content.' };
    }

    const { role, content } = msg;
    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
      return { ok: false, error: 'Each message must have a valid role (system, user, or assistant).' };
    }
    if (typeof content !== 'string') {
      return { ok: false, error: 'Each message content must be a string.' };
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        error: `A message is too long. Limit is ${MAX_MESSAGE_CHARS} characters per message.`,
      };
    }

    totalChars += content.length;
  }

  if (totalChars > MAX_TOTAL_CHARS) {
    return {
      ok: false,
      error: `Conversation is too large. Limit is ${MAX_TOTAL_CHARS} characters total.`,
    };
  }

  return { ok: true };
}

function writeSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function extractErrorMessage(error) {
  if (error == null) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function chunkStringByWords(text, maxWordsPerChunk = 6) {
  const words = text.split(/(\s+)/);
  const chunks = [];
  let current = '';
  let count = 0;

  for (const word of words) {
    current += word;

    if (!/^\s+$/.test(word)) count++;

    if (count >= maxWordsPerChunk) {
      chunks.push(current);
      current = '';
      count = 0;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lightweight per-instance rate limiting (best-effort, not global).
  const clientId = getClientIdentifier(req);
  const { allowed, retryAfter } = checkRateLimit(clientId);
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment and try again.',
    });
  }

  const { messages = [] } = req.body ?? {};

  const validation = validateConversation(messages);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const apiKey = process.env[PROVIDER_API_KEY_ENV];
  const useMock = !apiKey;

  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Connection', 'keep-alive');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  try {
    if (useMock) {
      const result = await generateTextMock({ messages });
      const text = result.text || '';

      writeSSE(res, { type: 'meta', mock: true });

      for (const chunk of chunkStringByWords(text)) {
        writeSSE(res, {
          type: 'chunk',
          text: chunk,
        });

        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      writeSSE(res, { type: 'done' });
      return res.end();
    }

    writeSSE(res, { type: 'meta', mock: false });

    const result = streamText({
      model: googleModel,
      system: AI_SYSTEM_PROMPT,
      messages,
      tools: {
        analyzeGithubProfile,
      },
      stopWhen: stepCountIs(4),
    });

    // Iterate the full event stream so we can surface both text deltas and the
    // tool-call lifecycle (input-streaming -> input-available -> output-available
    // / output-error) to the frontend via SSE for Phase 4 rendering.
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        if (part.text) {
          writeSSE(res, { type: 'chunk', text: part.text });
        }
        continue;
      }

      if (part.type === 'tool-input-start') {
        writeSSE(res, {
          type: 'tool-input-start',
          toolName: part.toolName,
          toolCallId: part.id,
        });
        continue;
      }

      if (part.type === 'tool-input-delta') {
        writeSSE(res, {
          type: 'tool-input-delta',
          toolName: part.toolName,
          toolCallId: part.id,
          delta: part.delta,
        });
        continue;
      }

      if (part.type === 'tool-call') {
        writeSSE(res, {
          type: 'tool-call',
          toolName: part.toolName,
          toolCallId: part.toolCallId,
          input: part.input,
        });
        continue;
      }

      if (part.type === 'tool-result') {
        writeSSE(res, {
          type: 'tool-result',
          toolName: part.toolName,
          toolCallId: part.toolCallId,
          output: part.output,
        });
        continue;
      }

      if (part.type === 'tool-error') {
        writeSSE(res, {
          type: 'tool-error',
          toolName: part.toolName,
          toolCallId: part.toolCallId,
          error: extractErrorMessage(part.error),
        });
        continue;
      }

      if (part.type === 'error') {
        writeSSE(res, {
          type: 'error',
          message: extractErrorMessage(part.error),
        });
        continue;
      }
    }

    writeSSE(res, { type: 'done' });
    return res.end();
  } catch (error) {
    console.error('Vercel AI chat error:', error);

    try {
      writeSSE(res, {
        type: 'error',
        message: 'AI generation failed. Please try again.',
      });
    } catch {
      // Response may already be closed.
    }

    return res.end();
  }
}
