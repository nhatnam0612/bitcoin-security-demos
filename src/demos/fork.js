/**
 * Demo 03 — Fork Races & Confirmation Security
 *
 * Computes double-spend success probability using the formula from:
 *   Nakamoto, S. (2008). "Bitcoin: A Peer-to-Peer Electronic Cash System"
 *   Section 11 — https://bitcoin.org/bitcoin.pdf
 *
 * The attacker starts mining a secret fork from the transaction block.
 * After the merchant accepts z confirmations, the attacker tries to
 * publish a longer chain. Success probability:
 *
 *   P(z, q) ≈ 1 - Σ_{k=0}^{z} [ Poisson(λ, k) · (1 - (q/p)^(z-k)) ]
 *   where λ = z · q/p,  p = 1 - q
 *
 * Parameters:
 *   q — attacker hashrate fraction
 *   z — number of confirmations merchant waits for
 */

let selectedConf = 1;

/**
 * Nakamoto double-spend success probability.
 *
 * @param {number} q  - attacker hashrate fraction (0–0.49)
 * @param {number} z  - confirmation depth
 * @returns {number}  - probability of successful double-spend (0–1)
 */
function nakamotoSuccess(q, z) {
  if (q >= 0.5) return 1.0;  // majority attacker always wins

  const p      = 1 - q;
  const lambda = z * (q / p);

  let sum = 0;
  for (let k = 0; k <= z; k++) {
    // Compute Poisson PMF: e^(-λ) · λ^k / k!
    let poisson = Math.exp(-lambda);
    for (let i = 0; i < k; i++) poisson *= lambda / (i + 1);

    sum += poisson * (1 - Math.pow(q / p, z - k));
  }

  return Math.max(0, 1 - sum);
}

/** Build the clickable confirmation depth grid. */
function buildConfirmGrid() {
  const grid = document.getElementById('confirm-grid');
  grid.innerHTML = '';

  for (let c = 1; c <= 6; c++) {
    const cell = document.createElement('div');
    cell.className = 'confirm-cell' + (c === selectedConf ? ' selected' : '');
    cell.onclick = () => { selectedConf = c; buildConfirmGrid(); updateFork(); };
    cell.innerHTML =
      '<div style="font-size:13px;font-weight:500;color:var(--color-text)">' + c + '</div>' +
      '<div style="color:var(--color-text-secondary)">' + (c === 1 ? 'conf' : 'confs') + '</div>';
    grid.appendChild(cell);
  }
}

/** Update metrics and chain visualization for current slider + confirmation selection. */
function updateFork() {
  const q    = parseInt(document.getElementById('fork-power').value) / 100;
  const z    = selectedConf;
  const prob = nakamotoSuccess(q, z);

  document.getElementById('fork-confs').textContent = z;
  document.getElementById('fork-prob').textContent  = (prob * 100).toFixed(3) + '%';

  const risk      = classifyRisk(prob);
  const riskColor = riskColor_(prob);
  document.getElementById('fork-risk').textContent  = risk;
  document.getElementById('fork-risk').style.color  = riskColor;
  document.getElementById('fork-prob').style.color  = riskColor;

  renderChain(q, z);
}

function classifyRisk(p) {
  if (p > 0.50) return 'critical';
  if (p > 0.10) return 'high';
  if (p > 0.01) return 'medium';
  if (p > 0.001) return 'low';
  return 'negligible';
}

function riskColor_(p) {
  if (p > 0.10) return 'var(--color-red)';
  if (p > 0.01) return 'var(--color-amber)';
  return 'var(--color-green)';
}

/** Render the chain diagram with honest and attacker blocks. */
function renderChain(q, z) {
  const chain = document.getElementById('fork-chain');
  chain.innerHTML = '';

  const addBlock = (label, sub, cls) => {
    const b = document.createElement('div');
    b.className = 'block ' + cls;
    b.innerHTML =
      '<div class="block-label">' + label + '</div>' +
      '<div class="block-sub">' + sub + '</div>';
    chain.appendChild(b);
  };

  const addArrow = () => {
    const a = document.createElement('span');
    a.className = 'chain-arrow';
    a.textContent = '→';
    chain.appendChild(a);
  };

  addBlock('#0', 'genesis', 'genesis');

  const depth = Math.max(z + 1, 4);
  for (let i = 1; i <= depth; i++) {
    addArrow();
    addBlock('#' + i, i <= z ? 'confirmed' : 'tip', 'main');
  }

  if (q > 0.1) {
    addArrow();
    addBlock('A1', 'secret', 'attacker');
    if (q > 0.25) {
      addArrow();
      addBlock('A2', 'secret', 'attacker');
    }
  }
}

/**
 * Simulate a fork race over 100 events and show a concrete chain state.
 * This is illustrative — not the same as the Nakamoto formula above,
 * but shows the visual dynamics of a fork developing.
 */
function simulateFork() {
  const q = parseInt(document.getElementById('fork-power').value) / 100;

  let honest   = 0;
  let attacker = 0;

  for (let i = 0; i < 100; i++) {
    if (Math.random() > q) honest++;
    else attacker++;
  }

  const chain = document.getElementById('fork-chain');
  chain.innerHTML = '';

  const addBlock = (label, sub, cls) => {
    const b = document.createElement('div');
    b.className = 'block ' + cls;
    b.innerHTML =
      '<div class="block-label">' + label + '</div>' +
      '<div class="block-sub">' + sub + '</div>';
    chain.appendChild(b);
  };

  const addArrow = () => {
    const a = document.createElement('span');
    a.className = 'chain-arrow';
    a.textContent = '→';
    chain.appendChild(a);
  };

  addBlock('#0', 'genesis', 'genesis');

  const showHonest   = Math.min(honest, 4);
  const showAttacker = Math.min(attacker, 3);

  for (let i = 1; i <= showHonest; i++) {
    addArrow();
    addBlock('#' + i, i === showHonest ? 'tip' : 'ok', 'main');
  }

  for (let i = 0; i < showAttacker; i++) {
    addArrow();
    addBlock('A' + (i + 1), i === 0 ? 'fork' : 'fork+' + i, 'attacker');
  }

  if (attacker > honest) {
    addArrow();
    addBlock('!!!', 'reorg!', 'orphan');
  }
}
