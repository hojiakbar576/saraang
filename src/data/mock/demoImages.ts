/**
 * DEMO ONLY — generates simple studio-style garment illustrations as SVG data
 * URLs so the storefront can be reviewed without real product photography.
 * Real photos (Supabase Storage URLs) replace these in Phase 2; nothing else
 * in the app depends on this file except the mock catalog.
 */

export type GarmentShape =
  | 'tshirt'
  | 'knit'
  | 'shirt'
  | 'coat'
  | 'trousers'
  | 'dress'
  | 'skirt'
  | 'bag';

type Frame = 'front' | 'detail' | 'alt';

const BACKGROUNDS: Record<Frame, string> = {
  front: '#efebe4',
  alt: '#e3dcd0',
  detail: '#f3f1ec',
};

const SHAPES: Record<GarmentShape, { body: string; details: string }> = {
  tshirt: {
    body: 'M300 230 L362 208 Q400 250 438 208 L500 230 L612 300 L568 378 L515 350 L515 790 L285 790 L285 350 L232 378 L188 300 Z',
    details: 'M285 770 L515 770 M362 208 Q400 268 438 208',
  },
  knit: {
    body: 'M300 230 L362 208 Q400 252 438 208 L500 230 L562 282 L614 660 L560 676 L515 365 L515 790 L285 790 L285 365 L240 676 L186 660 L238 282 Z',
    details:
      'M285 760 L515 760 M285 772 L515 772 M554 640 L606 626 M246 640 L194 626 M362 208 Q400 268 438 208',
  },
  shirt: {
    body: 'M300 230 L360 206 L400 238 L440 206 L500 230 L562 282 L612 660 L560 676 L515 365 L515 800 L285 800 L285 365 L240 676 L188 660 L238 282 Z',
    details:
      'M360 206 L398 262 L376 290 L344 228 M440 206 L402 262 L424 290 L456 228 M400 262 L400 800 M554 636 L604 624 M246 636 L196 624',
  },
  coat: {
    body: 'M298 200 L360 184 L400 238 L440 184 L502 200 L566 262 L622 712 L570 728 L522 388 L534 888 L266 888 L278 388 L230 728 L178 712 L234 262 Z',
    details:
      'M360 184 L388 430 L400 440 M440 184 L412 430 L400 440 M400 440 L400 888 M300 600 L360 600 M440 600 L500 600',
  },
  trousers: {
    body: 'M288 180 L512 180 L546 902 L432 902 L400 372 L368 902 L254 902 Z',
    details: 'M290 218 L510 218 M330 260 L312 880 M470 260 L488 880 M400 218 L400 330',
  },
  dress: {
    body: 'M348 196 L368 196 Q400 238 432 196 L452 196 L472 428 Q560 700 594 886 L206 886 Q240 700 328 428 Z',
    details: 'M328 428 L472 428 M360 470 Q330 700 300 880 M440 470 Q470 700 500 880',
  },
  skirt: {
    body: 'M318 270 L482 270 L574 772 Q400 806 226 772 Z',
    details: 'M322 306 L478 306 M360 320 L320 780 M400 320 L400 790 M440 320 L480 780',
  },
  bag: {
    body: 'M248 392 L552 392 L572 812 L228 812 Z',
    details: 'M318 392 Q318 214 400 214 Q482 214 482 392 M248 450 L552 450',
  },
};

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function demoGarmentImage(shape: GarmentShape, hex: string, frame: Frame = 'front'): string {
  const { body, details } = SHAPES[shape];
  const dark = luminance(hex) < 0.35;
  const seam = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
  const outline = dark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.10)';
  const viewBox = frame === 'detail' ? '220 160 360 450' : '0 0 800 1000';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">
<rect x="0" y="0" width="800" height="1000" fill="${BACKGROUNDS[frame]}"/>
<ellipse cx="400" cy="930" rx="250" ry="22" fill="rgba(0,0,0,0.06)"/>
<path d="${body}" fill="${hex}" stroke="${outline}" stroke-width="2" stroke-linejoin="round"/>
<path d="${details}" fill="none" stroke="${seam}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<text x="760" y="970" text-anchor="end" font-family="Arial, sans-serif" font-size="16" letter-spacing="4" fill="rgba(0,0,0,0.28)">DEMO</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
