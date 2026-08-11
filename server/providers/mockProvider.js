// A clearly-labeled mock provider for development when Anthropic is unavailable.
// This file intentionally does not call any external API and returns
// deterministic, helpful responses suitable for local development and testing.

export async function generateTextMock({ messages }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const userContent = lastUser ? lastUser.content : '';

  // Simple heuristics to produce a plausible assistant reply during development.
  const lc = userContent.toLowerCase();
  let reply;

  if (!userContent) {
    reply = 'Hi — I am your mock AI Career Assistant. Ask me about what to learn next, skills review, or project suggestions.';
  } else if (lc.includes('learn')) {
    reply = 'Mock: Consider focusing on one core technology and one project that demonstrates measurable impact. For example, build a small dashboard using React and fetch real data to show analysis.';
  } else if (lc.includes('skill') || lc.includes('review')) {
    reply = 'Mock: Review your skill list and pick two areas to strengthen: technical communication and a hands-on project to demonstrate applied knowledge.';
  } else if (lc.includes('project')) {
    reply = 'Mock: A recommended project is a customer-feedback dashboard that highlights top themes and recommended next steps for product teams.';
  } else {
    reply = `Mock: I received your message: "${userContent}". I suggest clarifying what outcome you want, and I can recommend a concise next step.`;
  }

  // Return object shape similar to the real provider's response for easy swapping later.
  return { text: reply };
}

export default { generateTextMock };
