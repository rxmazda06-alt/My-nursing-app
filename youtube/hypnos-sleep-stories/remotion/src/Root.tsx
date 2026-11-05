import React from 'react';
import {AbsoluteFill, Composition, Still} from 'remotion';
import render from './data/render.json';
import {Episode} from './Episode';
import {ProceduralScene} from './components/Backdrop';
import {HypnosAvatar} from './components/Hypnos';
import {CREAM, FONT_BODY, FONT_TITLE, GOLD} from './theme';

const Thumbnail: React.FC = () => (
  <AbsoluteFill>
    <ProceduralScene id="s03_pieria_sunset" />
    <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(6,6,24,0.92) 0%, rgba(6,6,24,0.55) 48%, rgba(6,6,24,0) 75%)'}} />
    <div style={{position: 'absolute', left: 120, top: 210, width: 1500}}>
      <div style={{fontFamily: FONT_TITLE, color: CREAM, fontSize: 60, letterSpacing: 14, opacity: 0.85}}>BEDTIME MYTHS</div>
      <div style={{fontFamily: FONT_TITLE, fontWeight: 700, color: GOLD, fontSize: 190, lineHeight: 1.0, marginTop: 20}}>BABY STEALS 50 COWS</div>
      <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 92, marginTop: 30}}>...on his first day</div>
    </div>
    <div style={{position: 'absolute', right: 90, top: 300, transform: 'rotate(-8deg)'}}>
      <HypnosAvatar size={430} sleep={1} />
    </div>
    <div style={{position: 'absolute', right: 150, top: 230, fontFamily: FONT_TITLE, color: GOLD, fontSize: 84, letterSpacing: 8}}>zzz</div>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Episode" component={Episode} durationInFrames={render.durationInFrames}
      fps={render.fps} width={1920} height={1080} />
    <Still id="Thumbnail" component={Thumbnail} width={1920} height={1080} />
  </>
);
