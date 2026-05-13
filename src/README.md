# Bitcoin Security Demos

Interactive browser-based demos for the research project:

> **Untersuchung der Sicherheitsaspekten im Bitcoin-Ökosystem**: von Hash-Funktionen und Proof-of-Work über Fork/Bestätigungs-Modellen und Selfish Mining bis zu Mining-Protokollen (Stratum v1/v2) und Light-Clients (SPV).

## Live Demos

Open `index.html` in any modern browser — no build step, no dependencies to install.

| Demo | Description |
|------|-------------|
| **01 · SHA-256 / PoW** | Real SHA-256 mining simulator using the browser Web Crypto API. Adjustable difficulty (leading zeros), live nonce iteration, hash rate display. |
| **02 · Selfish Mining** | Monte Carlo simulation of the Eyal & Sirer selfish mining attack. Adjustable attacker hashrate α and network reach γ. Shows revenue share vs. expected. |
| **03 · Forks & Confirmations** | Nakamoto double-spend success probability per confirmation depth, based on attacker hashrate. Visualizes blockchain fork races. |
| **04 · Stale Rate** | Models stale block rate as a function of propagation delay and block interval. Shows effective hashrate and selfish mining threshold shift. |
| **05 · Stratum v1 vs v2** | Side-by-side protocol message comparison. Shows JSON vs binary encoding, message sizes, and security properties of each version. |

## Structure

```
bitcoin-security-demos/
├── index.html              # Entry point — loads the full demo suite
├── README.md
├── src/
│   ├── demos/
│   │   ├── pow.js          # Demo 1: SHA-256 / Proof-of-Work
│   │   ├── selfish.js      # Demo 2: Selfish Mining Monte Carlo
│   │   ├── fork.js         # Demo 3: Fork races & confirmations
│   │   ├── stale.js        # Demo 4: Stale rate model
│   │   └── stratum.js      # Demo 5: Stratum v1/v2 protocol
│   ├── utils/
│   │   └── charts.js       # Shared Chart.js helpers
│   └── style.css           # All styles
└── docs/                   # (optional) paper / slides
```

## Background & Theory

### SHA-256 & Proof-of-Work
Bitcoin mining requires finding a nonce such that `SHA-256(SHA-256(header))` starts with a required number of leading zero bits. This demo uses the single-round `crypto.subtle.digest('SHA-256', ...)` Web Crypto API — the same 256-bit algorithm, just one round for simplicity.

**Difficulty** is expressed as the number of required leading zero hex digits (each = 4 bits). Real Bitcoin targets ~68 leading zero bits as of 2024.

### Selfish Mining (Eyal & Sirer, 2014)
An attacker with hashrate fraction α withholds found blocks and only publishes strategically. The simulation implements the state machine from the original paper. Profitability threshold:
- Without network advantage (γ=0): α > 1/3
- With full network reach (γ=1): α > 1/4

### Fork Security & Confirmations
Uses the Nakamoto (2008) formula for double-spend success probability given attacker hashrate q and confirmation depth z:

```
P(q, z) ≈ 1 - Σ_{k=0}^{z} [ Poisson(λ, k) · (1 - (q/p)^(z-k)) ]
where λ = z · q/p
```

### Stale Block Rate
Modelled as: `stale_rate ≈ propagation_delay / (block_interval + propagation_delay)`

Higher stale rates lower effective network hashrate and reduce the selfish mining profitability threshold.

### Stratum v1 vs v2
- **v1**: JSON-RPC over TCP, plaintext, pool controls transaction selection
- **v2**: Binary protocol, Noise_NX encryption, miners can select their own transactions via the Job Negotiator sub-protocol

## References

- Nakamoto, S. (2008). *Bitcoin: A Peer-to-Peer Electronic Cash System*
- Eyal, I. & Sirer, E.G. (2014). *Majority is not Enough: Bitcoin Mining is Vulnerable*
- Rosenfeld, M. (2011). *Analysis of Bitcoin Pooled Mining Reward Systems*
- BIP 320, BIP 22/23 (getblocktemplate)
- [Stratum V2 Specification](https://stratumprotocol.org)

## Usage for Presentations

The demo suite is designed for live conference presentation:
- Use fullscreen browser (`F11`)
- Each tab is a self-contained interactive demo
- All simulations run in real time — adjust sliders to show effects live
- No internet connection required after page load (Chart.js loaded from CDN; for offline use, see below)

### Offline use
Download Chart.js and update the `<script src>` in `index.html`:
```bash
curl -o src/chart.umd.js https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js
```
Then change the script tag to `<script src="src/chart.umd.js">`.

## License

MIT — free to use, modify, and present. Attribution appreciated.
