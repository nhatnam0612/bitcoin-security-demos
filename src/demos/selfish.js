/**
 * Demo 02 — Selfish Mining Monte Carlo Simulation
 *
 * Implements the selfish mining strategy from:
 *   Eyal, I. & Sirer, E.G. (2014). "Majority is not Enough: Bitcoin Mining is Vulnerable"
 *   https://arxiv.org/abs/1311.0243
 *
 * State machine summary:
 *   - Attacker mines secretly, accumulating a lead (private chain length advantage).
 *   - When the honest network finds a block, the attacker decides whether to publish
 *     based on current lead and γ (fraction of honest miners the attacker can reach first).
 *   - Revenue is measured as fraction of total accepted blocks.
 *
 * Parameters:
 *   α  — attacker hashrate as fraction of total (0–0.49)
 *   γ  — attacker's network reach: probability to win a tie race (0–1)
 *   rounds — number of simulated mining events
 */

let smChart = null;

/**
 * Run the selfish mining simulation.
 * Returns { selfishBlocks, totalBlocks }.
 *
 * @param {number} alpha   - attacker hashrate fraction
 * @param {number} gamma   - network propagation advantage
 * @param {number} rounds  - number of mining events to simulate
 */
function selfishMiningRevenue(alpha, gamma, rounds) {
  let selfishBlocks = 0;
  let totalBlocks   = 0;
  let lead = 0;  // private chain lead over public chain

  for (let i = 0; i < rounds; i++) {
    if (Math.random() < alpha) {
      // Attacker finds a block → extend private chain
      lead++;
    } else {
      // Honest miner finds a block
      if (lead === 0) {
        // Attacker has no lead → honest block wins
        totalBlocks++;
      } else if (lead === 1) {
        // Tie: attacker publishes immediately, race decided by γ
        if (Math.random() < gamma) {
          selfishBlocks++;
        }
        totalBlocks++;
        lead = 0;
      } else {
        // Attacker is ahead: publish entire private chain, all blocks accepted
        selfishBlocks += lead + 1;
        totalBlocks   += lead + 1;
        lead = 0;
      }
    }

    // Safety: if lead grows very large, flush (avoids unbounded memory in long runs)
    if (lead > 10) {
      selfishBlocks += lead;
      totalBlocks   += lead;
      lead = 0;
    }
  }

  return { selfishBlocks, totalBlocks };
}

/** Update the selfish mining simulation and chart. */
function runSelfish() {
  const alpha  = parseInt(document.getElementById('sm-alpha').value) / 100;
  const gamma  = parseInt(document.getElementById('sm-gamma').value) / 100;
  const rounds = parseInt(document.getElementById('sm-rounds').value);

  const { selfishBlocks, totalBlocks } = selfishMiningRevenue(alpha, gamma, rounds);

  const selfishShare = totalBlocks > 0 ? selfishBlocks / totalBlocks : 0;
  const gain         = alpha > 0 ? selfishShare / alpha : 1;

  // Expected selfish mining revenue from Eyal & Sirer closed-form formula
  // R_selfish = α(1-α)²(4α+γ(1-2α)) - α³ / (1 - α(1+(2-α)α))
  // Simplified threshold: α > (1 - γ) / (3 - 2γ)
  const threshold = (1 - gamma) / (3 - 2 * gamma);
  const profitable = alpha > threshold;

  document.getElementById('sm-honest').textContent  = ((1 - alpha) * 100).toFixed(0) + '%';
  document.getElementById('sm-selfish').textContent = (selfishShare * 100).toFixed(1) + '%';
  document.getElementById('sm-gain').textContent    = gain.toFixed(2) + 'x';
  document.getElementById('sm-orphan').textContent  =
    Math.max(0, (selfishShare - alpha) * 100).toFixed(1) + '%';

  document.getElementById('sm-insight').textContent = profitable
    ? '⚠ with α=' + (alpha * 100).toFixed(0) + '% and γ=' + gamma.toFixed(2) +
      ', selfish mining is PROFITABLE — revenue share ' + (selfishShare * 100).toFixed(1) +
      '% exceeds invested hashrate ' + (alpha * 100).toFixed(0) + '%'
    : '✓ at α=' + (alpha * 100).toFixed(0) +
      '%, selfish mining is not yet profitable (threshold ≈ ' +
      (threshold * 100).toFixed(0) + '% at this γ). Increase α to see the attack.';

  // Chart: expected honest vs actual honest vs selfish
  const labels = ['expected honest', 'honest actual', 'selfish actual'];
  const data   = [
    ((1 - alpha) * 100),
    ((1 - selfishShare) * 100),
    (selfishShare * 100),
  ];
  const colors = ['#B5D4F4', '#378ADD', '#E24B4A'];

  if (smChart) smChart.destroy();
  const ctx = document.getElementById('smChart').getContext('2d');
  smChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + '%', font: { size: 10 } },
          grid: { color: 'rgba(128,128,128,0.1)' },
        },
        x: { ticks: { font: { size: 10 } } },
      },
    },
  });
}
