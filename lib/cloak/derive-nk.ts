import {
  expandSpendKey,
  generateCloakKeys,
  registerViewingKey,
  SIGN_IN_MESSAGE,
} from "@cloak.dev/sdk";
import { PublicKey } from "@solana/web3.js";

export type DeriveNkResult = {
  nsk: Uint8Array;
  nkHex: string;
};

/**
 * Derives the incoming-view base key (nsk / NK) for the connected wallet.
 *
 * Signs SIGN_IN_MESSAGE once — ed25519 is deterministic, so the same wallet
 * always produces the same NK without any server round-trip.
 */
export async function deriveNk(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<DeriveNkResult> {
  const msgBytes = new TextEncoder().encode(SIGN_IN_MESSAGE);
  const signature = await signMessage(msgBytes);
  // Full 64-byte ed25519 signature used as master seed; SDK hashes/KDFs internally.
  const keys = generateCloakKeys(signature);
  const expanded = expandSpendKey(keys.spend.sk_spend);
  const nkHex = Array.from(expanded.nsk)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { nsk: expanded.nsk, nkHex };
}

/**
 * Registers the NK with the Cloak relay so encrypted chain notes are written
 * for future transactions by this wallet.
 *
 * Non-critical: callers should catch and surface as a warning, not an error.
 */
export async function registerNkWithRelay(
  relayUrl: string,
  walletPublicKey: PublicKey,
  nsk: Uint8Array,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<void> {
  await registerViewingKey(relayUrl, walletPublicKey, nsk, signMessage);
}
