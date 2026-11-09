import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {CREAM, FONT_BODY, FONT_TITLE, GOLD} from '../theme';

/** Little sleepy Hypnos face: closed eyes, grey wings above the ears, a nightcap. */
export const HypnosAvatar: React.FC<{size?: number; sleep?: number}> = ({size = 120, sleep = 0}) => {
  const f = useCurrentFrame();
  const flap = Math.sin(f / 10) * 6;
  const droop = 4 + sleep * 6;
  return (
    <svg width={size} height={size} viewBox="-70 -80 140 150">
      {/* small feathered wings just above the ears, fanned out sideways */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${side * 40},4) scale(${side},1) rotate(${-flap * 0.6})`} fill="#e4e6f0" stroke="#9ea3bd" strokeWidth="1.5">
          <ellipse cx="18" cy="-4" rx="20" ry="6" transform="rotate(-8)" />
          <ellipse cx="16" cy="4" rx="17" ry="5.5" transform="rotate(6)" />
          <ellipse cx="13" cy="11" rx="13" ry="5" transform="rotate(18)" />
        </g>
      ))}
      <circle cx="0" cy="8" r="44" fill="#f0d2b8" />
      <path d="M -44 -6 Q 0 -86 52 -40 Q 62 -30 66 -6 L 40 -14 Q 0 -40 -44 -6 Z" fill="#2c3366" />
      <circle cx="66" cy="-4" r="9" fill="#e9ecff" />
      <path d={`M -24 10 q 10 ${droop} 20 0`} stroke="#3a2a22" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d={`M 6 10 q 10 ${droop} 20 0`} stroke="#3a2a22" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M -8 32 q 8 5 16 0" stroke="#a5634e" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
};

/** Lower-third speech card that appears whenever Hypnos talks. */
export const HypnosBubble: React.FC<{text: string; frames: number; sleep: number}> = ({text, frames, sleep}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, frames, frames + 10], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(f, [0, 10], [20, 0], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 90, bottom: 90, display: 'flex', alignItems: 'center', gap: 22, opacity: o * 0.95, transform: `translateY(${y}px)`}}>
      <div style={{background: 'rgba(15,16,40,0.78)', borderRadius: 999, padding: 6, boxShadow: '0 0 30px rgba(140,150,255,0.25)'}}>
        <HypnosAvatar size={128} sleep={sleep} />
      </div>
      <div style={{background: 'rgba(15,16,40,0.78)', borderRadius: 28, padding: '18px 30px', maxWidth: 1180, border: '1px solid rgba(243,213,139,0.35)'}}>
        <div style={{fontFamily: FONT_TITLE, color: GOLD, fontSize: 22, letterSpacing: 6}}>HYPNOS</div>
        <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 44, lineHeight: 1.15}}>{text}</div>
      </div>
    </div>
  );
};

/** Running gag: Hypnos's sleepiness rises chapter by chapter. */
export const SleepMeter: React.FC<{level: number; opacity: number}> = ({level, opacity}) => {
  const f = useCurrentFrame();
  const pct = Math.min(1, level / 8);
  const label = level >= 8 ? 'ASLEEP' : level >= 6 ? 'VERY DROWSY' : level >= 4 ? 'DROWSY' : 'AWAKE-ISH';
  return (
    <div style={{position: 'absolute', right: 70, top: 56, width: 330, opacity}}>
      <div style={{fontFamily: FONT_TITLE, color: CREAM, fontSize: 18, letterSpacing: 5, opacity: 0.8}}>HYPNOS SLEEP-O-METER</div>
      <div style={{marginTop: 10, height: 14, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden'}}>
        <div style={{width: `${pct * 100}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, #8fa0ff, ${GOLD})`}} />
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: FONT_TITLE, fontSize: 18, color: GOLD, letterSpacing: 3}}>
        <span>{label}</span>
        <span style={{opacity: 0.6 + 0.4 * Math.sin(f / 12)}}>{'z'.repeat(Math.max(1, Math.round(level / 2)))}</span>
      </div>
    </div>
  );
};
