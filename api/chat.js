import { streamText, stepCountIs } from 'ai';
import { googleModel, AI_SYSTEM_PROMPT, PROVIDER_API_KEY_ENV } from '../server/config/aiConfig.js';
import { generateTextMock } from '../server/providers/mockProvider.js';
import { analyzeGithubProfile } from '../server/tools/githubAnalysis.js';

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

  const { messages = [] } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'A conversation payload is required.',
    });
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
