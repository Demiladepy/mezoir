# Mezoir

**An intent-based agent that runs your full position in Mezo's ve-economy. You state your goal; Mezoir picks the venue, posts the action, and explains what it did.**

Built for the Mezo Hackathon 2026 — MEZO Track.

---

## Why Mezoir exists

Mezo's economy is genuinely powerful and genuinely complex. To earn well, a user has to understand veBTC, veMEZO, gauges, the matching market, epochs, boost ratios, and now a secondary marketplace for locked positions. Most people will never bother. They'll deposit BTC into a single passive vault and accept whatever it gives them.

Mezoir collapses all of that into one sentence: *what do you want?*

You say "maximize my BTC yield" or "I'm MEZO-heavy, optimize my voting returns." Mezoir reads the state of every gauge, every incentive, every listing on the secondary market, and decides — every epoch — what to do with your capital. It executes on your behalf and explains its reasoning in plain English.

> *"As software agents become more capable of executing financial actions independently, they will need reliable settlement layers and programmable access to capital. This places Mezo at the intersection of BitcoinFi and the emerging agent economy."*
> — Supernormal Foundation, Mezo 2026 Roadmap

Mezoir is one such agent.

---

## How it works

**1. Connect.** Wallet connects via Mezo Passport — supports both native Bitcoin wallets and EVM wallets.

**2. State your intent.** Choose from preset strategies or describe a custom goal:
- *Maximize my BTC-denominated yield*
- *Maximize my returns from voting (MEZO-heavy)*
- *Balanced — optimize across both*
- *Park me defensively*
- Or describe your own constraints

**3. Authorize and set guardrails.** Approve Mezoir's contracts. Set limits — max % of position to deploy, alert thresholds, manual-approval thresholds for big moves.

**4. Done.** Mezoir runs every epoch. You get a weekly summary explaining what happened and why.

---

## What Mezoir actually does

Mezoir operates across two venues, picking the optimal action each epoch.

### Matching market (Matchbox)
- Locks BTC and MEZO into veBTC and veMEZO positions
- Pairs them for self-boost
- Posts incentives on its own gauge to attract veMEZO votes (BTC-heavy strategies)
- Votes veMEZO on the highest-paying gauges (MEZO-heavy strategies)

### Secondary marketplace (veNFT trading)
- Buys discounted veBTC or veMEZO NFTs when expected return beats locking new tokens
- Sells positions when overpriced relative to remaining yield
- Arbitrages between venues when their pricing diverges

The interesting decision is venue selection — *should I lock new BTC, or buy a veBTC NFT trading at a discount?* That's a math problem Mezoir solves continuously, with reasoning the user can read.

---

## Differentiation

|  | Boar Finance | Plain veNFT marketplace | **Mezoir** |
|---|---|---|---|
| What it does | Auto-votes veBTC | Lists veNFTs | Operates across both venues |
| Strategies | One (BTC-heavy) | None | Multiple, intent-based |
| Action space | Vote allocation | Buy/sell only | Lock, vote, post incentives, buy, sell, arbitrage |
| Customization | None | None | Personalized to user intent |
| Decision logic | Fee/emission rebalancing | None | Reasons over goals; selects venue and action |

Mezoir is the only product on Mezo that operates across the full ve-economy with personalized intent.

---

## What "agent" means here, technically

The word "AI agent" is overused. Mezoir earns it by doing things a deterministic auto-compounder cannot:

1. **Interprets intent.** Translates "maximize BTC yield while staying balanced" into specific weights and constraints.
2. **Reasons about tradeoffs.** When two gauges have similar yields but different risk profiles, it decides.
3. **Adapts to changing conditions.** When BTC volatility spikes or a competing gauge raises incentives, it re-reasons.
4. **Selects venue.** Chooses between matching market and secondary market each epoch based on expected return.
5. **Explains itself.** Every decision comes with a natural-language rationale the user can read.

The reasoning is the product. Without it, this is just another vault.

---

## Architecture

```
Frontend (Next.js, Vercel)
      ↓
Agent service (Python, LangGraph) — interprets intent, reasons, decides
      ↓
On-chain executor (Solidity contracts on Mezo Matsnet) — performs actions
      ↑
Goldsky subgraphs — historical gauge, voting, fee data
Tenderly simulations — pre-execution validation of every action
```

### Built with
- **Mezo Passport** — wallet connection (BTC + EVM)
- **Boar Network RPC** — dedicated Mezo endpoint
- **Goldsky** — subgraph indexing for historical context
- **Tenderly** — simulation before every on-chain action
- **LangGraph + Claude** — reasoning state machine and natural-language explanation

---

## Demo

A 60-second walkthrough showing Mezoir reasoning across both venues, executing on Matsnet, and explaining its decision in natural language.

→ Live demo: *(deployed link)*
→ Demo video: *(loom link)*
→ Contracts on Matsnet: *(explorer link)*

---

## Roadmap beyond the hackathon

**v0.1 (this submission):** Single-user agent. Two venues. Three preset strategies + custom intent.

**v0.2:** Cross-chain onboarding. User shows up with capital on Solana / Ethereum / Base; Mezoir bridges and deploys without the user touching Mezo's UI.

**v0.3:** Strategy marketplace. Other builders deploy Mezoir-compatible strategies; users pick from a library. Strategy authors earn a fee.

**v1.0:** Mezoir becomes the default execution layer for the Mezo ve-economy. Routes flow into Boar, Acre, Matchbox, and the secondary market; users never see the underlying complexity.

---

## Repository structure

```
mezoir/
├── contracts/        # Solidity — agent execution layer
├── agent/            # Python — LangGraph reasoning service
├── web/              # Next.js — frontend
└── README.md
```

---

## Status

Built during the Mezo Hackathon 2026, April–May 2026. Currently on Mezo Matsnet. Mainnet deployment pending audit.

---

## Acknowledgements

Mezoir is built on primitives shipped by the Mezo team and community: Matchbox, the matching market, veBTC and veMEZO. It routes votes to Boar Finance's gauge as one of its strategies. Special thanks to Rod, Pyke, and the Mezo team for direct guidance during the build.

---

## Getting Started (Day 1)

### 1) Contracts (`contracts/`)

Create env file:

```bash
cp .env.example .env
```

Required envs in `contracts/.env`:

- `MATSNET_RPC_URL`
- `DEPLOYER_PRIVATE_KEY` (hex, no 0x prefix for `vm.envUint`)
- `INITIAL_GREETING` (example: `hello mezoir`)

Foundry setup (recommended, local install):

```bash
./tools/foundry/forge.exe build
./tools/foundry/forge.exe script script/DeployHelloMezoir.s.sol:DeployHelloMezoir \
  --rpc-url $MATSNET_RPC_URL \
  --sender <YOUR_WALLET_ADDRESS> \
  --broadcast
```

Optional Matsnet smoke transaction (self-transfer with cast):

```bash
./tools/foundry/cast.exe send <YOUR_WALLET_ADDRESS> --value 1wei \
  --rpc-url $MATSNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

PowerShell variant:

```powershell
$env:MATSNET_RPC_URL="<your_boar_rpc_url>"
$env:DEPLOYER_PRIVATE_KEY="<your_private_key_no_0x_prefix>"
$env:INITIAL_GREETING="hello mezoir"
./tools/foundry/forge.exe build
./tools/foundry/forge.exe script script/DeployHelloMezoir.s.sol:DeployHelloMezoir --rpc-url $env:MATSNET_RPC_URL --sender <YOUR_WALLET_ADDRESS> --broadcast
./tools/foundry/cast.exe send <YOUR_WALLET_ADDRESS> --value 1wei --rpc-url $env:MATSNET_RPC_URL --private-key $env:DEPLOYER_PRIVATE_KEY
```

### 2) Agent service (`agent/`)

Create env file and install deps:

```bash
cp .env.example .env
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

Run server:

```bash
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Smoke test:

```bash
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/echo -H "Content-Type: application/json" -d "{\"text\":\"hello mezoir\"}"
```

### 3) Web app (`web/`)

Create env file:

```bash
cp .env.example .env
```

Set (in `web/.env`; see `web/.env.example`):

- `VITE_APP_NAME=Mezoir`
- `VITE_WALLETCONNECT_PROJECT_ID=<your_project_id>`
- `VITE_AGENT_URL=http://localhost:8001` (or the URL where the agent listens)

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and click `Connect Wallet`.

### 4) Day 1 validation checklist

- [x] Repo skeleton created and pushed
- [x] Agent scaffold runs (`/health`, `/echo`)
- [x] Web scaffold runs with Mezo Passport connect UI
- [ ] Matsnet faucet funding (manual, wallet-specific)
- [ ] Matsnet explorer balance verification (manual)
- [ ] Live Matsnet smoke transaction hash recorded
- [ ] Foundry deploy to Matsnet executed with local credentials
```