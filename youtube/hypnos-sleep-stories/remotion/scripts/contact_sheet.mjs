// Render several stills from one bundle, then tile them into a contact sheet with ffmpeg.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const frames = JSON.parse(fs.readFileSync(path.join(root, 'out/frames.json'), 'utf8'));
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts')});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const composition = await selectComposition({serveUrl, id: 'Episode', browserExecutable});
fs.mkdirSync(path.join(root, 'out/stills'), {recursive: true});
for (const [name, frame] of Object.entries(frames)) {
  await renderStill({composition, serveUrl, frame, output: path.join(root, `out/stills/${name}.jpg`), imageFormat: 'jpeg', scale: 0.5, browserExecutable});
  console.log('still', name, frame);
}
const thumb = await selectComposition({serveUrl, id: 'Thumbnail', browserExecutable});
await renderStill({composition: thumb, serveUrl, output: path.join(root, 'out/thumbnail.png'), scale: 0.6667, browserExecutable});
console.log('thumbnail done');
