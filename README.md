# Onyx

Confidential payment operations for Solana teams.

Onyx lets teams send payroll, vendor payments, invoices, compliance reports, and treasury rebalances without exposing recipients, amounts, or schedules as plain public wallet activity.

- Frontend: https://onyx-red.vercel.app/
- Cloak docs index: `llms.txt`
- Architecture notes: `ARCHITECTURE.md`
- Cloak integration notes: `INTEGRATION.md`

## Problem

Every normal SOL, USDC, or USDT transfer on Solana is permanently public. Payroll runs expose contributor rates. Vendor payments expose commercial terms. Treasury operations expose strategy. Anyone can index it.

Onyx is for:

- DAOs and protocols paying contributors.
- Founders paying contractors and vendors.
- Treasury teams running rebalances or stablecoin operations.
- Finance and compliance leads who need auditability without public disclosure.

The product goal is not to hide records from the operator. It is to keep business payment details private by default while preserving scoped, intentional audit access.

## Why Cloak Is Central

Onyx uses Cloak as the privacy layer. The app is a frontend and workflow surface around Cloak SDK primitives; the confidential transfer semantics come from Cloak's shielded UTXO model, Groth16 proofs, relay, and viewing-key scan path.

The TypeScript SDK is used for:

| Onyx flow | Cloak SDK primitive | Why it matters |
|---|---|---|
| Private send | `transact()` then `fullWithdraw()` | Deposit into the shield pool, then pay out privately. |
| Payroll | `transact()` then repeated `partialWithdraw()` | One aggregate private deposit with per-recipient private payouts. |
| Residual recovery | `fullWithdraw()` | Reclaim leftover shielded UTXO balances after interrupted payroll. |
| Treasury rebalance | `transact()` then `swapWithChange()` | Shield SOL before privately swapping to supported SPL outputs. |
| Audit access | `generateCloakKeys()`, `expandSpendKey()`, `registerViewingKey()`, `scanTransactions()` | Derive/register Cloak viewing keys behind an opaque audit access token, then scan private history only when explicitly authorized. |
| Audit export | `toComplianceReport()` and `formatComplianceCsv()` | Convert scoped scan results into auditor-readable reports. |

The app keeps amount math in base units and `bigint`, follows SDK retry behavior for stale roots, and never asks users to paste private keys.

## Deployed Programs And Networks

| Network | Cloak program | Relay | Tokens |
|---|---|---|---|
| Devnet | `Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h` | `https://api.devnet.cloak.ag` | SOL, mock USDC |
| Mainnet | `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW` | `https://api.cloak.ag` | SOL, USDC, USDT |

The topbar network badge switches the client between Devnet and Mainnet. The selection is stored in localStorage and drives the wallet connection endpoint, token registry, local records, explorer links, Cloak relay/program selection, quotes, and scan requests.

## Features

| Route | Feature | What the user does |
|---|---|---|
| `/pay` | Private send | Enter recipient and amount, then sign shield deposit and payout transactions. |
| `/payroll` | Batch payroll | Upload CSV, validate rows, run private payouts, export receipts, recover residual UTXOs if needed. |
| `/team` | Recipient registry | Save wallets, defaults, notes, and recurring schedules per network. |
| `/history` | Ledger | Review browser-saved outbound receipts and scan for received Cloak payments. |
| `/treasury` | Private rebalance | Quote and execute shielded SOL to supported stablecoin outputs. |
| `/compliance` | Audit access desk | Create opaque audit access tokens for auditors without sharing raw viewing keys. |
| `/invoice` | Claim links | Create expiring payment request links with QR support. |
| `/claim` | Payer flow | Pay a request through the shielded route. |
| `/audit` | Auditor portal | Paste an opaque audit token and export scoped reports. |

## Setup

Prerequisites:

- Node 18+
- pnpm
- A browser wallet that supports Solana wallet standard or wallet-adapter.

Install:

```bash
pnpm install
```

Environment defaults work for Devnet. Create `.env.local` only when you need overrides:

```env
# Default client network. The app can still switch between Devnet and Mainnet at runtime.
NEXT_PUBLIC_SOLANA_CLUSTER=devnet

# Client RPC. Use a paid provider for production Mainnet.
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional websocket override.
# NEXT_PUBLIC_SOLANA_WS_URL=wss://api.devnet.solana.com

# Optional Cloak relay override for the default cluster.
# NEXT_PUBLIC_CLOAK_RELAY_URL=https://api.devnet.cloak.ag

# Server-side scan RPC. Recommended for production so scans do not consume browser RPC credits.
# CLOAK_SCAN_RPC_URL=https://your-server-rpc

# Required in production for sealed audit capability tokens.
# ONYX_AUDIT_TOKEN_SECRET=replace-with-a-random-server-only-secret

# Optional treasury quote configuration.
# JUPITER_QUOTE_URL=https://lite-api.jup.ag/swap/v1/quote
# JUPITER_API_KEY=your-jupiter-api-key
```

Run locally:

```bash
pnpm dev
```

Other scripts:

```bash
pnpm build
pnpm start
pnpm lint
pnpm test:pay
pnpm test:faucet
pnpm test:payroll
```

## RPC And SDK Status

The project currently uses:

- `@cloak.dev/sdk` `^0.1.6`
- `@cloak.dev/sdk-devnet` `0.1.5-devnet.1`
- `@solana/web3.js` `^1.98.0`

As of this update, the published npm versions for both Cloak packages match the installed versions. No SDK update is required for the network switch, modal, or docs changes.

RPC guidance:

- Devnet is fine with the default public RPC for basic testing.
- For a hackathon demo, you do not need separate Devnet and Mainnet RPC env vars. Set `NEXT_PUBLIC_SOLANA_CLUSTER` and `NEXT_PUBLIC_SOLANA_RPC_URL` for your default cluster; if the user switches to the other cluster, Onyx falls back to that cluster's public RPC.
- Mainnet should use a paid Helius, QuickNode, Triton, or equivalent RPC.
- Set `CLOAK_SCAN_RPC_URL` in production so audit/history scans use a server-side RPC budget.
- The app does not currently require `NEXT_PUBLIC_DEVNET_RPC_URL` or `NEXT_PUBLIC_MAINNET_RPC_URL`. Add those only if you want per-cluster paid RPC overrides later.
- Public Mainnet RPC is not recommended for production and may fail under browser-origin or rate-limit pressure.

## Architecture

See `ARCHITECTURE.md` for the full architecture. At a high level:

- Next.js App Router owns the UI, public pages, and API routes.
- `lib/solana/network.tsx` owns the active client network.
- `lib/solana/providers.tsx` wires wallet-adapter and `ConnectionProvider`.
- `lib/cloak/*` owns Cloak configuration, token registry, transaction hooks, viewing keys, invoices, and local receipts.
- API routes handle quote lookup, audit access token issue/scan/revoke/logs, and server-side received-payment scans.

## Security Notes

- Never expose `ONYX_AUDIT_TOKEN_SECRET`; it is server-only and must not use `NEXT_PUBLIC_`.
- Raw Cloak viewing-key material and NK values must not be logged.
- Audit access tokens are opaque capability tokens. A user creates one on `/compliance`, shares it with an auditor, and the auditor pastes it into `/audit` to scan/export only the approved scope.
- Audit access tokens can be revoked only within the active app-server runtime unless durable storage is added.
- Browser localStorage is used for team records, invoices, payment receipts, audit access metadata, and selected network.

## License

See `LICENSE`.
