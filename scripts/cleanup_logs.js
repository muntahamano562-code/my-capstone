import fs from 'fs';
const paths = ['server_stream.log'];
for (const p of paths) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}
console.log('cleaned');
