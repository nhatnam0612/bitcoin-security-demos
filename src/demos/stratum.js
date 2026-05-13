/**
 * Demo 05 — Stratum v1 vs v2 Protocol Comparison
 *
 * Stratum v1: JSON-RPC over TCP, no encryption, pool controls transaction selection.
 * Stratum v2: Binary protocol, Noise_NX encryption, miner-side tx selection via
 *             the Job Negotiator sub-protocol.
 *
 * References:
 *   - Stratum v1 (informal spec): https://en.bitcoin.it/wiki/Stratum_mining_protocol
 *   - Stratum v2 specification:   https://stratumprotocol.org/specification/
 *   - BIP 320 (nVersion bits for mining): https://github.com/bitcoin/bips/blob/master/bip-0320.mediawiki
 *
 * Message flows shown here are illustrative but structurally accurate.
 * Real v2 messages are binary-encoded with fixed-width fields; the text
 * representations here use a readable bracket notation.
 */

/**
 * Message flow definitions for each Stratum message type.
 * Each entry has:
 *   v1[]     — v1 JSON messages (type: send | recv | warn)
 *   v2[]     — v2 binary message representations
 *   v1size   — approximate v1 message size description
 *   v2size   — approximate v2 message size description
 */
const STRATUM_MESSAGES = {
  subscribe: {
    v1: [
      {
        type: 'send',
        text: '{"id":1,"method":"mining.subscribe","params":["cgminer/4.0.0",null]}',
      },
      {
        type: 'recv',
        text: '{"id":1,"result":[[["mining.set_difficulty","sub1"],["mining.notify","sub1"]],"1a2b3c4d",4],"error":null}',
      },
    ],
    v2: [
      {
        type: 'send',
        text: '[SetupConnection] flags=0x01 min_version=2 max_version=2 vendor="Bitmain" hw_version="S19Pro" firmware="bosMiner/0.7"',
      },
      {
        type: 'recv',
        text: '[SetupConnection.Success] used_version=2 flags=0x00',
      },
    ],
    v1size: '~180 bytes (JSON, plaintext TCP)',
    v2size: '~28 bytes (binary, Noise_NX encrypted channel)',
  },

  authorize: {
    v1: [
      {
        type: 'send',
        text: '{"id":2,"method":"mining.authorize","params":["worker1.miner1","x"]}',
      },
      {
        type: 'recv',
        text: '{"id":2,"result":true,"error":null}',
      },
    ],
    v2: [
      {
        type: 'send',
        text: '[OpenStandardMiningChannel] request_id=1 user_id="worker1" nominal_hash_rate=1.0e14',
      },
      {
        type: 'recv',
        text: '[OpenStandardMiningChannel.Success] channel_id=0 target=0x0000ffff00000000000000000000000000000000000000000000000000000000 extranonce_prefix=0x1a2b3c4d',
      },
    ],
    v1size: '~90 bytes',
    v2size: '~24 bytes',
  },

  notify: {
    v1: [
      {
        type: 'warn',
        text: '// ⚠ pool controls full transaction selection — miner has no visibility or choice',
      },
      {
        type: 'recv',
        text: '{"method":"mining.notify","params":["job01","prevhash_64hex","coinbase1_hex","coinbase2_hex",["branch1","branch2","branch3"],"20000000","1703a30c","64f1a3c2",true]}',
      },
    ],
    v2: [
      {
        type: 'recv',
        text: '[NewMiningJob] channel_id=0 job_id=42 future_job=false version=0x20000000 merkle_root=0xabc123...',
      },
      {
        type: 'send',
        text: '[// Job Negotiator sub-protocol: miner requests tx template from Template Provider, builds own coinbase, selects mempool txs independently of pool]',
      },
    ],
    v1size: '~400 bytes per job (full merkle branches)',
    v2size: '~70 bytes (merkle root only; tx selection is separate)',
  },

  submit: {
    v1: [
      {
        type: 'send',
        text: '{"id":4,"method":"mining.submit","params":["worker1","job01","00000000","64f1a3c2","3f2a1b0c"]}',
      },
      {
        type: 'recv',
        text: '{"id":4,"result":true,"error":null}',
      },
    ],
    v2: [
      {
        type: 'send',
        text: '[SubmitSharesStandard] channel_id=0 seq_num=1 job_id=42 nonce=0x3f2a1b0c ntime=0x64f1a3c2 version=0x20000000',
      },
      {
        type: 'recv',
        text: '[SubmitSharesSuccess] channel_id=0 last_seq_num=1 new_submits_accepted=1 new_shares_sum=512',
      },
    ],
    v1size: '~120 bytes',
    v2size: '~20 bytes',
  },

  difficulty: {
    v1: [
      {
        type: 'recv',
        text: '{"method":"mining.set_difficulty","params":[512]}',
      },
    ],
    v2: [
      {
        type: 'recv',
        text: '[SetTarget] channel_id=0 maximum_target=0x0000ffff00000000000000000000000000000000000000000000000000000000',
      },
    ],
    v1size: '~50 bytes',
    v2size: '~10 bytes',
  },
};

/** Render the message flow for the currently selected message type. */
function showStratumMsg() {
  const key = document.getElementById('stratum-msg').value;
  const msg = STRATUM_MESSAGES[key];

  const v1flow = document.getElementById('v1-flow');
  const v2flow = document.getElementById('v2-flow');

  v1flow.innerHTML = '';
  v2flow.innerHTML = '';

  msg.v1.forEach(m => {
    const d = document.createElement('div');
    d.className = 'msg msg-' + m.type;
    d.textContent = m.text;
    v1flow.appendChild(d);
  });

  msg.v2.forEach(m => {
    const d = document.createElement('div');
    d.className = 'msg msg-' + m.type;
    d.textContent = m.text;
    v2flow.appendChild(d);
  });

  document.getElementById('v1-size').textContent = 'size: ' + msg.v1size;
  document.getElementById('v2-size').textContent = 'size: ' + msg.v2size;
}
