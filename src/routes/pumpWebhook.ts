import express, { Router, Request, Response } from 'express';
import bus from '../bus.js';

const router = Router();
router.use(express.json({ limit: '1mb' }));

router.post('/pump-webhook', (req: Request, res: Response) => {
  const list = Array.isArray(req.body) ? req.body : [req.body];
  for (const tx of list) {
    if (tx.type === 'CREATE_TOKEN') {
      bus.emit('mint:new', { mint: tx.tokenMint, source: 'pumpfun' });
    }
  }
  res.sendStatus(200);
});

export default router;
