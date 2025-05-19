import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import {
  activePositions,
  computeAndSell,
  Position
} from './trader.js';
import { WSOL_MINT } from './constants.js';

const TRAIL = Number(process.env.TRAIL_PCT ?? '0.2');
const POLL  = Number(process.env.POLL_MS ?? '30000');
const QUOTE = 'https://quote-api.jup.ag/v6/quote';

export function startPriceMonitor() {
  console.log(`[price] monitor started (${POLL} ms)`);
  setInterval(async () => {
    for (const [mint, pos] of activePositions) {
      try {
        const { data: routes } = await axios.get(QUOTE, {
          params: {
            inputMint: mint,
            outputMint: WSOL_MINT.toBase58(),
            amount: pos.amount.toString(),
            slippageBps: 50
          }
        });
        if (!routes?.length) continue;
        const best = routes[0];
        const price = Number(best.outAmount) / Number(best.inAmount);

        if (price > pos.peakPrice) pos.peakPrice = price;
        if (price <= pos.peakPrice * (1 - TRAIL)) {
          await computeAndSell(new PublicKey(mint), pos);
        } else {
          activePositions.set(mint, pos);
        }
      } catch (e) {
        console.error('[price] error', e);
      }
    }
  }, POLL);
}
