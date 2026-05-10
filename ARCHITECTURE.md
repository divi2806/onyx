# Architecture

Onyx is a Next.js frontend and API workspace for private Solana finance operations. It composes wallet-adapter, Cloak SDK transaction primitives, local operational records, and server-side scan/audit endpoints into one app shell.

## Product Surfaces

| Surface | Route | Responsibility |
|---|---|---|
| App shell | `app/(app)/layout.tsx` | Sidebar, topbar, network switch, wallet guide modal. |
| Private send | `app/(app)/pay/page.tsx` | Single-recipient private transfer. |
| Payroll | `app/(app)/payroll/page.tsx` | CSV validation, batch execution, receipts, residual recovery. |
| Team | `app/(app)/team/page.tsx` | Local recipient registry and recurring schedules. |
| History | `app/(app)/history/page.tsx` | Local outbound records and received-payment scans. |
| Treasury | `app/(app)/treasury/page.tsx` | Shielded SOL rebalance into supported outputs. |
| Audit access | `app/(app)/compliance/page.tsx` | Cloak viewing-key derivation, relay registration, audit access token issue/export. |
| Invoice | `app/(app)/invoice/page.tsx` | Claim-link generation and invoice local records. |
| Claim | `app/claim/page.tsx` | Payer-facing shielded payment request flow. |
| Audit | `app/audit/page.tsx` | Auditor-facing opaque token scan/export portal. |

## Runtime Network Layer

`lib/solana/network.tsx` is the client-side network source of truth. It stores either `devnet` or `mainnet-beta` in localStorage and exposes:

- active cluster
- active RPC and websocket URL
- active Cloak program/relay config
- one-click switch helpers

`lib/solana/providers.tsx` uses that active config to key `ConnectionProvider`, so switching networks recreates the Solana connection cleanly.

Build-time env still provides the default cluster and default RPC:

- `NEXT_PUBLIC_SOLANA_CLUSTER`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_WS_URL`
- `NEXT_PUBLIC_CLOAK_RELAY_URL`

## Cloak Layer

`lib/cloak/config.ts` maps supported clusters to Cloak program IDs and relay URLs.

`lib/cloak/tokens.ts` maps supported tokens by cluster:

- Mainnet: SOL, USDC, USDT
- Devnet: SOL, Cloak mock USDC

Transaction hooks:

- `use-fast-send.ts` wraps `fastSendOnce()` for private send.
- `use-batch-payroll.ts` manages aggregate deposit, row payouts, progress, and residual UTXO persistence.
- `use-treasury-rebalance.ts` manages shield deposit plus `swapWithChange()`.

Support modules:

- `derive-nk.ts` derives the viewing key from wallet signatures.
- `viewing-keys.ts` stores local audit access metadata.
- `invoice.ts` encodes claim payloads and stores invoices.
- `payment-history.ts` stores outbound receipt rows.
- `scanned-history.ts` stores received-payment scan snapshots.
- `orphan-utxo-store.ts` stores recoverable payroll residual UTXOs.

## API Routes

| Route | Purpose |
|---|---|
| `app/api/treasury/quote/route.ts` | Quotes SOL to supported output mints through Jupiter-compatible quote APIs. |
| `app/api/scan-received/route.ts` | Runs server-side `scanTransactions()` for received-payment/history scans. |
| `app/api/audit/issue/route.ts` | Issues sealed audit capability tokens. |
| `app/api/audit/scan/route.ts` | Resolves audit tokens, enforces scope, scans Cloak, redacts output, exports CSV. |
| `app/api/audit/revoke/route.ts` | Revokes audit token IDs for the active server runtime. |
| `app/api/audit/logs/route.ts` | Returns active-runtime audit access logs. |
| `app/api/audit/inspect/route.ts` | Inspects public audit capability metadata. |

## Data Storage

Onyx currently uses browser localStorage for user-owned operational records:

- selected network
- team members
- recurring schedules
- payment receipts
- scanned received history
- invoices
- audit access metadata
- residual payroll UTXOs

Server-side audit revocation and logs are in-memory for the active runtime. Durable storage is the next production hardening step.

## Transaction Flow

Private send:

1. User enters recipient, amount, and token.
2. UI resolves the active cluster token registry.
3. `useFastSend()` calls `fastSendOnce()`.
4. `fastSendOnce()` deposits with `transact()`.
5. `fastSendOnce()` withdraws to recipient with `fullWithdraw()`.
6. The app stores local receipt rows with deposit and payout signatures.

Payroll:

1. User loads a CSV with wallet and amount.
2. Rows are validated locally.
3. `useBatchPayroll()` creates one aggregate shield deposit with `transact()`.
4. Each valid row is paid from shielded state with `partialWithdraw()`.
5. Residual change is persisted as a recoverable UTXO until all rows finish.
6. Receipts are written to local history and can be exported.

Treasury:

1. User enters shielded SOL input and output token.
2. API quotes output amount and minimum receive.
3. Hook deposits SOL into Cloak with `transact()`.
4. Hook executes private swap with `swapWithChange()`.
5. Receipt records deposit, swap signature, request id, state PDA, and nullifier.

Audit access:

1. Wallet signs deterministic Cloak sign-in message.
2. App derives NK and registers it with Cloak relay.
3. Server issues an opaque audit access token with immutable scope.
4. User shares that token with an auditor.
5. Auditor pastes it into `/audit` or scans through `/api/audit/scan`; server decrypts token, enforces scope, scans, redacts, and returns report/CSV.

## Production Caveats

- Use a paid Mainnet RPC for production.
- Set `CLOAK_SCAN_RPC_URL` for scan-heavy routes.
- Set `ONYX_AUDIT_TOKEN_SECRET` before issuing production audit tokens.
- Persist audit revocation/access logs before relying on revocation across deployments.
- Devnet mock USDC routes may not quote through public Jupiter APIs.
