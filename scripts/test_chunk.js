import { generateTextMock } from '../server/providers/mockProvider.js';

function chunkStringByWords(text, maxWordsPerChunk = 8) {
  const words = text.split(/(\s+)/);
  const chunks = [];
  let cur = '';
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    cur += words[i];
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

async function run() {
  const res = await generateTextMock({ messages: [{ role: 'user', content: 'test streaming output' }] });
  const text = res.text || '';
  console.log('text ->', text);
  const chunks = chunkStringByWords(text, 6);
  console.log('chunks count ->', chunks.length);
  console.log(chunks);
}

run();
