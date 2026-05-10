# Cloak Integration

This document tracks how Onyx integrates Cloak SDK and Solana wallet/RPC infrastructure. It follows the guidance in `llms.txt`: use the TypeScript SDK for web/Node, keep amounts in base units, rely on SDK retry behavior, and never request raw private-key material.

## Dependencies

Current package versions:

- `@cloak.dev/sdk` `^0.1.6`
- `@cloak.dev/sdk-devnet` `0.1.5-devnet.1`
- `@solana/web3.js` `^1.98.0`
- `@solana/wallet-adapter-react` `^0.15.39`

`npm view` currently reports:

- `@cloak.dev/sdk`: `0.1.6`
- `@cloak.dev/sdk-devnet`: `0.1.5-devnet.1`

No SDK update is required for the current implementation.

## Network And RPC Integration

Default cluster comes from `NEXT_PUBLIC_SOLANA_CLUSTER`, but users can switch between Devnet and Mainnet from the topbar.

Client defaults:

| Cluster | RPC fallback | WS fallback |
|---|---|---|
| `devnet` | `https://api.devnet.solana.com` | `wss://api.devnet.solana.com` |
| `mainnet-beta` | `https://api.mainnet-beta.solana.com` | `wss://api.mainnet-beta.solana.com` |

Production recommendation:

- Use a paid RPC for Mainnet through `NEXT_PUBLIC_SOLANA_RPC_URL`.
- Use `CLOAK_SCAN_RPC_URL` for server-side scan endpoints.
- Keep Devnet on public RPC for basic testing unless scan volume is high.
- For hackathon/demo usage, one default `NEXT_PUBLIC_SOLANA_RPC_URL` is enough. The runtime network switch falls back to public RPC for the other cluster.
- Separate `NEXT_PUBLIC_DEVNET_RPC_URL` and `NEXT_PUBLIC_MAINNET_RPC_URL` env vars are not required by the current app. Add per-cluster overrides only if you want both clusters on paid RPC.

## Cloak Program And Relay Integration

| Cluster | Program ID | Relay |
|---|---|---|
| `devnet` | `Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h` | `https://api.devnet.cloak.ag` |
| `mainnet-beta` | `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW` | `https://api.cloak.ag` |

`lib/cloak/config.ts` exposes `getCloakConfig(cluster)`, used by:

- transaction hooks
- claim payments
- scan APIs
- audit scan APIs

## Token Registry

`lib/cloak/tokens.ts` keeps token support cluster-aware.

Mainnet:

- SOL: `NATIVE_SOL_MINT`
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

Devnet:

- SOL: `NATIVE_SOL_MINT`
- mock USDC: `61ro7AExqfk4dZYoCyRzTahahCC2TdUUZ4M5epMPunJf`

USDT is intentionally unavailable on Devnet.

## SDK Usage By Flow

Private send:

- `fast-send-core.ts`
- `use-fast-send.ts`
- SDK calls: `transact()`, `fullWithdraw()`

Payroll:

- `use-batch-payroll.ts`
- SDK calls: `createUtxo()`, `createZeroUtxo()`, `generateUtxoKeypair()`, `transact()`, `partialWithdraw()`
- Residual recovery uses `fullWithdraw()`.

Treasury:

- `use-treasury-rebalance.ts`
- SDK calls: `transact()`, `swapWithChange()`
- Quote route uses Jupiter-compatible APIs before execution.

Audit access:

- `derive-nk.ts`
- `compliance/page.tsx`
- audit API routes
- SDK calls: `generateCloakKeys()`, `expandSpendKey()`, `registerViewingKey()`, `scanTransactions()`, `toComplianceReport()`, `formatComplianceCsv()`
- User handoff: wallet owner creates an opaque audit access token, shares it with the auditor, and the auditor pastes it into `/audit` to scan/export only the approved scope.

Claim links:

- `invoice.ts`
- `claim/page.tsx`
- claim payload includes cluster so payers are switched to the invoice network before payment.

## Security Rules

- Do not log viewing keys, raw NK, wallet signatures, UTXO keypairs, or note payloads.
- It is acceptable to log public transaction signatures for receipts/debugging.
- Keep `ONYX_AUDIT_TOKEN_SECRET` server-only.
- Do not add `NEXT_PUBLIC_` to server secrets.
- Keep amount inputs as strings until conversion to `bigint` base units.
- Do not add custom stale-root retry loops unless there is a clear policy reason; the SDK already handles common retry cases.

## Integration Status

Implemented:

- Runtime Mainnet/Devnet switch.
- Cluster-aware token registry.
- Cluster-aware Cloak program/relay config.
- Private send through Cloak.
- Batch payroll through Cloak.
- Payroll residual recovery.
- Private treasury rebalance.
- Cloak viewing-key generation and relay registration.
- Opaque audit access token issue/scan/export.
- Invoice and claim payment flow.
- Local receipt/history storage per network.

Remaining production hardening:

- Durable audit revocation and access-log storage.
- Production Mainnet RPC configuration.
- More robust quote fallback for Devnet mock-token routes.
- Optional authenticated auditor identity on top of bearer audit tokens.
