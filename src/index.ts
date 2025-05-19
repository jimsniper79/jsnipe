import 'dotenv/config';
import express, { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';

import pumpWebhook from './routes/pumpWebhook.js';
import bus from './bus.js';
import { computeAndBuy, activePositions } from './trader.js';
import { startQuickNodeListener } from './quicknodeListener.js';
import { startPriceMonitor } from './pricing.js';

const app = express();

app.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok' })
);

app.use('/', pumpWebhook);

app.get('/positions', (_req: Request, res: Response) =>
  res.json(Array.from(activePositions.values()))
);

bus.on('mint:new', async ({ mint, source }) => {
  try {
    const pk = new PublicKey(mint);
    console.log(`🔥 NEW MINT ${mint} via ${source}`);
    await computeAndBuy(pk, source);
  } catch (err) {
    console.error('mint:new handler error', err);
  }
});

startQuickNodeListener();
startPriceMonitor();

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.log(`Listening on :${PORT}`));
