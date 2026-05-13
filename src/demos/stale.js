/**
 * Demo 04 — Stale Block Rate vs. Propagation Latency
 *
 * Models stale (orphan) block rate as a function of network propagation delay
 * and block interval. Based on the analysis in:
 *   Decker, C. & Wattenhofer, R. (2013).
 *   "Information Propagation in the Bitcoin Network"
 *   https://tik-old.ee.ethz.ch/file/49318d3f56c1d525aabf7fda78b23fc0/P2P2013_041.pdf
 *
 * Simple model:
 *   stale_rate ≈ propagation_delay / (block_interval + propagation_delay)
 *
 * This approximates the probability that two miners find a block within the
 * same propagation window, causing one to become an orphan.
 *
 * Effect on selfish mining:
 *   Higher stale rates lower the effective hashrate of the honest network,
 *   shifting the selfish mining profitability threshold downward.
 *   Adjusted threshold: α_threshold ≈ (1 - stale_rate) / (3 - stale_rate)
 */

let staleChart = null;

/**
 * Model stale block rate.
 *
 * @param {number} blockInterval - average seconds between blocks
 * @param {number} propDelay     - average block propagation delay in seconds
 * @returns {number}             - stale rate (0–1)
 */
function staleRateModel(blockInterval, propDelay) {
  return propDelay / (blockInterval + propDelay);
}

/** Read sliders, compute metrics, update UI. */
function updateStale() {
  const interval = parseFloat(document.getElementById('stale-interval').value);
  const prop     = parseFloat(document.getElementById('stale-prop').value);

  const rate           = staleRateModel(interval, prop);
  const effHashrate    = 1 - rate;
  const selfishThresh  = effHashrate / (3 - rate);  // adjusted threshold with stale blocks

  document.getElementById('stale-rate').textContent   = (rate * 100).toFixed(2) + '%';
  document.getElementById('stale-waste').textContent  = (rate * 100).toFixed(2) + '%';
  document.getElementById('stale-eff').textContent    = (effHashrate * 100).toFixed(1) + '%';
  document.getElementById('stale-thresh').textContent = (selfishThresh * 100).toFixed(1) + '%';

  updateStaleChart(interval);
}

/** Initialize the stale rate vs propagation delay chart. */
function initStaleChart() {
  const interval = parseFloat(document.getElementById('stale-interval').value);

  const labels = [];
  const data   = [];

  for (let d = 0.5; d <= 30; d += 0.5) {
    labels.push(d.toFixed(1));
    data.push(parseFloat((staleRateModel(interval, d) * 100).toFixed(3)));
  }

  if (staleChart) staleChart.destroy();

  const ctx = document.getElementById('staleChart').getContext('2d');
  staleChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'stale rate (%)',
        data,
        borderColor: '#378ADD',
        backgroundColor: 'rgba(55,138,221,0.07)',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          title: {
            display: true,
            text: 'propagation delay (seconds)',
            font: { size: 10 },
          },
          ticks: { maxTicksLimit: 10, font: { size: 10 } },
          grid: { color: 'rgba(128,128,128,0.08)' },
        },
        y: {
          title: {
            display: true,
            text: 'stale rate (%)',
            font: { size: 10 },
          },
          ticks: { callback: v => v + '%', font: { size: 10 } },
          grid: { color: 'rgba(128,128,128,0.08)' },
        },
      },
    },
  });

  updateStale();
}

/** Redraw chart data when the block interval slider changes. */
function updateStaleChart(interval) {
  if (!staleChart) return;

  const data = [];
  for (let d = 0.5; d <= 30; d += 0.5) {
    data.push(parseFloat((staleRateModel(interval, d) * 100).toFixed(3)));
  }

  staleChart.data.datasets[0].data = data;
  staleChart.update();
}
