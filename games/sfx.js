// Shared retro sound effects via the Web Audio API. No audio files needed.
// Usage: include <script src="sfx.js"></script> before your game script,
// then call SFX.paddle(), SFX.brick(), etc.
// A mute button is added automatically (top-right). M key also toggles.
const SFX = (() => {
'use strict';

let ctx = null;
let muted = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// iOS WebKit only grants user activation for Web Audio on 'touchend' and 'click'.
// 'touchstart'/'pointerdown' fire first but are NOT valid activation gestures —
// creating the AudioContext during those events poisons it and makes resume() unreliable.
// We also must await resume() before scheduling sounds, otherwise tones fire against
// a still-suspended context where currentTime is frozen at 0.
let unlocked = false;
async function unlockAudio() {
  if (unlocked) return;
  const c = ensure();
  if (!c) return;
  const buf = c.createBuffer(1, 1, c.sampleRate);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start(0);
  await c.resume();
  unlocked = true;
}
['keydown', 'touchend', 'click'].forEach(ev =>
  document.addEventListener(ev, () => { unlockAudio().catch(() => {}); }, { once: false, passive: true }));

function tone({ freq = 440, type = 'square', dur = 0.08, vol = 0.12, slide = 0, delay = 0 }) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// ---------- named effects ----------
const fx = {
  // UI / game flow
  start:  () => [262, 392, 523].forEach((f, i) => tone({ freq: f, dur: 0.09, vol: 0.10, delay: i * 0.07 })),
  over:   () => [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.16, vol: 0.12, delay: i * 0.12 })),
  pause:  () => tone({ freq: 440, type: 'triangle', dur: 0.06, vol: 0.08, slide: -160 }),
  // generic game events
  move:   () => tone({ freq: 220, dur: 0.03, vol: 0.05 }),
  rotate: () => tone({ freq: 330, dur: 0.05, vol: 0.08 }),
  drop:   () => tone({ freq: 180, type: 'triangle', dur: 0.07, vol: 0.14 }),
  hardDrop: () => tone({ freq: 140, dur: 0.09, vol: 0.16, slide: -60 }),
  hold:   () => tone({ freq: 280, type: 'triangle', dur: 0.05, vol: 0.10 }),
  line:   () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.09, vol: 0.10, delay: i * 0.06 })),
  level:  () => [392, 523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.10, vol: 0.12, delay: i * 0.06 })),
  powerup:() => [660, 880, 1320].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.08, vol: 0.12, delay: i * 0.045 })),
  paddle: () => tone({ freq: 440, dur: 0.04, vol: 0.12 }),
  wall:   () => tone({ freq: 330, dur: 0.03, vol: 0.07 }),
  score:  () => tone({ freq: 660, dur: 0.06, vol: 0.12, slide: 220 }),
  brick:  () => tone({ freq: 500 + Math.random() * 300, dur: 0.05, vol: 0.12 }),
  lose:   () => tone({ freq: 200, type: 'sawtooth', dur: 0.3, vol: 0.14, slide: -140 }),
};

// ---------- mute button ----------
function addMuteButton() {
  const btn = document.createElement('button');
  btn.id = 'sfxMute';
  btn.type = 'button';
  btn.title = 'Toggle sound (M)';
  btn.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:10;' +
    'background:#161a24;border:1px solid #272e40;border-radius:8px;' +
    'color:#8b93a7;font-size:14px;line-height:1;padding:8px 10px;cursor:pointer;';
  const sync = () => { btn.textContent = muted ? '\u{1F507}' : '\u{1F50A}'; };
  const toggle = () => { muted = !muted; sync(); };
  btn.addEventListener('click', toggle);
  document.body.appendChild(btn);
  sync();
  document.addEventListener('keydown', e => {
    if (e.key === 'm' || e.key === 'M') toggle();
  });
}
addMuteButton();

return {
  unlock: () => unlockAudio().catch(() => {}),
  setMuted: m => { muted = !!m; },
  isMuted: () => muted,
  ...fx,
};
})();
