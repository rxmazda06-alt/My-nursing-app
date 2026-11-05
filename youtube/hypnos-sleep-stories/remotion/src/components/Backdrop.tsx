import React from 'react';
import {AbsoluteFill, Loop, OffthreadVideo, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTES, Palette} from '../theme';

const W = 1920;
const H = 1080;

const STARS = new Array(140).fill(0).map((_, i) => ({
  x: random(`sx${i}`) * W,
  y: random(`sy${i}`) * H * 0.62,
  r: 0.6 + random(`sr${i}`) * 1.8,
  p: random(`sp${i}`) * Math.PI * 2,
  s: 0.02 + random(`ss${i}`) * 0.05,
}));

export const Stars: React.FC<{amount: number}> = ({amount}) => {
  const f = useCurrentFrame();
  if (amount <= 0.01) return null;
  return (
    <svg width={W} height={H} style={{position: 'absolute'}}>
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fffbe8"
          opacity={amount * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f * s.s + s.p)))} />
      ))}
    </svg>
  );
};

const hillPath = (seed: string, baseY: number, amp: number, t: number) => {
  let d = `M -200 ${H} L -200 ${baseY}`;
  for (let x = -200; x <= W + 200; x += 80) {
    const y = baseY - amp * (0.5 + 0.5 * Math.sin(x / 260 + random(seed) * 6 + t)) - amp * 0.4 * Math.sin(x / 97 + random(seed + 'b') * 5);
    d += ` L ${x} ${y.toFixed(1)}`;
  }
  return d + ` L ${W + 200} ${H} Z`;
};

const Cow: React.FC<{x: number; y: number; s: number; flip?: boolean; color: string; bob?: number}> = ({x, y, s, flip, color, bob = 0}) => (
  <g transform={`translate(${x},${y + bob}) scale(${flip ? -s : s},${s})`} fill={color}>
    <ellipse cx="0" cy="0" rx="46" ry="24" />
    <ellipse cx="50" cy="-14" rx="16" ry="13" />
    <rect x="58" y="-30" width="4" height="10" rx="2" />
    <rect x="44" y="-30" width="4" height="10" rx="2" />
    <rect x="-36" y="14" width="9" height="30" rx="3" />
    <rect x="-18" y="14" width="9" height="30" rx="3" />
    <rect x="14" y="14" width="9" height="30" rx="3" />
    <rect x="30" y="14" width="9" height="30" rx="3" />
    <path d="M -46 -6 Q -64 6 -58 26" stroke={color} strokeWidth="4" fill="none" />
  </g>
);

const Mist: React.FC<{color: string; y: number; opacity: number}> = ({color, y, opacity}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{position: 'absolute'}}>
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={((f * (0.25 + i * 0.07) + i * 600) % (W + 900)) - 450} cy={y + i * 22}
          rx={520} ry={46} fill={color} opacity={opacity * (0.6 - i * 0.1)} />
      ))}
    </svg>
  );
};

/** Scene-specific foreground motifs, drawn as soft storybook silhouettes. */
const Motif: React.FC<{id: string; p: Palette; f: number}> = ({id, p, f}) => {
  const sway = Math.sin(f / 40);
  switch (id) {
    case 's01_hypnos_cave':
    case 's09_moonlit_cradle':
      return (
        <svg width={W} height={H} style={{position: 'absolute'}}>
          {/* cave arch with warm lamp glow */}
          <defs>
            <radialGradient id="lamp" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#ffc978" stopOpacity={0.5 + 0.08 * Math.sin(f / 9)} />
              <stop offset="100%" stopColor="#ffc978" stopOpacity={0} />
            </radialGradient>
          </defs>
          <path d="M 120 1080 L 120 700 Q 120 470 380 450 Q 640 470 640 700 L 640 1080 Z" fill={p.hill2} />
          <path d="M 230 1080 L 230 730 Q 240 560 380 548 Q 520 560 530 730 L 530 1080 Z" fill="url(#lamp)" />
          {/* river shimmer */}
          {new Array(9).fill(0).map((_, i) => (
            <rect key={i} x={760 + ((i * 137 + f * 0.8) % 1100)} y={930 + (i % 3) * 30} width={90 + (i % 4) * 30} height={2.5}
              rx={1} fill="#cdd6ff" opacity={0.25 + 0.2 * Math.sin(f / 15 + i)} />
          ))}
          {/* poppies */}
          {new Array(14).fill(0).map((_, i) => {
            const x = 40 + i * 62 + (i % 2) * 18;
            const y = 1010 - (i % 3) * 18;
            const b = Math.sin(f / 35 + i) * 4;
            return (
              <g key={i}>
                <path d={`M ${x} 1080 Q ${x + b} ${y + 40} ${x + b} ${y}`} stroke="#1d2a22" strokeWidth="3" fill="none" />
                <circle cx={x + b} cy={y} r={9 + (i % 3) * 2} fill={id === 's09_moonlit_cradle' ? '#7a2e3e' : '#b8384a'} opacity={0.85} />
              </g>
            );
          })}
        </svg>
      );
    case 's02_kyllene_dawn':
      return (
        <svg width={W} height={H} style={{position: 'absolute'}}>
          {new Array(16).fill(0).map((_, i) => {
            const x = 60 + i * 120 + (i % 3) * 20;
            const h = 160 + (i % 4) * 50;
            const base = 900 + (i % 2) * 40;
            return <path key={i} d={`M ${x} ${base - h} L ${x - 40} ${base} L ${x + 40} ${base} Z`} fill={p.hill2} opacity={0.95} />;
          })}
          <path d="M 1380 1080 L 1380 820 Q 1380 690 1520 680 Q 1660 690 1660 820 L 1660 1080 Z" fill="#1a1630" />
          {new Array(10).fill(0).map((_, i) => (
            <path key={i} d={`M ${1395 + i * 27} 690 q ${6 * sway} 60 0 ${120 + (i % 3) * 40}`} stroke="#3f6b4a" strokeWidth="5" fill="none" opacity="0.9" />
          ))}
        </svg>
      );
    case 's03_pieria_sunset':
    case 's05_apollo_tracks':
      return (
        <svg width={W} height={H} style={{position: 'absolute'}}>
          {id === 's03_pieria_sunset'
            ? new Array(9).fill(0).map((_, i) => (
                <Cow key={i} x={160 + i * 200} y={930 + (i % 3) * 34} s={0.85 + (i % 3) * 0.15} flip={i % 2 === 0} color="#1c1222"
                  bob={Math.sin(f / 25 + i) * 2} />
              ))
            : new Array(14).fill(0).map((_, i) => {
                const x = 120 + i * 130;
                const y = 950 - Math.sin(i / 2) * 40;
                return i % 2 ? (
                  <g key={i} transform={`translate(${x},${y}) rotate(${-10 + (i % 3) * 6})`} opacity={interpolate(f % 400, [i * 20, i * 20 + 30], [0, 0.85], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}>
                    <ellipse rx="26" ry="14" fill="#3f6b3a" />
                    <ellipse rx="14" ry="6" cx="10" fill="#5c8f4f" />
                  </g>
                ) : (
                  <g key={i} transform={`translate(${x},${y})`} fill="#4a3a2a" opacity="0.8">
                    <ellipse cx="-6" rx="6" ry="10" />
                    <ellipse cx="6" rx="6" ry="10" />
                  </g>
                );
              })}
        </svg>
      );
    case 's04_alpheus_dawn':
    case 's08_lyre_river':
      return (
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <rect x="0" y="820" width={W} height="140" fill="#9fb6e0" opacity="0.35" />
          {new Array(16).fill(0).map((_, i) => (
            <rect key={i} x={((i * 151 + f * 1.1) % (W + 200)) - 100} y={840 + (i % 5) * 22} width={80 + (i % 4) * 40} height={2.5}
              rx={1} fill="#ffffff" opacity={0.3 + 0.2 * Math.sin(f / 13 + i)} />
          ))}
          {new Array(24).fill(0).map((_, i) => (
            <path key={i} d={`M ${30 + i * 40} 1080 q ${8 * Math.sin(f / 30 + i)} -90 ${4 * sway} -${150 + (i % 5) * 30}`} stroke="#2f3b2a" strokeWidth="4" fill="none" />
          ))}
          {id === 's04_alpheus_dawn' ? (
            <g>
              <path d="M 1500 800 L 1530 760 L 1560 800 Z" fill="#ffb15e" opacity={0.75 + 0.2 * Math.sin(f / 4)} />
              {[0, 1, 2].map((k) => (
                <circle key={k} cx={1530 + Math.sin((f + k * 40) / 30) * 20} cy={740 - ((f + k * 60) % 180)} r={10 + ((f + k * 60) % 180) / 9}
                  fill="#e6e1ea" opacity={0.3 * (1 - ((f + k * 60) % 180) / 180)} />
              ))}
            </g>
          ) : (
            <g>
              {/* glowing lyre + floating notes */}
              <g transform="translate(1460,640)" stroke={p.glow} strokeWidth="6" fill="none" opacity={0.8}>
                <path d="M -60 120 Q -90 0 -50 -90" />
                <path d="M 60 120 Q 90 0 50 -90" />
                <line x1="-60" y1="-60" x2="60" y2="-60" />
                <ellipse cx="0" cy="130" rx="70" ry="30" fill={p.glow} fillOpacity="0.25" />
                {[-30, -15, 0, 15, 30].map((x) => <line key={x} x1={x} y1="-60" x2={x} y2="115" strokeWidth="2" />)}
              </g>
              {new Array(5).fill(0).map((_, k) => {
                const t = (f + k * 70) % 350;
                return <text key={k} x={1460 + Math.sin(t / 30 + k) * 120} y={600 - t} fontSize="48" fill={p.glow} opacity={0.7 * (1 - t / 350)}>{k % 2 ? '♪' : '♫'}</text>;
              })}
            </g>
          )}
        </svg>
      );
    case 's06_cradle_innocent':
      return (
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <defs>
            <radialGradient id="warm" cx="50%" cy="55%" r="45%">
              <stop offset="0%" stopColor={p.glow} stopOpacity={0.45 + 0.06 * Math.sin(f / 7)} />
              <stop offset="100%" stopColor={p.glow} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#warm)" />
          <path d="M 700 760 Q 960 980 1220 760 Z" fill="#6b4a2a" />
          <path d="M 700 760 Q 960 980 1220 760" stroke="#8a6238" strokeWidth="10" fill="none" />
          <ellipse cx="960" cy="752" rx="220" ry="40" fill="#efe2c8" />
          <circle cx="960" cy="720" r="34" fill="#f2d2b4" />
          <path d="M 955 688 q 5 -26 12 -6" stroke="#2a1d14" strokeWidth="5" fill="none" />
          <path d="M 944 722 q 6 5 12 0 M 966 722 q 6 5 12 0" stroke="#2a1d14" strokeWidth="3" fill="none" />
          <g transform={`translate(1480,540)`}>
            <path d="M 0 0 q 8 -30 0 -50 q -8 20 0 50" fill="#ffcf7a" opacity={0.8 + 0.2 * Math.sin(f / 3)} />
            <rect x="-14" y="0" width="28" height="18" rx="6" fill="#6b4a2a" />
          </g>
        </svg>
      );
    case 's07_olympus_clouds':
      return (
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <g transform="translate(960,560)" fill="#fff6e6" opacity="0.92">
            <rect x="-300" y="-20" width="600" height="26" rx="6" />
            <path d="M -320 -20 L 0 -120 L 320 -20 Z" />
            {[-250, -150, -50, 50, 150, 250].map((x) => <rect key={x} x={x - 14} y="6" width="28" height="200" rx="6" />)}
            <rect x="-320" y="200" width="640" height="24" rx="6" />
          </g>
          {new Array(7).fill(0).map((_, i) => (
            <g key={i} transform={`translate(${((i * 340 + f * (0.3 + i * 0.05)) % (W + 700)) - 350},${720 + (i % 3) * 90})`} fill="#ffffff" opacity={0.75}>
              <ellipse rx="180" ry="50" />
              <ellipse cx="-90" cy="10" rx="110" ry="40" />
              <ellipse cx="100" cy="12" rx="120" ry="38" />
              <ellipse cx="10" cy="-30" rx="90" ry="45" />
            </g>
          ))}
        </svg>
      );
    default:
      return null;
  }
};

/** A full storybook backdrop for one scene: sky, stars, orb, hills, motif, mist. */
export const ProceduralScene: React.FC<{id: string; dim?: number}> = ({id, dim = 0}) => {
  const f = useCurrentFrame();
  const p = PALETTES[id] ?? PALETTES.s01_hypnos_cave;
  const drift = f / 1800;
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${p.top} 0%, ${p.bottom} 78%)`}}>
      <Stars amount={p.stars} />
      {p.orb !== 'none' && (
        <div style={{
          position: 'absolute', left: 1280 - 120, top: p.orbY * H - 120 - (p.orb === 'sun' ? f * 0.004 : 0), width: 240, height: 240, borderRadius: 999,
          background: `radial-gradient(circle, ${p.glow} 0%, ${p.glow}cc 35%, ${p.glow}00 70%)`,
        }} />
      )}
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <path d={hillPath(id + 'a', 760, 120, drift)} fill={p.hill1} opacity={0.9} />
        <path d={hillPath(id + 'b', 900, 90, drift * 1.6)} fill={p.hill2} />
      </svg>
      <Motif id={id} p={p} f={f} />
      <Mist color="#ffffff" y={860} opacity={id === 's06_cradle_innocent' ? 0.03 : 0.07} />
      {dim > 0 && <AbsoluteFill style={{background: '#000', opacity: dim}} />}
    </AbsoluteFill>
  );
};

/** Uses the Google Flow / Veo clip if it was uploaded, otherwise the procedural backdrop. */
export const SceneBackdrop: React.FC<{id: string; clip: boolean; frames: number; dim?: number}> = ({id, clip, frames, dim = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!clip) return <ProceduralScene id={id} dim={dim} />;
  const loopLen = Math.round(8 * fps / 0.75); // 8 s clip played at 0.75x
  const zoom = 1.04 + 0.04 * Math.sin(f / (fps * 20));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Loop durationInFrames={loopLen} times={Math.ceil(frames / loopLen) + 1}>
        <AbsoluteFill style={{transform: `scale(${zoom})`}}>
          <OffthreadVideo src={staticFile(`clips/${id}.mp4`)} muted playbackRate={0.75}
            style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </AbsoluteFill>
      </Loop>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(5,6,20,0.55) 100%)'}} />
      {dim > 0 && <AbsoluteFill style={{background: '#000', opacity: dim}} />}
    </AbsoluteFill>
  );
};
