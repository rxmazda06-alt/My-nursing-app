import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';

export const FONT_TITLE = "'Cinzel', serif";
export const FONT_BODY = "'Cormorant Garamond', serif";

export const GOLD = '#f3d58b';
export const CREAM = '#f7eedc';
export const INK = '#0b0d24';

export type Palette = {
  top: string;      // sky top
  bottom: string;   // sky horizon
  glow: string;     // sun / moon / lamp glow
  hill1: string;    // far silhouette
  hill2: string;    // near silhouette
  stars: number;    // 0..1 star visibility
  orb: 'moon' | 'sun' | 'none';
  orbY: number;     // 0..1 vertical position
};

export const PALETTES: Record<string, Palette> = {
  s01_hypnos_cave:     {top: '#0b0f2e', bottom: '#2c2357', glow: '#ffd9a0', hill1: '#1a1840', hill2: '#0d0c22', stars: 1, orb: 'moon', orbY: 0.22},
  s02_kyllene_dawn:    {top: '#3a3f7a', bottom: '#f2a98c', glow: '#ffe2a8', hill1: '#6a5a8c', hill2: '#2e2a4a', stars: 0.25, orb: 'sun', orbY: 0.62},
  s03_pieria_sunset:   {top: '#3b2e6b', bottom: '#f39a6b', glow: '#ffc27a', hill1: '#7a4f6e', hill2: '#3a2a3f', stars: 0.15, orb: 'sun', orbY: 0.55},
  s04_alpheus_dawn:    {top: '#5a6aa8', bottom: '#f5c6a5', glow: '#fff0c8', hill1: '#7d86b0', hill2: '#39406a', stars: 0.1, orb: 'sun', orbY: 0.6},
  s05_apollo_tracks:   {top: '#4f86b5', bottom: '#f6dca0', glow: '#fff4cf', hill1: '#6f9a8c', hill2: '#3c5e52', stars: 0, orb: 'sun', orbY: 0.18},
  s06_cradle_innocent: {top: '#160f14', bottom: '#4a2a1c', glow: '#ffb46b', hill1: '#2a1a16', hill2: '#140c0b', stars: 0, orb: 'none', orbY: 0.5},
  s07_olympus_clouds:  {top: '#6b5aa8', bottom: '#ffd3b0', glow: '#fff1c4', hill1: '#f3d7e8', hill2: '#d9b8d8', stars: 0.05, orb: 'sun', orbY: 0.3},
  s08_lyre_river:      {top: '#4a3a7a', bottom: '#f0a87e', glow: '#ffd9a0', hill1: '#6e5a86', hill2: '#2f2748', stars: 0.2, orb: 'sun', orbY: 0.66},
  s09_moonlit_cradle:  {top: '#05071a', bottom: '#1b2050', glow: '#e9ecff', hill1: '#121638', hill2: '#080a1e', stars: 1, orb: 'moon', orbY: 0.2},
};

export const CUT_TITLES: Record<string, {kicker: string; title: string; tag: string}> = {
  c01_nature_doc:     {kicker: 'A NATURE DOCUMENTARY', title: 'WILD GODS OF ARCADIA', tag: 'Episode 1: The Newborn Leaves the Nest'},
  c02_backwards_cows: {kicker: 'MEANWHILE, IN THE MEADOW', title: 'NOTHING SUSPICIOUS', tag: 'Just fifty cows. Walking backwards. Normally.'},
  c03_heist_slowmo:   {kicker: 'THIS SUMMER', title: 'FIFTY COWS. ONE BABY.', tag: 'No witnesses. Probably.'},
  c04_keyhole_stealth:{kicker: 'TOP SECRET', title: 'OPERATION: KEYHOLE', tag: 'Agent Hermes. Age: one day.'},
  c05_noir_detective: {kicker: 'A GOLDEN AGE MYSTERY', title: 'THE CASE OF THE BACKWARDS COWS', tag: 'The tracks led everywhere. And nowhere.'},
  c06_one_eye_open:   {kicker: 'SUSPENSE', title: "...HE'S AWAKE.", tag: 'Rated Z for Zero Sleep'},
  c07_courtroom:      {kicker: 'COURT OF OLYMPUS', title: 'OLYMPUS v. BABY', tag: 'The defendant is wearing a blanket.'},
};

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
