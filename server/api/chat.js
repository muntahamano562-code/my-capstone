import express from 'express';
import { generateText, streamText } from 'ai';
import { googleModel, AI_SYSTEM_PROMPT, PROVIDER_API_KEY_ENV } from '../config/aiConfig.js';
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
    void 0;
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

  const useMock = !process.env[PROVIDER_API_KEY_ENV];
  console.log('server: /api/chat useMock=', useMock, 'apiKeyPresent=', !!process.env[PROVIDER_API_KEY_ENV]);

  // Set SSE headers so the browser can stream
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  let closed = false;
  const abortController = new AbortController();

  let closedLogged = false;
  req.on('close', () => {
    closed = true;
    try {
      abortController.abort();
    } catch (e) {
      void e;
    }
    if (!closedLogged) {
      console.log('server: client connection closed');
      closedLogged = true;
    }
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

    // Production: non-mock path.
    // Send SSE meta before calling the provider
    writeSSE(res, { type: 'meta', mock: false });
    // Development-only debug event for the client (harmless)
    writeSSE(res, { type: 'debug', msg: 'starting-gemini-stream' });

    if (!process.env[PROVIDER_API_KEY_ENV]) {
      // Shouldn't happen because useMock would be true, but keep safe fallback
      const response = await generateText({ model: googleModel, system: AI_SYSTEM_PROMPT, messages });
      const fullText = response.text || '';
      const chunks = chunkStringByWords(fullText, 12);
      for (const chunk of chunks) {
        writeSSE(res, { type: 'chunk', text: chunk });
        await new Promise((r) => setTimeout(r, 80));
      }
      if (!closed) writeSSE(res, { type: 'done' });
      console.log('server: sent done, ending response');
      return res.end();
    }

    // Use the explicit `streamText` API and consume the text stream directly.
    try {
      console.log('server: calling streamText for request');
      const streamResult = streamText({
        model: googleModel,
        system: AI_SYSTEM_PROMPT,
        messages,
        abortSignal: abortController.signal,
      });

      console.log('server: awaiting textStream for request');
      for await (const text of streamResult.textStream) {
        console.log('server: got textStream chunk len=', text ? text.length : 0);
        if (!text || closed) continue;
        writeSSE(res, { type: 'chunk', text });
      }

      if (!closed) writeSSE(res, { type: 'done' });
      console.log('server: sent done, ending response');
      return res.end();
    } catch (err) {
      // If the request was aborted, end the stream quietly.
      if (abortController.signal.aborted) {
        return res.end();
      }
      // On any provider/stream error, surface a single SSE error event
      // and end the response. Do not silently fall back to the mock.
      console.error('Gemini streaming error:', err);
      try {
        if (!closed) writeSSE(res, { type: 'error', message: 'AI generation failed. Please try again.' });
      } catch (e) {
        void e;
      }
      return res.end();
    }
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
