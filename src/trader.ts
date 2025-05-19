import axios from 'axios';
import bs58 from 'bs58';
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction
} from '@solana/web3.js';
import 'dotenv/config';
import { WSOL_MINT } from './constants.js';

const { HELIUS_KEY, WALLET_PRIVATE_KEY } = process.env;
if (!HELIUS_KEY || !WALLET_PRIVATE_KEY)
  throw new Error('Missing env vars HELIUS_KEY or WALLET_PRIVATE_KEY');

const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`,
  'confirmed'
);

const secret = WALLET_PRIVATE_KEY.trim().startsWith('[')
  ? Uint8Array.from(JSON.parse(WALLET_PRIVATE_KEY))
  : bs58.decode(WALLET_PRIVATE_KEY);

const keypair = Keypair.fromSecretKey(secret);

export interface Position {
  entryPrice: number;
  peakPrice: number;
  amount: bigint;
  entryTime: number;
  mint: string;
  source: string;
}

export const activePositions = new Map<string, Position>();

const INPUT_SOL = 1_000_000_000n;
const SLIPPAGE_BPS = 50;
const QUOTE = 'https://quote-api.jup.ag/v6/quote';
const SWAP = 'https://quote-api.jup.ag/v6/swap';

export async function computeAndBuy(
  poolMint: PublicKey,
  source: string
) {
  try {
    const { data: routes } = await axios.get(QUOTE, {
      params: {
        inputMint: WSOL_MINT.toBase58(),
        outputMint: poolMint.toBase58(),
        amount: INPUT_SOL.toString(),
        slippageBps: SLIPPAGE_BPS
      }
    });
    if (!routes?.length) return;
    const best = routes[0];

    const { data } = await axios.post(SWAP, {
      quoteResponse: best,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true
    });

    const tx = VersionedTransaction.deserialize(
      Buffer.from(data.swapTransaction, 'base64')
    );
    tx.sign([keypair]);
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true
    });
    console.log('BUY', sig);

    const price = Number(best.outAmount) / Number(best.inAmount);
    activePositions.set(poolMint.toBase58(), {
      entryPrice: price,
      peakPrice: price,
      amount: BigInt(best.outAmount),
      entryTime: Date.now(),
      mint: poolMint.toBase58(),
      source
    });
  } catch (e) {
    console.error('computeAndBuy error', e);
  }
}

export async function computeAndSell(
  mint: PublicKey,
  pos: Position
) {
  try {
    const { data: routes } = await axios.get(QUOTE, {
      params: {
        inputMint: mint.toBase58(),
        outputMint: WSOL_MINT.toBase58(),
        amount: pos.amount.toString(),
        slippageBps: SLIPPAGE_BPS
      }
    });
    if (!routes?.length) return;
    const best = routes[0];

    const { data } = await axios.post(SWAP, {
      quoteResponse: best,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true
    });

    const tx = VersionedTransaction.deserialize(
      Buffer.from(data.swapTransaction, 'base64')
    );
    tx.sign([keypair]);
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true
    });
    console.log('SELL', sig);
    activePositions.delete(mint.toBase58());
  } catch (e) {
    console.error('computeAndSell error', e);
  }
}
