import express from 'express';
import { generateText } from 'ai';
import { claudeModel, AI_SYSTEM_PROMPT } from '../config/aiConfig.js';
import { generateTextMock } from '../providers/mockProvider.js';

const router = express.Router();

// Helper to write an SSE event
function writeSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  // Attempt to flush so proxies/express don't buffer the chunk
  try {
    if (typeof res.flush === 'function') res.flush();
  } catch {
    // ignore flush errors
  }
}

// Stream helper: chunk a string into pieces (by words) for streaming.
function chunkStringByWords(text, maxWordsPerChunk = 8) {
  const words = text.split(/(\s+)/);
  const chunks = [];
  let cur = '';
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    cur += words[i];
    // count words, ignore whitespace tokens
    if (!/^\s+$/.test(words[i])) count++;
    if (count >= maxWordsPerChunk) {
      chunks.push(cur);
      cur = '';
      count = 0;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// Accept the current chat payload and forward it to Claude or a mock provider.
router.post('/', async (req, res) => {
  const { messages = [] } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'A conversation payload is required.' });
  }

  const useMock = !process.env.ANTHROPIC_API_KEY;

  // Set SSE headers so the browser can stream
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  let closed = false;
  req.on('close', () => {
    closed = true;
    console.log('server: client connection closed');
  });

  try {
    if (useMock) {
      const result = await generateTextMock({ messages });
      const text = result.text || '';
      const chunks = chunkStringByWords(text, 6);

      writeSSE(res, { type: 'meta', mock: true });

      for (const chunk of chunks) {
        writeSSE(res, { type: 'chunk', text: chunk });
        await new Promise((r) => setTimeout(r, 120));
      }

      if (!closed) writeSSE(res, { type: 'done' });
      return res.end();
    }

    // Production: non-mock path. Attempt to stream if the SDK supports it.
    // For compatibility, we call generateText and stream the result text as chunks.
    const response = await generateText({ model: claudeModel, system: AI_SYSTEM_PROMPT, messages });
    const fullText = response.text || '';
    const chunks = chunkStringByWords(fullText, 12);

    writeSSE(res, { type: 'meta', mock: false });

    console.log('server: starting prod chunk send loop');
    for (const chunk of chunks) {
        console.log('server: sending prod chunk ->', JSON.stringify(chunk));
      writeSSE(res, { type: 'chunk', text: chunk });
      // small delay to allow progressive rendering client-side
      await new Promise((r) => setTimeout(r, 80));
    }

    if (!closed) writeSSE(res, { type: 'done' });
    return res.end();
  } catch (error) {
    console.error('Chat streaming failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to generate a career assistant response.' });
    } else {
      // send an error event over the stream
      writeSSE(res, { type: 'error', message: 'Server failed to generate response.' });
      return res.end();
    }
  }
});

export default router;
