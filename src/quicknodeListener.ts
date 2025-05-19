import WebSocket from 'ws';
import bus from './bus.js';
import { PublicKey } from '@solana/web3.js';
import { PUMP_FUN_PROGRAM_IDS } from './constants.js';

const RECONNECT_MS = 5000;

export function startQuickNodeListener() {
  const url = process.env.QN_METIS_WS;
  if (!url) {
    console.warn('QN_METIS_WS not set — skipping mempool listener');
    return;
  }

  function connect() {
    const ws = new WebSocket(url);
    ws.on('open', () => {
      console.log('[Metis] connected');
      ws.send(
        JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'subscribe',
          params: {
            project: 'PROGRAM',
            accounts: PUMP_FUN_PROGRAM_IDS.map(pk => pk.toBase58())
          }
        })
      );
    });

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw.toString());
        const mint = msg?.params?.result?.tokenMint;
        if (mint && PublicKey.isOnCurve(new PublicKey(mint).toBuffer())) {
          bus.emit('mint:new', { mint, source: 'quicknode' });
        }
      } catch {}
    });

    ws.on('close', () => {
      console.warn('[Metis] closed — reconnecting');
      setTimeout(connect, RECONNECT_MS);
    });
    ws.on('error', err => {
      console.error('[Metis] error', err);
      ws.close();
    });
  }

  connect();
}
