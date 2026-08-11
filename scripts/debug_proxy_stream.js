import fetch from 'node-fetch';

async function run() {
  const url = 'http://localhost:5174/api/chat';
  const body = JSON.stringify({ messages: [{ role: 'user', content: 'What should I learn next?' }] });
  console.log('POSTING TO', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  console.log('STATUS', res.status, Object.fromEntries(res.headers.entries()));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('DONE');
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    console.log('RAW CHUNK >>>', JSON.stringify(chunk));
    buf += chunk;
  }
  console.log('COMPLETE BUFFER >>>', buf);
}

run().catch((err) => console.error('ERROR', err));
