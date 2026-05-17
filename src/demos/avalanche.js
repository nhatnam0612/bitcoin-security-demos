/**
 * Demo 01 — Avalanche Effect / SHA-256 Diffusion
 *
 * This demo measures how strongly SHA-256 output changes when the input
 * changes only minimally. It computes the Hamming distance between two
 * 256-bit hash outputs.
 *
 * Two experiment modes are supported:
 *   1) Random 80-byte input + one flipped input bit
 *   2) Bitcoin-like 80-byte block header where only nonce is increased by 1
 *
 * The goal is to visualize the Avalanche Effect discussed in the theory:
 * for a strong hash function, a minimal input change should change about
 * 50% of the output bits, i.e. about 128 of 256 bits for SHA-256.
 */

let avalancheChart = null;
let avalancheRunning = false;

const AV_BIN_COUNT = 32;
const AV_BIN_MIN = 64;
const AV_BIN_MAX = 192;
const AV_BIN_WIDTH = (AV_BIN_MAX - AV_BIN_MIN) / AV_BIN_COUNT;

/** Browser SHA-256 over bytes. Returns Uint8Array(32). */
async function avalancheSha256Bytes(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(hash);
}

/** Double-SHA-256 over bytes. Returns Uint8Array(32). */
async function avalancheDoubleSha256Bytes(bytes) {
  const first = await avalancheSha256Bytes(bytes);
  return await avalancheSha256Bytes(first);
}

/** Hash bytes with selected method. */
async function avalancheHash(bytes, method) {
  return method === 'double'
    ? await avalancheDoubleSha256Bytes(bytes)
    : await avalancheSha256Bytes(bytes);
}

/** Convert bytes to hex string. */
function avalancheHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Count set bits in one byte. */
function avalanchePopcount8(x) {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

/** Hamming distance between two equal-length byte arrays. */
function avalancheHammingDistance(a, b) {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    dist += avalanchePopcount8(a[i] ^ b[i]);
  }
  return dist;
}

/** Create random bytes. */
function avalancheRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Return a copy with exactly one random bit flipped. */
function avalancheFlipOneBit(bytes) {
  const copy = new Uint8Array(bytes);
  const bitIndex = Math.floor(Math.random() * (copy.length * 8));
  const byteIndex = Math.floor(bitIndex / 8);
  const bitInByte = bitIndex % 8;
  copy[byteIndex] ^= (1 << bitInByte);

  return {
    bytes: copy,
    changed: 'flipped bit ' + bitIndex + ' (byte ' + byteIndex + ', bit ' + bitInByte + ')'
  };
}

/**
 * Build a simplified 80-byte Bitcoin-like block header:
 * 4 version + 32 prev_hash + 32 merkle_root + 4 timestamp + 4 bits + 4 nonce.
 * Only the nonce differs between A and B.
 */
function avalancheBitcoinLikeHeaders() {
  const prefix = avalancheRandomBytes(76);
  const nonce = Math.floor(Math.random() * 0xffffffff);

  const a = new Uint8Array(80);
  const b = new Uint8Array(80);
  a.set(prefix, 0);
  b.set(prefix, 0);

  const viewA = new DataView(a.buffer);
  const viewB = new DataView(b.buffer);
  viewA.setUint32(76, nonce, true);          // little-endian nonce
  viewB.setUint32(76, (nonce + 1) >>> 0, true);

  return {
    a,
    b,
    changed: 'nonce ' + nonce.toLocaleString() + ' → ' + ((nonce + 1) >>> 0).toLocaleString()
  };
}

/** Compute basic descriptive statistics. */
function avalancheStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((s, x) => s + x, 0) / n;
  const median = n % 2
    ? sorted[Math.floor(n / 2)]
    : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = values.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / n;

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[n - 1],
    std: Math.sqrt(variance),
    changedPct: (mean / 256) * 100
  };
}

/** Build histogram labels and bin counts. */
function avalancheHistogram(values) {
  const labels = [];
  const counts = Array(AV_BIN_COUNT).fill(0);

  for (let i = 0; i < AV_BIN_COUNT; i++) {
    const start = Math.round(AV_BIN_MIN + i * AV_BIN_WIDTH);
    const end = Math.round(start + AV_BIN_WIDTH - 1);
    labels.push(start + '–' + end);
  }

  values.forEach(v => {
    let idx = Math.floor((v - AV_BIN_MIN) / AV_BIN_WIDTH);
    idx = Math.max(0, Math.min(AV_BIN_COUNT - 1, idx));
    counts[idx]++;
  });

  return { labels, counts };
}

/** Draw histogram using Chart.js. */
function avalancheDrawChart(values) {
  const ctx = document.getElementById('avalancheChart').getContext('2d');
  const hist = avalancheHistogram(values);

  if (avalancheChart) avalancheChart.destroy();

  avalancheChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hist.labels,
      datasets: [{
        label: 'frequency',
        data: hist.counts,
        backgroundColor: '#378ADD',
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => 'Hamming distance ' + items[0].label + ' bits',
            label: item => item.raw + ' runs'
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Hamming distance in bits',
            font: { size: 10 },
          },
          ticks: { maxRotation: 60, minRotation: 60, font: { size: 9 } },
          grid: { display: false },
        },
        y: {
          title: {
            display: true,
            text: 'frequency',
            font: { size: 10 },
          },
          beginAtZero: true,
          ticks: { font: { size: 10 } },
          grid: { color: 'rgba(128,128,128,0.08)' },
        },
      },
    },
  });
}

/** Update metric cards. */
function avalancheUpdateMetrics(stats, lastDistance) {
  document.getElementById('av-mean').textContent = stats.mean.toFixed(3);
  document.getElementById('av-change').textContent = stats.changedPct.toFixed(2) + '%';
  document.getElementById('av-std').textContent = stats.std.toFixed(3);
  document.getElementById('av-last').textContent = lastDistance + ' bits';
  document.getElementById('av-median').textContent = stats.median.toFixed(0);
  document.getElementById('av-minmax').textContent = stats.min + ' / ' + stats.max;
}

/** Render one example pair of hashes. */
function avalancheRenderExample(example) {
  const hashA = avalancheHex(example.hashA);
  const hashB = avalancheHex(example.hashB);

  document.getElementById('av-example').innerHTML =
    '<span class="ok">// example run</span><br>' +
    '<span>change: ' + example.changed + '</span><br>' +
    '<span>distance: ' + example.distance + ' / 256 bits (' +
      ((example.distance / 256) * 100).toFixed(2) + '%)</span><br>' +
    '<span>hash A: ' + hashA.slice(0, 32) + '…' + hashA.slice(-16) + '</span><br>' +
    '<span>hash B: ' + hashB.slice(0, 32) + '…' + hashB.slice(-16) + '</span>';
}

/** Run one experiment and return {distance, hashA, hashB, changed}. */
async function avalancheRunSingle(mode, method) {
  let inputA;
  let inputB;
  let changed;

  if (mode === 'nonce') {
    const headers = avalancheBitcoinLikeHeaders();
    inputA = headers.a;
    inputB = headers.b;
    changed = headers.changed;
  } else {
    inputA = avalancheRandomBytes(80);
    const flipped = avalancheFlipOneBit(inputA);
    inputB = flipped.bytes;
    changed = flipped.changed;
  }

  const hashA = await avalancheHash(inputA, method);
  const hashB = await avalancheHash(inputB, method);
  const distance = avalancheHammingDistance(hashA, hashB);

  return { distance, hashA, hashB, changed };
}

/** Main button handler. */
async function runAvalancheDemo() {
  if (avalancheRunning) return;

  avalancheRunning = true;
  const btn = document.getElementById('av-run-btn');
  btn.textContent = 'running...';
  btn.disabled = true;

  const mode = document.getElementById('av-mode').value;
  const method = document.getElementById('av-hash').value;
  const runs = parseInt(document.getElementById('av-runs').value, 10);
  const values = [];
  let example = null;

  const log = document.getElementById('av-log');
  log.innerHTML =
    '<span class="ok">// running Avalanche Effect simulation</span><br>' +
    '<span>mode: ' + (mode === 'nonce' ? 'Bitcoin-like header, nonce + 1' : 'random 80-byte input, one-bit flip') + '</span><br>' +
    '<span>hash: ' + (method === 'double' ? 'Double-SHA-256' : 'SHA-256') + '</span><br>';

  for (let i = 0; i < runs; i++) {
    const result = await avalancheRunSingle(mode, method);
    values.push(result.distance);
    if (!example) example = result;

    if (i % 25 === 0 || i === runs - 1) {
      document.getElementById('av-progress-label').textContent =
        (i + 1).toLocaleString() + ' / ' + runs.toLocaleString() + ' experiments';
      document.getElementById('av-progress').style.width =
        (((i + 1) / runs) * 100).toFixed(1) + '%';
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const stats = avalancheStats(values);
  avalancheUpdateMetrics(stats, values[values.length - 1]);
  avalancheDrawChart(values);
  avalancheRenderExample(example);

  log.innerHTML +=
    '<span class="ok">✓ done — mean distance: ' + stats.mean.toFixed(3) +
    ' bits (' + stats.changedPct.toFixed(2) + '%)</span><br>' +
    '<span>// expected value for ideal diffusion: 128 bits = 50%</span><br>';

  btn.textContent = 'run simulation';
  btn.disabled = false;
  avalancheRunning = false;
}

/** Reset the demo UI. */
function resetAvalancheDemo() {
  avalancheRunning = false;
  document.getElementById('av-mean').textContent = '—';
  document.getElementById('av-change').textContent = '—';
  document.getElementById('av-std').textContent = '—';
  document.getElementById('av-last').textContent = '—';
  document.getElementById('av-median').textContent = '—';
  document.getElementById('av-minmax').textContent = '—';
  document.getElementById('av-progress').style.width = '0%';
  document.getElementById('av-progress-label').textContent = '0 experiments';
  document.getElementById('av-example').innerHTML =
    '<span style="color:var(--color-text-tertiary)">example hashes will appear here...</span>';
  document.getElementById('av-log').innerHTML =
    '<span class="ok">// Avalanche Effect demo — compare two almost identical inputs</span><br>' +
    '<span>// expected mean distance: about 128 / 256 bits</span><br>';

  if (avalancheChart) {
    avalancheChart.destroy();
    avalancheChart = null;
  }
}

/** Initialize once the page has loaded. */
function initAvalancheDemo() {
  if (!document.getElementById('av-log')) return;
  resetAvalancheDemo();
}
