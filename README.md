# Onyx

**Confidential payment infrastructure for onchain teams.**

Onyx makes it possible to pay contributors, vendors, and contractors on Solana without publishing amounts, recipients, or schedules on the public ledger — while keeping full audit-ready records for the people you choose.

- **Website:** [useonyx.xyz](https://useonyx.xyz)
- **X:** [@UseOnyx](https://x.com/UseOnyx)

---

## The problem

Every SOL, USDC, and USDT transfer on Solana is permanently public. Any wallet that pays a contractor, runs a treasury rebalance, or runs weekly payroll is creating a permanent, indexed record of salaries, vendor rates, and financial strategy. Competitors, recruits, and MEV bots can all read it.

Privacy on Solana has historically required either custodial trust (hand your funds to a mixer) or complex operational work. Onyx removes both barriers.

**Who Onyx is for:**
- DAOs and protocols running contributor payroll (10–200+ recipients)
- Treasury teams executing buybacks, rebalances, or grant programs
- Founders paying contractors whose rates should stay off public dashboards
- Finance leads who need a full audit trail without exposing it to everyone

---

## How Onyx uses the Cloak SDK

Onyx is built entirely on [Cloak](https://docs.cloak.ag) — a UTXO-based shielded pool on Solana with Groth16 zero-knowledge proofs. The Cloak SDK (`@cloak.dev/sdk`) is not an optional dependency — it is the entire privacy layer.

### What Cloak provides

| Primitive | SDK function | What Onyx uses it for |
|---|---|---|
| Shielded deposit | `transact()` | Moving funds into the ZK pool |
| Shielded withdrawal | `fullWithdraw()` | Delivering funds to a recipient's wallet |
| UTXO keypairs | `generateUtxoKeypair()` | Creating ephemeral shielded notes |
| Viewing key derivation | `generateCloakKeys()` + `expandSpendKey()` | Deriving the NK from a wallet signature |
| Relay registration | `registerViewingKey()` | Registering the NK so chain notes are encrypted for the user |
| Compliance scan | `scanTransactions()` | Scanning the shielded pool with a viewing key |
| CSV export | `formatComplianceCsv(toComplianceReport())` | Producing audit-ready reports |

### Privacy model

A payment is never a direct account-to-account transfer. Every send goes through a two-phase ZK flow:

1. **Deposit.** The sender calls `transact()` with `externalAmount > 0`. A Groth16 proof is generated in the browser, verified on-chain, and a new shielded UTXO is added to the Merkle tree.
2. **Withdraw.** The SDK calls `fullWithdraw()` with `externalAmount < 0`. A second proof delivers funds to the recipient's ATA. On-chain, both steps are opaque — amounts, sender, and recipient are not revealed.

The on-chain Cloak program (`zh1eLd6r…6qRkW` on mainnet, `Zc1kHfp4…us27h` on devnet) verifies every proof, appends commitments to a 32-deep Merkle tree, and records nullifiers to prevent double-spending.

### Viewing key model (Scoped Compliance — Feature #1)

Onyx derives each user's viewing key (NK) from a deterministic wallet signature:

```
wallet.signMessage(SIGN_IN_MESSAGE)
  → generateCloakKeys(signature)
  → expandSpendKey(keys.spend.sk_spend)
  → nsk  ← this is the NK
```

The NK is registered with the Cloak relay via `registerViewingKey()`, which causes the relay to write chain notes encrypted to that NK for every future transaction by this wallet. The same NK is then used as `viewingKeyNk` in `scanTransactions()` to decrypt those notes during compliance scans.

**Scoped keys:** The NK is always the same for a given wallet. Scoping is implemented at the app layer — a shareable token encodes `{ nk, from, to, wallet }` as base64. When the auditor scans, the API passes `afterTimestamp`/`beforeTimestamp` directly to `scanTransactions()`, so only transactions in the authorised date range are returned. Revocation works by removing the token from the issuer's local store — the auditor can no longer produce new scans.

---

## Current network

By default the app runs on **devnet**.

| Network | Program ID | Relay |
|---|---|---|
| Devnet (default) | `Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h` | `https://api.devnet.cloak.ag` |
| Mainnet | `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW` | `https://api.cloak.ag` |

To switch to mainnet, add to `.env.local`:

```
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-helius-or-quicknode-rpc-url
```

---

## Features

### Working today

| Feature | Route | Description |
|---|---|---|
| Private send | `/pay` | Single-recipient shielded transfer. Groth16 proof generated in browser. |
| Batch payroll | `/payroll` | Multi-recipient disbursement via CSV. Each row is an independent shielded tx. |
| Team management | `/team` | Persistent recipient list with recurring payment schedules. |
| Payment ledger | `/history` | Full local history of outbound transfers. |
| Scoped viewing keys | `/compliance` | Derive NK → register with relay → issue date-scoped tokens for auditors. |
| Audit portal | `/audit` | Stateless auditor page: paste token → scan blockchain → view report → download CSV. |
| Invoice links | `/invoice` | Create shareable `/claim?v=…` links for privacy-preserving payment requests. |
| Claim page | `/claim` | Payer visits link, connects wallet, pays through the shielded pool. |

---

## Setup and running locally

### Prerequisites

- Node 18+
- pnpm (`npm install -g pnpm`)

### Install

```bash
git clone <repo>
cd onyx
pnpm install
```

### Environment (optional)

Create `.env.local` to override defaults:

```env
# Network (default: devnet)
NEXT_PUBLIC_SOLANA_CLUSTER=devnet

# RPC endpoint — use Helius or QuickNode for production
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Relay (defaults come from the SDK config, no override needed for standard use)
# NEXT_PUBLIC_CLOAK_RELAY_URL=https://api.devnet.cloak.ag

# Server-side RPC for scanning (isolates scan load from client RPC credits)
# CLOAK_SCAN_RPC_URL=https://your-server-rpc
```

### Run

```bash
pnpm dev      # http://localhost:3000
pnpm build    # production bundle
pnpm start    # serve production build
pnpm lint     # ESLint
```

---

## Architecture

```
app/
  (app)/          ← Sidebar layout, wallet-gated routes
    pay/          ← Single private send
    payroll/      ← Batch payroll (CSV)
    team/         ← Recipient management
    history/      ← Payment ledger
    compliance/   ← Viewing key generation + management
    invoice/      ← Create claim links
  audit/          ← Public auditor portal (no wallet required)
  claim/          ← Public payer page (wallet required to pay)
  api/
    scan-received/  ← Server-side scanTransactions() endpoint

lib/
  cloak/
    config.ts           ← Program IDs and relay URLs per cluster
    derive-nk.ts        ← SIGN_IN_MESSAGE → generateCloakKeys → expandSpendKey → NK
    fast-send-core.ts   ← transact() + fullWithdraw() orchestration
    use-batch-payroll.ts← Batch payroll hook
    viewing-keys.ts     ← Viewing key localStorage CRUD + token encode/decode
    use-viewing-keys.ts ← useSyncExternalStore hook for viewing keys
    invoice.ts          ← Invoice localStorage CRUD + claim link encode/decode
    tokens.ts           ← SOL/USDC/USDT mint registry per cluster
  solana/
    config.ts     ← Cluster + RPC URL from env
    providers.tsx ← WalletProvider + ConnectionProvider
```

---

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **TypeScript 5** strict
- **`@cloak.dev/sdk`** — shielded UTXO transactions, ZK proof generation, compliance scanning
- **`@solana/web3.js`** + `@solana/wallet-adapter-react` — RPC connection, wallet signing
- **Tailwind CSS 4** + shadcn/ui + Base UI primitives
- **Framer Motion** (`motion/react`) for page and component transitions
- **Hugeicons** (`@hugeicons/core-free-icons`) icon set

---

## License

[LICENSE](LICENSE)
