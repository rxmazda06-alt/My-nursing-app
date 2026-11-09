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


const ChannelAvatar: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #2c2a63 0%, #0b0f2e 75%)', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{position: 'absolute', right: 120, top: 110, width: 120, height: 120, borderRadius: 999,
      background: 'radial-gradient(circle, #ffe9b8 0%, #ffe9b8cc 40%, #ffe9b800 72%)'}} />
    <div style={{transform: 'translateY(30px)'}}><HypnosAvatar size={620} sleep={1} /></div>
    <div style={{position: 'absolute', right: 150, top: 250, fontFamily: FONT_TITLE, color: GOLD, fontSize: 70, letterSpacing: 6}}>z z</div>
  </AbsoluteFill>
);

const ChannelBanner: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{transform: 'scale(1.334)', transformOrigin: 'top left', width: 1920, height: 1080}}>
      <ProceduralScene id="s01_hypnos_cave" />
    </AbsoluteFill>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,6,20,0.15) 0%, rgba(5,6,20,0.55) 100%)'}} />
    {/* YouTube safe area: 1546x423 centred */}
    <div style={{position: 'absolute', left: 507, top: 508, width: 1546, height: 423, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 46}}>
      <HypnosAvatar size={300} sleep={1} />
      <div>
        <div style={{fontFamily: FONT_TITLE, fontWeight: 700, color: GOLD, fontSize: 112, lineHeight: 1}}>Hypnos Can't Sleep</div>
        <div style={{fontFamily: FONT_BODY, fontStyle: 'italic', color: CREAM, fontSize: 54, marginTop: 18}}>Funny, cozy bedtime stories from mythology</div>
      </div>
    </div>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Episode" component={Episode} durationInFrames={render.durationInFrames}
      fps={render.fps} width={1920} height={1080} />
    <Still id="Thumbnail" component={Thumbnail} width={1920} height={1080} />
    <Still id="ChannelAvatar" component={ChannelAvatar} width={800} height={800} />
    <Still id="ChannelBanner" component={ChannelBanner} width={2560} height={1440} />
  </>
);
