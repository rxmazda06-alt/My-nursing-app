import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import './theme';
import render from './data/render.json';
import {SceneBackdrop} from './components/Backdrop';
import {ChapterCard, OutroOverlay, TitleCard} from './components/Cards';
import {Cutaway} from './components/Cutaway';
import {HypnosBubble, SleepMeter} from './components/Hypnos';

type Item = any;
const items: Item[] = render.items as Item[];
const scenes = items.filter((i) => i.type === 'scene');
const chapters = items.filter((i) => i.type === 'chapter');
const cuts = items.filter((i) => i.type === 'cut');
const speech = items.filter((i) => i.type === 'speech');
const outro = items.find((i) => i.type === 'outro');
const title = items.find((i) => i.type === 'title');

const BED_FRAMES = Math.round(57 * 24); // ambient_bed.wav is a 57 s seamless loop

/** Ambient bed level across the whole episode: quiet under the voices, a little fuller in the wind-down. */
const bedVolume = (frame: number, total: number, outroFrom: number) =>
  interpolate(frame, [0, 72, outroFrom, outroFrom + 24 * 30, total - 24 * 12, total],
    [0, 0.22, 0.22, 0.42, 0.42, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const Episode: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const chapterNow = [...chapters].reverse().find((c) => c.from <= frame)?.n ?? 1;
  const inOutro = outro && frame >= outro.from;
  const meterOpacity = interpolate(frame, [title ? title.from + title.frames : 0, (title ? title.from + title.frames : 0) + 24,
    outro.from - 24, outro.from], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* ---------- backgrounds (crossfaded scenes) ---------- */}
      {scenes.map((s, i) => {
        const len = s.endFrame - s.from + 48;
        return (
          <Sequence key={`sc${i}`} from={s.from} durationInFrames={len} layout="none">
            <SceneLayer id={s.id} clip={s.clip} frames={len} />
          </Sequence>
        );
      })}

      {/* ---------- Hypnos speech cards + sleep meter ---------- */}
      {speech.filter((s) => s.speaker === 'hypnos' && s.chapter < 8).map((s) => (
        <Sequence key={`hb${s.seg}`} from={s.from} durationInFrames={s.frames + 12} layout="none">
          <HypnosBubble text={s.display} frames={s.frames} sleep={Math.min(1, s.chapter / 8)} />
        </Sequence>
      ))}
      {!inOutro && <SleepMeter level={chapterNow} opacity={meterOpacity} />}

      {/* ---------- title, chapter cards, cutaways ---------- */}
      {title && (
        <Sequence from={title.from} durationInFrames={title.frames} layout="none">
          <TitleCard text={title.text} frames={title.frames} />
        </Sequence>
      )}
      {chapters.map((c) => (
        <Sequence key={`ch${c.n}`} from={c.from} durationInFrames={c.frames} layout="none">
          <ChapterCard n={c.n} title={c.title} frames={c.frames} />
        </Sequence>
      ))}
      {cuts.map((c) => (
        <Sequence key={c.id} from={c.from} durationInFrames={c.frames} layout="none">
          <Cutaway id={c.id} clip={c.clip} frames={c.frames} />
        </Sequence>
      ))}
      {outro && (
        <Sequence from={outro.from} durationInFrames={outro.frames} layout="none">
          <OutroOverlay frames={outro.frames} />
        </Sequence>
      )}
      {/* fade in from black */}
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [0, 60], [1, 0], {extrapolateRight: 'clamp'}), pointerEvents: 'none'}} />

      {/* ---------- audio ---------- */}
      {new Array(Math.ceil(durationInFrames / BED_FRAMES)).fill(0).map((_, k) => (
        <Sequence key={`bed${k}`} from={k * BED_FRAMES} durationInFrames={BED_FRAMES} layout="none">
          <Html5Audio src={staticFile('audio/ambient_bed.wav')}
            volume={(f) => bedVolume(k * BED_FRAMES + f, durationInFrames, outro.from)} />
        </Sequence>
      ))}
      {[title, ...chapters].filter(Boolean).map((c, i) => (
        <Sequence key={`st${i}`} from={c.from} durationInFrames={fps * 7} layout="none">
          <Html5Audio src={staticFile('audio/lyre_sting.wav')} volume={0.5} />
        </Sequence>
      ))}
      {cuts.map((c) => (
        <Sequence key={`wh${c.id}`} from={c.from} durationInFrames={fps * 2} layout="none">
          <Html5Audio src={staticFile('audio/whoosh.wav')} volume={0.35} />
        </Sequence>
      ))}
      {speech.filter((s) => s.has_file).map((s) => (
        <Sequence key={`v${s.seg}`} from={s.from} durationInFrames={s.frames + 6} layout="none">
          <Html5Audio src={staticFile(`audio/voice/${s.file}`)} volume={s.speaker === 'hypnos' ? 0.95 : 1} />
        </Sequence>
      ))}
      {outro && (
        <Sequence from={outro.from} durationInFrames={outro.frames} layout="none">
          <Html5Audio src={staticFile('audio/lyre_lullaby.wav')}
            volume={(f) => interpolate(f, [0, 48, outro.frames - fps * 15, outro.frames], [0, 0.55, 0.4, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

const SceneLayer: React.FC<{id: string; clip: boolean; frames: number}> = ({id, clip, frames}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 48], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <SceneBackdrop id={id} clip={clip} frames={frames} />
    </AbsoluteFill>
  );
};
