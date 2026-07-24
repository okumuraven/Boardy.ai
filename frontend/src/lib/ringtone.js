// Synthesized with the Web Audio API rather than shipping an audio file -
// no asset to manage, no license, same "no external dependency" style as
// the rest of this app. Two audibly distinct patterns so a user can tell
// "I'm calling out" from "someone's calling me" without looking at the
// screen, matching how real phones distinguish ringback from ringtone.

let audioCtx = null;
let intervalId = null;
let currentNodes = [];

function getContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function stopCurrentTone() {
  currentNodes.forEach((node) => {
    try {
      node.stop?.();
    } catch {
      // Already stopped by its own timeout - fine.
    }
    node.disconnect();
  });
  currentNodes = [];
}

function playTone(frequencies, durationMs) {
  stopCurrentTone();
  const ctx = getContext();
  const gain = ctx.createGain();
  gain.gain.value = 0.12; // audible, not jarring
  gain.connect(ctx.destination);

  const oscillators = frequencies.map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
    return osc;
  });

  currentNodes = [...oscillators, gain];
  setTimeout(stopCurrentTone, durationMs);
}

function startPattern(frequencies, onMs, offMs) {
  stopRingtone();
  // Requires a prior user gesture somewhere on the page (already true by
  // the time anyone reaches an open chat) - if the browser still blocks
  // it, this just silently doesn't play rather than breaking the call.
  getContext().resume?.().catch(() => {});
  playTone(frequencies, onMs);
  intervalId = setInterval(() => playTone(frequencies, onMs), onMs + offMs);
}

// Outgoing "Calling..." state - the classic North American ringback
// dual-tone (440Hz + 480Hz), 2s on / 4s off.
export function playRingback() {
  startPattern([440, 480], 2000, 4000);
}

// Incoming call - a single lower tone, shorter and more frequent, so it
// reads as distinctly different from the outgoing ringback above.
export function playRingtone() {
  startPattern([425], 1000, 3000);
}

export function stopRingtone() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  stopCurrentTone();
}
