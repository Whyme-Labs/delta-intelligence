# Delta Intelligence

Delta turns Malaysian factory announcements into a traceable list of sites worth screening for rooftop solar. Each result links to a dated source, distinguishes the facility milestone from the publication date, and explains what to check before outreach. The current snapshot covers nine sites across Penang, Johor and Melaka.

For Telegraph Season II, the project uses the Apps & Agents track and maps to the Asset Management mission's research evidence workflow. A single bounded x402 request buys a ranked provider's search. The reported URLs select evidence from a separately checked source snapshot. Only an exact publisher and article path match can become a facility result.

## Run the desk

Use Node.js 20 or newer. From the project directory:

```sh
npm ci
npm start
```

Open [Delta Intelligence](http://127.0.0.1:4173). Try **Eppendorf before groundbreaking** to view the July lease announcement as of 1 November, or **Honda’s existing solar** to see the app flag a site for review before outreach. Click a result to inspect the primary-source excerpt, decision and source timeline. The desk exports the current research report as JSON.

Expand **Review Telegraph testnet purchases** to compare two actual network runs. The successful run traces the Eppendorf release to a dated screening result. The MKS run shows abstention when a miner returns only a publisher’s index. This viewer replays saved testnet evidence.

## Repeat the checks

```sh
npm test
npm run benchmark
npm run verify:sources
npm run telegraph
```

- The tests cover date cutoffs, aliases, Malay keywords, exact URLs, the solar hold rule and the payment policy.
- The local benchmark gives Delta 13/13 exact expected reports and literal matching 5/13. These are authored scenarios on the same curated corpus.
- The source audit re-fetches ten public releases and checks one short quote and the publication date anchor for each.
- The default Telegraph command fetches an unsigned live quote. It leaves wallet material alone and returns the live HTTP 402 offer.

## Reproduce the Telegraph purchase

Create a disposable Base Sepolia wallet and obtain test USDC from the [official Circle testnet faucet](https://faucet.circle.com/). Place the private key in a file with owner-only access. The project ignores `.sandbox/` and `.env` files. Use public research questions because the Telegraph query and test address may appear in the public signal feed.

```sh
DELTA_TEST_WALLET_FILE=.sandbox/base-sepolia-wallet.key npm run telegraph -- \
  --purchase --company Eppendorf \
  --query 'Find InvestPenang’s exact article titled Eppendorf Breaks Ground on New Production Site in Penang, Malaysia, dated 12 Nov 2026. Return the specific press-release article URL and the milestone it reports.' \
  --output .sandbox/telegraph-eppendorf-run.json
```

Each invocation accepts only one quote of up to 0.01 faucet USDC on Base Sepolia chain 84532, checks the documented test token and exact receiver, and sends one signed request. After delivery it checks the receipt fields, reads the token transfer from the chain and recomputes the Telegraph signal hash. Mining results can change over time. When the source cannot be matched, the script preserves the run evidence and exits with a nonzero status.

The verified Eppendorf purchase cost 0.01 faucet USDC. In the response TxLens returned the specific InvestPenang article, which matched the 12 November release and yielded an **Investigate** decision. The earlier MKS query cost 0.01 faucet USDC and yielded no result because the source was the MIDA press index. [Eppendorf transfer](https://sepolia.basescan.org/tx/0xfe24600c9ac411e55ee05fbc749ad87d51016655b4526821769369b6f6015906) · [Eppendorf signal](https://devnode.telegraphprotocol.com/engine/v1/signal/0x4eed05b61a281030c3f10b76e7c4d54ad6b08c72c1785c6f140b8696354f9af6) · [Raw evidence](app/telegraph-runs.json)

## Scope

The data is a manually curated Malaysian pilot. Common Malay terms help retrieve records whose primary releases are currently in English. Facility expansion is an intake signal. Qualification still needs site conditions, ownership, energy use and existing solar coverage. The local benchmark measures regression correctness and contains no external benchmark or customer outcome.

The browser and CLI are original to this repository. The CLI uses the x402 SDK and viem. Brief excerpts link to their original publishers. An earlier DeltaMiner experiment focused on evaluator preference pairs and has no runtime dependency here. [Telegraph x402 reference](https://anjoman.ai/docs/using/x402-inference) · [Submission worksheet](docs/telegraph-submission.md)
