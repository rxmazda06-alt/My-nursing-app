"""Procedural, royalty-free audio for the sleep video (no external samples).

Outputs (44.1 kHz WAV) into the given directory:
  ambient_bed.wav    60 s seamless loop: soft night air + slow river + low pad
  lyre_sting.wav     ~6 s plucked-lyre arpeggio for title / chapter cards
  lyre_lullaby.wav   ~150 s sparse, slow lyre lullaby for the wind-down outro
  whoosh.wav         ~1.2 s soft airy whoosh for movie-parody cutaways
"""
import sys, os
import numpy as np
from scipy.signal import butter, lfilter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def save(name, x, peak=0.5):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    wavfile.write(os.path.join(OUT, name), SR, (x * 32767).astype(np.int16))
    print(name, f"{len(x)/SR:.1f}s")


def lowpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def reverb(x, seconds=3.2, mix=0.35, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    ir = r.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lowpass(ir, 5000)
    dry = np.pad(x, (0, n))
    wet = np.pad(fftconvolve(x, ir), (0, 1))[: len(dry)]
    wet = wet / (np.max(np.abs(wet)) + 1e-9) * np.max(np.abs(dry))
    return (1 - mix) * dry + mix * wet


def pluck(freq, dur=3.5, bright=0.5):
    """Karplus-Strong plucked string."""
    n = int(dur * SR)
    period = int(SR / freq)
    buf = rng.uniform(-1, 1, period) * bright + rng.uniform(-1, 1, period) * (1 - bright) * 0.3
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = 0.996 * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    env = np.minimum(1, np.linspace(0, 40, n)) * np.exp(-np.linspace(0, 2.2, n))
    return lowpass(out * env, 3800)


# D major pentatonic, lyre range
NOTES = {"D3": 146.83, "A3": 220.0, "D4": 293.66, "E4": 329.63, "F#4": 369.99,
         "A4": 440.0, "B4": 493.88, "D5": 587.33, "E5": 659.25, "F#5": 739.99}

# ---------- ambient bed (seamless 60 s loop) ----------
L = 60 * SR
t = np.arange(L) / SR
white = rng.standard_normal(L + SR * 4)
brown = np.cumsum(white)
brown -= lowpass(brown, 8)  # remove DC drift
air = lowpass(brown, 400)[: L]
river = bandpass(rng.standard_normal(L), 300, 1800)
river *= 0.55 + 0.45 * np.sin(2 * np.pi * t / 7.5) ** 2  # slow swell
pad = np.zeros(L)
for f, a in [(73.42, 1.0), (110.0, 0.6), (146.83, 0.35), (220.0, 0.15)]:
    pad += a * np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.07 * t))
pad *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 30.0) ** 2
bed = air / np.std(air) * 0.5 + river / np.std(river) * 0.12 + pad / np.std(pad) * 0.18
# crossfade tail into head so the loop is seamless
xf = 3 * SR
fade = np.linspace(0, 1, xf)
bed[:xf] = bed[:xf] * fade + bed[-xf:] * (1 - fade)
bed = bed[: L - xf]
save("ambient_bed.wav", lowpass(bed, 2500), peak=0.35)

# ---------- lyre sting ----------
seq = [("D4", 0.0), ("F#4", 0.35), ("A4", 0.7), ("D5", 1.05), ("B4", 1.6), ("A4", 2.1)]
sting = np.zeros(int(4.0 * SR))
for name, at in seq:
    p = pluck(NOTES[name], 3.0)
    i = int(at * SR)
    sting[i:i + len(p)] += p[: len(sting) - i]
save("lyre_sting.wav", reverb(sting, 3.0, 0.4), peak=0.45)

# ---------- lullaby (sparse, slowing) ----------
D = 150
lull = np.zeros(int(D * SR))
pool = ["D3", "A3", "D4", "E4", "F#4", "A4", "B4", "D5"]
at = 0.5
r2 = np.random.default_rng(11)
while at < D - 6:
    name = pool[r2.integers(len(pool))]
    p = pluck(NOTES[name], 4.0, bright=0.35) * (0.8 - 0.5 * at / D)
    i = int(at * SR)
    lull[i:i + len(p)] += p[: len(lull) - i]
    at += 1.4 + 2.2 * (at / D) + r2.uniform(0, 0.8)  # notes slow down over time
save("lyre_lullaby.wav", reverb(lull, 4.0, 0.45), peak=0.4)

# ---------- whoosh ----------
n = int(1.2 * SR)
w = rng.standard_normal(n)
env = np.sin(np.linspace(0, np.pi, n)) ** 2
sweep = np.zeros(n)
for k in range(0, n, 2048):
    seg = w[k:k + 2048]
    f = 300 + 2500 * (k / n)
    sweep[k:k + len(seg)] = bandpass(seg, f, f * 2.2, 1)
save("whoosh.wav", reverb(sweep * env, 1.0, 0.3), peak=0.3)
