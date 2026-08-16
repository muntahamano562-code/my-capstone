import express from 'express';
import chatHandler from '../../api/chat.js';

const router = express.Router();

// Forward all requests to the canonical serverless chat handler so the local
// Express dev server uses the exact same implementation as the deployment.
router.use(async (req, res) => {
  await chatHandler(req, res);
});

export default router;
