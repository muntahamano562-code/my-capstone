async function run() {
  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'fetch streaming test' }] }),
    });
    console.log('status', res.status);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const s = decoder.decode(value, { stream: true });
      console.log('raw chunk:', JSON.stringify(s));
      buf += s;
    }
    console.log('complete buffer:', buf);
  } catch (err) {
    console.error('fetch error', err && err.stack ? err.stack : err);
  }
}

run();
