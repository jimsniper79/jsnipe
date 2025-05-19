import { PublicKey } from '@solana/web3.js';

export const PUMP_FUN_PROGRAM_IDS = [
  new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
  new PublicKey('TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM'),
  new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
] as const;

export const WSOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112'
);
