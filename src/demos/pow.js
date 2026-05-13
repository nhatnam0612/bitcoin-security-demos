/**
 * Demo 01 — SHA-256 / Proof-of-Work Mining Simulator
 *
 * Uses the browser Web Crypto API (crypto.subtle.digest) to compute
 * real SHA-256 hashes. The mining loop iterates the nonce until the
 * resulting hash has the required number of leading zero hex digits
 * (each hex digit = 4 bits of difficulty).
 *
 * Note: Bitcoin uses double-SHA-256 over the 80-byte block header.
 * This demo uses single-round SHA-256 over a text string for clarity,
 * but the hash output is identical in structure and security.
 */

let miningActive = false;
let miningNonce = 0;
let miningStart = 0;

/** Compute SHA-256 of a UTF-8 string, return hex string (64 chars = 256 bits). */
async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Toggle mining on/off. */
function toggleMining() {
  if (miningActive) stopMining();
  else startMining();
}

function startMining() {
  miningActive = true;
  miningStart = Date.now();
  document.getElementById('pow-mine-btn').textContent = '⏹ stop mining';
  document.getElementById('pow-status').textContent = 'mining...';
  document.getElementById('pow-status').style.color = 'var(--color-amber)';
  mineStep();
}

function stopMining() {
  miningActive = false;
  document.getElementById('pow-mine-btn').textContent = '▶ start mining';
  document.getElementById('pow-status').textContent = 'stopped';
  document.getElementById('pow-status').style.color = 'var(--color-text-secondary)';
}

function resetMining() {
  stopMining();
  miningNonce = 0;
  document.getElementById('pow-nonce').textContent = '0';
  document.getElementById('pow-hps').textContent = '—';
  document.getElementById('pow-zeros').textContent = '0';
  document.getElementById('pow-hash').innerHTML =
    '<span style="color:var(--color-text-tertiary)">hash will appear here...</span>';
  document.getElementById('pow-progress').style.width = '0%';
  document.getElementById('pow-progress-label').textContent = '0 hashes attempted';
  document.getElementById('pow-status').textContent = 'idle';
  document.getElementById('pow-status').style.color = 'var(--color-text-secondary)';
  document.getElementById('pow-log').innerHTML =
    '<span class="ok">// reset — ready to mine</span><br>';
}

/**
 * Mine one batch of hashes asynchronously.
 * We process batchSize hashes per JS task to keep the UI responsive.
 * After each batch, we yield back to the event loop via setTimeout(0).
 */
async function mineStep() {
  if (!miningActive) return;

  const diff     = parseInt(document.getElementById('pow-diff').value);
  const data     = document.getElementById('pow-data').value;
  const target   = '0'.repeat(diff);
  const batchSize = 80;

  for (let i = 0; i < batchSize; i++) {
    const input = data + ':' + miningNonce;
    const hash  = await sha256(input);
    miningNonce++;

    const elapsed = (Date.now() - miningStart) / 1000;
    const hps     = elapsed > 0 ? Math.round(miningNonce / elapsed) : 0;
    const leadingZeros = hash.match(/^0*/)[0].length;

    // Update UI
    document.getElementById('pow-nonce').textContent  = miningNonce.toLocaleString();
    document.getElementById('pow-hps').textContent    = hps > 1000 ? (hps / 1000).toFixed(1) + 'k' : hps;
    document.getElementById('pow-zeros').textContent  = leadingZeros;

    // Progress bar — probabilistic estimate
    const expected = Math.pow(16, diff);
    const pct = Math.min(100, (miningNonce / expected) * 100 * 3);
    document.getElementById('pow-progress').style.width = pct.toFixed(1) + '%';
    document.getElementById('pow-progress-label').textContent =
      miningNonce.toLocaleString() + ' hashes attempted';

    // Hash display with colored leading zeros
    const zeroSpan = '<span class="hash-zero">' + hash.slice(0, leadingZeros) + '</span>';
    const restSpan = '<span class="hash-rest">' + hash.slice(leadingZeros) + '</span>';
    document.getElementById('pow-hash').innerHTML =
      'nonce: ' + miningNonce +
      '<br>input: ' + (input.length > 48 ? input.slice(0, 48) + '…' : input) +
      '<br>hash:  ' + zeroSpan + restSpan;

    // Check if we found a valid block
    if (hash.startsWith(target)) {
      document.getElementById('pow-status').textContent = '✓ found!';
      document.getElementById('pow-status').style.color = 'var(--color-green)';

      const log = document.getElementById('pow-log');
      log.innerHTML +=
        '<span class="ok">✓ BLOCK FOUND at nonce ' + miningNonce.toLocaleString() + '</span><br>' +
        '<span>  hash:   ' + hash + '</span><br>' +
        '<span class="warn">  effort: ~' + miningNonce.toLocaleString() + ' hashes, ' +
        elapsed.toFixed(1) + 's</span><br>';
      log.scrollTop = log.scrollHeight;

      stopMining();
      return;
    }
  }

  // Yield to the event loop, then continue
  if (miningActive) setTimeout(mineStep, 0);
}
