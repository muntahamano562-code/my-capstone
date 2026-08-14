import { streamText } from 'ai';
import { googleModel, AI_SYSTEM_PROMPT, PROVIDER_API_KEY_ENV } from '../server/config/aiConfig.js';
import { generateTextMock } from '../server/providers/mockProvider.js';

function writeSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
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
    });

    for await (const text of result.textStream) {
      if (text) {
        writeSSE(res, {
          type: 'chunk',
          text,
        });
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
