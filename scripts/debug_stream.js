import http from 'http';

const data = JSON.stringify({ messages: [{ role: 'user', content: 'test streaming output' }] });

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', res.headers);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('RAW CHUNK RECEIVED >>>');
    console.log(JSON.stringify(chunk));
    console.log('AS TEXT >>>');
    console.log(chunk);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e.message);
});

req.write(data);
req.end();
