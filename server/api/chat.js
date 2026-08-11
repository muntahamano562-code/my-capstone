import express from 'express';
import { generateText } from 'ai';
import { claudeModel, AI_SYSTEM_PROMPT } from '../config/aiConfig.js';
import { generateTextMock } from '../providers/mockProvider.js';

const router = express.Router();

// Accept the current chat payload and forward it to Claude or a mock provider.
router.post('/', async (req, res) => {
  const { messages = [] } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'A conversation payload is required.' });
  }

  // If the Anthropic key is not configured, use the clearly-labeled mock provider.
  const useMock = !process.env.ANTHROPIC_API_KEY;

  try {
    if (useMock) {
      // Development mock path — returns an object with a `text` property.
      console.log('Using mock AI provider (no ANTHROPIC_API_KEY configured).');
      const result = await generateTextMock({ system: AI_SYSTEM_PROMPT, messages });
      return res.json({ message: result.text, mock: true });
    }

    // Production path — calls the Vercel AI runtime with the Anthropic provider.
    const result = await generateText({
      model: claudeModel,
      system: AI_SYSTEM_PROMPT,
      messages,
    });

    return res.json({ message: result.text, mock: false });
  } catch (error) {
    console.error('Chat API failed:', error);
    return res.status(500).json({ error: 'Unable to generate a career assistant response.' });
  }
});

export default router;
