import { google } from '@ai-sdk/google';

// Provider configuration for the AI SDK (explicit and easy to review).
// Keep the model name and the system prompt in this configuration file.
export const PROVIDER_API_KEY_ENV = 'GOOGLE_GENERATIVE_AI_API_KEY';
export const PROVIDER_MODEL_ENV = 'GOOGLE_MODEL';

// Use env `GOOGLE_MODEL` when present; otherwise choose a verified, supported
// Gemini text-generation model discovered via the account's models list.
// (Updated to a supported model returned by the models endpoint.)
const MESSAGE_MODEL = process.env[PROVIDER_MODEL_ENV] || 'gemini-3.5-flash';
export const AI_SYSTEM_PROMPT = `You are an AI Career Assistant.

Your task is to provide practical career and learning guidance using profile context when it is available.

Rules:
- Help the user identify learning priorities, skill gaps, and portfolio or role-aligned project opportunities.
- Use profile information only when it is supplied in the conversation. Do not pretend to know a user's background or goals if they were not provided.
- When important context is missing, clearly say what information would help and recommend a small next step.
- Keep recommendations concise, realistic, and useful for a frontend internship capstone or early-career professional.`;

// Export a provider-specific model descriptor that the `ai` SDK will use.
// Using the Google provider and the model id from env or default.
export const googleModel = google(MESSAGE_MODEL);
