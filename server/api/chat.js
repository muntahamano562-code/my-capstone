import express from 'express';
import chatRouter from '../server/api/chat.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use('/', chatRouter);

export default app;