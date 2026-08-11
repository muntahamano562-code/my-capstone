import dotenv from 'dotenv';
import express from 'express';
import chatRouter from './api/chat.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json({ limit: '1mb' }));
app.use('/api/chat', chatRouter);

app.listen(port, () => {
  console.log(`Career assistant API listening on http://localhost:${port}`);
});
