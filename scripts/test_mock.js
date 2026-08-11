import { generateTextMock } from '../server/providers/mockProvider.js';

async function run() {
  const res = await generateTextMock({ messages: [{ role: 'user', content: 'What should I learn next?' }] });
  console.log('mock provider result ->', res);
}

run();
