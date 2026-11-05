import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CREAM, CUT_TITLES, FONT_BODY, FONT_TITLE, GOLD} from '../theme';

/** Movie-parody gag. Plays the Google Flow/Veo clip when present; otherwise a motion-graphic gag card. */
export const Cutaway: React.FC<{id: string; clip: boolean; frames: number}> = ({id, clip, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = CUT_TITLES[id];
  const bars = interpolate(f, [0, 10, frames - 10, frames], [0, 130, 130, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const o = interpolate(f, [0, 8, frames - 8, frames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const noir = id === 'c05_noir_detective';
  return (
    <AbsoluteFill style={{opacity: o, background: '#05050c'}}>
      {clip ? (
        <OffthreadVideo src={staticFile(`clips/${id}.mp4`)} volume={0.35} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        <Gag id={id} f={f} frames={frames} fps={fps} />
      )}
      {noir && <AbsoluteFill style={{backdropFilter: 'grayscale(1) contrast(1.2)'}} />}
      {/* letterbox */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bars, background: '#000'}} />
      {/* genre label */}
      <div style={{position: 'absolute', left: 80, bottom: 150, fontFamily: FONT_TITLE, color: GOLD, fontSize: 26, letterSpacing: 8, opacity: clip ? 0.9 : 0}}>
        {t?.kicker}
      </div>
    </AbsoluteFill>
  );
};

const typewriter = (s: string, f: number, start: number, cps = 1.4) => s.slice(0, Math.max(0, Math.floor((f - start) * cps)));

const Gag: React.FC<{id: string; f: number; frames: number; fps: number}> = ({id, f, frames, fps}) => {
  const t = CUT_TITLES[id];
  const zoom = interpolate(f, [0, frames], [1, 1.08]);
  const titleIn = interpolate(f, [12, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const base = (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scale(${zoom})`}}>
      <div style={{fontFamily: FONT_TITLE, color: CREAM, opacity: 0.7 * titleIn, fontSize: 30, letterSpacing: 12}}>{t.kicker}</div>
      <div style={{fontFamily: FONT_TITLE, fontWeight: 700, color: GOLD, fontSize: id === 'c05_noir_detective' ? 72 : 96, marginTop: 18, opacity: titleIn, textAlign: 'center', maxWidth: 1600}}>
        {id === 'c05_noir_detective' || id === 'c04_keyhole_stealth' ? typewriter(t.title, f, 10) : t.title}
      </div>
      <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 46, marginTop: 22, opacity: interpolate(f, [40, 60], [0, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{t.tag}</div>
    </AbsoluteFill>
  );
  switch (id) {
    case 'c01_nature_doc': {
      // camera viewfinder
      const blink = Math.floor(f / 12) % 2 === 0;
      return (
        <AbsoluteFill style={{background: 'linear-gradient(180deg,#2d4a3a,#7a9a6a)'}}>
          {base}
          <svg width={1920} height={1080} style={{position: 'absolute'}} stroke="#fff" strokeWidth="4" fill="none" opacity="0.8">
            <path d="M 200 220 h 80 M 200 220 v 80 M 1720 220 h -80 M 1720 220 v 80 M 200 860 h 80 M 200 860 v -80 M 1720 860 h -80 M 1720 860 v -80" />
            <line x1="930" y1="540" x2="990" y2="540" /><line x1="960" y1="510" x2="960" y2="570" />
          </svg>
          <div style={{position: 'absolute', left: 240, top: 250, color: '#fff', fontFamily: 'monospace', fontSize: 30, opacity: 0.85}}>
            <span style={{color: '#ff4d4d', opacity: blink ? 1 : 0}}>●</span> REC 00:00:{String(Math.floor(f / fps)).padStart(2, '0')}
          </div>
        </AbsoluteFill>
      );
    }
    case 'c02_backwards_cows': {
      return (
        <AbsoluteFill style={{background: 'linear-gradient(180deg,#141a3e,#3b3f78)'}}>
          <svg width={1920} height={1080} style={{position: 'absolute'}}>
            <circle cx="1620" cy="560" r="80" fill="#f4f1d8" opacity="0.9" />
            <rect y="820" width="1920" height="260" fill="#1d2a3a" />
            {new Array(6).fill(0).map((_, i) => {
              const x = -300 + ((f * 4 + i * 330) % 2400);
              const bob = Math.abs(Math.sin(f / 5 + i)) * 6;
              return (
                <g key={i} transform={`translate(${x},${800 - bob}) scale(-1.2,1.2)`} fill="#0b0f22">
                  <ellipse cx="0" cy="0" rx="46" ry="24" /><ellipse cx="50" cy="-14" rx="16" ry="13" />
                  <rect x="-36" y="14" width="9" height="30" rx="3" /><rect x="-18" y="14" width="9" height="30" rx="3" />
                  <rect x="14" y="14" width="9" height="30" rx="3" /><rect x="30" y="14" width="9" height="30" rx="3" />
                  <circle cx="-70" cy="40" r={6 + (f % 10)} fill="#8a8fb0" opacity={0.3} />
                </g>
              );
            })}
          </svg>
          <AbsoluteFill style={{alignItems: 'center', paddingTop: 200}}>
            <div style={{fontFamily: FONT_TITLE, color: GOLD, fontWeight: 700, fontSize: 84}}>{t.title}</div>
            <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 44, marginTop: 10}}>{t.tag}</div>
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    case 'c03_heist_slowmo': {
      const flare = interpolate(f, [0, frames], [200, 1700]);
      return (
        <AbsoluteFill style={{background: 'linear-gradient(180deg,#1a0f08,#7a3a16)'}}>
          <div style={{position: 'absolute', left: flare - 300, top: 240, width: 600, height: 600, borderRadius: 999, background: 'radial-gradient(circle, rgba(255,210,140,0.55), rgba(255,210,140,0) 65%)'}} />
          {base}
        </AbsoluteFill>
      );
    }
    case 'c04_keyhole_stealth': {
      const r = interpolate(f, [0, frames * 0.6], [40, 900], {extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
      return (
        <AbsoluteFill style={{background: '#000'}}>
          <AbsoluteFill style={{background: 'linear-gradient(180deg,#24304f,#5a6a8a)', clipPath: `circle(${r}px at 50% 46%)`}}>
            {base}
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    case 'c05_noir_detective': {
      return (
        <AbsoluteFill style={{background: 'linear-gradient(180deg,#0c0c0c,#3a3a3a)'}}>
          <svg width={1920} height={1080} style={{position: 'absolute'}} opacity="0.35">
            {new Array(60).fill(0).map((_, i) => {
              const x = (i * 97) % 1920; const y = ((f * 26 + i * 173) % 1300) - 200;
              return <line key={i} x1={x} y1={y} x2={x - 12} y2={y + 60} stroke="#ddd" strokeWidth="2" />;
            })}
          </svg>
          {base}
        </AbsoluteFill>
      );
    }
    case 'c06_one_eye_open': {
      const open = interpolate(f, [20, 32, frames - 30, frames - 22], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const look = interpolate(f, [36, 46, 56, 66, 76], [0, -60, -60, 60, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      return (
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at center,#4a2a1c,#120a08)'}}>
          <svg width={1920} height={1080} style={{position: 'absolute'}}>
            <g transform="translate(960,470)">
              <ellipse rx="260" ry={150 * open + 2} fill="#fff7ea" />
              {open > 0.3 && <circle cx={look} cy="0" r="80" fill="#3a2414" />}
              {open > 0.3 && <circle cx={look + 22} cy="-22" r="18" fill="#fff" />}
              <path d={`M -280 0 Q 0 ${-190 * open - 10} 280 0`} stroke="#2a1d14" strokeWidth="14" fill="none" />
              <path d="M -280 0 Q 0 190 280 0" stroke="#2a1d14" strokeWidth="10" fill="none" opacity={open} />
            </g>
          </svg>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 200}}>
            <div style={{fontFamily: FONT_TITLE, color: GOLD, fontWeight: 700, fontSize: 80}}>{t.title}</div>
            <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 40}}>{t.tag}</div>
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    case 'c07_courtroom': {
      const tap = interpolate(f, [50, 54, 60], [-40, 10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const stamp = interpolate(f, [58, 64], [2.2, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2))});
      return (
        <AbsoluteFill style={{background: 'linear-gradient(180deg,#e9dcc8,#b79c7a)'}}>
          <div style={{filter: 'brightness(0.32) sepia(1) saturate(2)', position: 'absolute', inset: 0}}>{base}</div>
          <svg width={1920} height={1080} style={{position: 'absolute'}}>
            <g transform={`translate(1560,760) rotate(${tap})`} fill="#5a3a1e">
              <rect x="-90" y="-28" width="180" height="56" rx="12" />
              <rect x="-10" y="20" width="20" height="160" rx="8" />
            </g>
          </svg>
          {f > 58 && (
            <div style={{position: 'absolute', left: 220, top: 210, transform: `rotate(-12deg) scale(${stamp})`, border: '8px solid #b3262b', color: '#b3262b', fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 70, padding: '6px 26px'}}>
              OBJECTION!
            </div>
          )}
        </AbsoluteFill>
      );
    }
    default:
      return base;
  }
};
