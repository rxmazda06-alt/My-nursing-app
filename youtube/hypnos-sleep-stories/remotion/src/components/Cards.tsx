import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {CREAM, FONT_BODY, FONT_TITLE, GOLD, ROMAN} from '../theme';
import {Stars} from './Backdrop';

const fadeInOut = (f: number, total: number, inF = 18, outF = 18) =>
  interpolate(f, [0, inF, total - outF, total], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Greek key (meander) border that draws itself in. */
const Meander: React.FC<{progress: number; width: number; y: number}> = ({progress, width, y}) => {
  const unit = 36;
  const n = Math.floor(width / unit);
  let d = `M ${-width / 2} ${y}`;
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + i * unit;
    d += ` L ${x + 24} ${y} L ${x + 24} ${y - 18} L ${x + 8} ${y - 18} L ${x + 8} ${y - 8} L ${x + 16} ${y - 8} L ${x + 16} ${y} L ${x + unit} ${y}`;
  }
  const len = n * unit * 3.2;
  return <path d={d} stroke={GOLD} strokeWidth={2.5} fill="none" strokeDasharray={len} strokeDashoffset={len * (1 - progress)} opacity={0.85} />;
};

export const ChapterCard: React.FC<{n: number; title: string; frames: number}> = ({n, title, frames}) => {
  const f = useCurrentFrame();
  const o = fadeInOut(f, frames, 20, 24);
  const draw = interpolate(f, [8, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const rise = interpolate(f, [0, 40], [24, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(8,8,30,0.72) 0%, rgba(5,5,18,0.9) 100%)'}} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <g transform="translate(960,0)">
          <Meander progress={draw} width={760} y={400} />
          <Meander progress={draw} width={760} y={720} />
        </g>
      </svg>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `translateY(${rise}px)`}}>
        <div style={{fontFamily: FONT_TITLE, color: GOLD, fontSize: 40, letterSpacing: 14}}>CHAPTER {ROMAN[n]}</div>
        <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 104, marginTop: 18, textShadow: '0 0 30px rgba(255,220,150,0.35)'}}>{title}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TitleCard: React.FC<{text: string; frames: number}> = ({text, frames}) => {
  const f = useCurrentFrame();
  const o = fadeInOut(f, frames, 24, 30);
  const shimmer = interpolate(f, [0, frames], [-30, 130]);
  const scale = interpolate(f, [0, frames], [1.0, 1.04]);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(12,10,40,0.6) 0%, rgba(4,4,16,0.92) 100%)'}} />
      <Stars amount={0.8} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scale(${scale})`}}>
        <div style={{fontFamily: FONT_TITLE, color: CREAM, opacity: 0.75, fontSize: 34, letterSpacing: 16}}>HYPNOS CAN'T SLEEP</div>
        <div style={{
          fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 92, textAlign: 'center', lineHeight: 1.15, marginTop: 26, maxWidth: 1500,
          background: `linear-gradient(100deg, ${GOLD} ${shimmer - 30}%, #fff8e1 ${shimmer}%, ${GOLD} ${shimmer + 30}%)`,
          WebkitBackgroundClip: 'text', color: 'transparent',
        }}>{text}</div>
        <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 44, marginTop: 30, opacity: 0.85}}>
          a cozy, funny bedtime story from Greek mythology
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The quiet wind-down after the last word: "Goodnight", then the screen slowly dims. */
export const OutroOverlay: React.FC<{frames: number}> = ({frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const text = interpolate(f, [fps * 2, fps * 6, fps * 14, fps * 20], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dim = interpolate(f, [0, fps * 40, frames - fps * 10, frames], [0, 0.7, 0.85, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: '#02020a', opacity: dim}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: text}}>
        <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 120, textShadow: '0 0 40px rgba(220,220,255,0.35)'}}>Goodnight.</div>
        <div style={{fontFamily: FONT_TITLE, color: CREAM, opacity: 0.6, fontSize: 28, letterSpacing: 12, marginTop: 20}}>SLEEP WELL</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
