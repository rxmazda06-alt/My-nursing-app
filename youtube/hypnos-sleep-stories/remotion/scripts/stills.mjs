// Render the YouTube thumbnail and channel art from one bundle.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
const root = process.cwd();
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts')});
const H = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(H) ? H : null;
const jobs = [
  ['Thumbnail', 'out/thumbnail.jpg', 0.6667, 'jpeg'],
  ['ChannelAvatar', 'out/channel_avatar.png', 1, 'png'],
  ['ChannelBanner', 'out/channel_banner.jpg', 1, 'jpeg'],
];
for (const [id, output, scale, imageFormat] of jobs) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  await renderStill({composition, serveUrl, output: path.join(root, output), scale, imageFormat, ...(imageFormat === 'jpeg' ? {jpegQuality: 92} : {}), browserExecutable});
  console.log('rendered', output);
}
