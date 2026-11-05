import {Config} from '@remotion/cli/config';

// Use the Chromium headless shell that ships in this environment (no download needed).
const HEADLESS = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
import fs from 'fs';
if (fs.existsSync(HEADLESS)) {
  Config.setBrowserExecutable(HEADLESS);
}
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(88);
Config.setCodec('h264');
Config.setCrf(24);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(4);
