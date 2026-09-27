// Generates Mining Puzzle Game artwork (icon, adaptive icon, splash, logo, backgrounds) as PNG.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// Usage: node scripts/generate-art.js  (writes into assets/images)
const OUT = process.argv[2] || path.join(__dirname, "..", "assets", "images");
const C = {
  graphite: '#1C1F24',
  graphite2: '#262A31',
  orange: '#FF7A1A',
  orangeDark: '#E05E00',
  yellow: '#FFC93C',
  yellowDark: '#E0A91E',
  cyan: '#3EC1D3',
  cream: '#F4F1EC',
  ore: '#C97A3D',
  dirt: '#B98A5E',
  steel: '#3A3F46',
  hub: '#8A8F98',
};

/** Side-view excavator facing right, bucket raised to the right. Local box ~220x150. */
function excavator(tx, ty, s, opts = {}) {
  const body = opts.body || C.yellow;
  const shade = opts.shade || C.yellowDark;
  const dark = opts.dark || C.graphite;
  return `<g transform="translate(${tx} ${ty}) scale(${s})">
    <rect x="8" y="112" width="128" height="30" rx="15" fill="${dark}"/>
    <circle cx="24" cy="127" r="9" fill="${C.hub}"/><circle cx="72" cy="127" r="7" fill="${C.hub}"/><circle cx="120" cy="127" r="9" fill="${C.hub}"/>
    <rect x="30" y="102" width="84" height="12" rx="3" fill="${dark}"/>
    <rect x="6" y="70" width="30" height="36" rx="6" fill="${shade}"/>
    <rect x="22" y="66" width="98" height="40" rx="8" fill="${body}"/>
    <path d="M58 68 L58 26 Q58 20 64 20 L92 20 Q98 20 100 26 L108 68 Z" fill="${body}"/>
    <path d="M66 30 L90 30 L97 60 L66 60 Z" fill="${C.cyan}"/>
    <path d="M66 30 L76 30 L70 60 L66 60 Z" fill="#ffffff" opacity="0.35"/>
    <path d="M104 84 L118 72 L170 14 L184 22 L132 88 Z" fill="${shade}"/>
    <path d="M170 14 L184 22 L214 92 L200 98 Z" fill="${body}"/>
    <circle cx="176" cy="18" r="7" fill="${dark}"/>
    <path d="M196 90 L222 86 L226 112 L208 122 L192 110 Z" fill="${dark}"/>
    <path d="M208 122 L212 128 M216 118 L221 124 M222 112 L228 116" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
  </g>`;
}

/** Side-view dump truck facing right with a heaped load. Local box ~240x135. */
function truck(tx, ty, s, opts = {}) {
  const bed = opts.bed || C.orange;
  const bedShade = opts.bedShade || C.orangeDark;
  const dark = opts.dark || C.graphite;
  const load = opts.load === false ? '' : `<path d="M14 26 Q40 -6 78 6 Q110 -8 146 24 Z" fill="${opts.loadColor || C.ore}"/>
      <circle cx="60" cy="10" r="6" fill="${C.dirt}"/><circle cx="96" cy="8" r="5" fill="${C.dirt}"/>`;
  return `<g transform="translate(${tx} ${ty}) scale(${s})">
    ${load}
    <path d="M0 22 L152 22 L148 88 L24 88 Z" fill="${bed}"/>
    <path d="M0 22 L152 22 L151 32 L2 32 Z" fill="${bedShade}"/>
    <path d="M50 36 L48 84 M96 36 L96 84" stroke="${bedShade}" stroke-width="6"/>
    <path d="M158 38 L204 38 Q212 38 216 46 L228 70 L228 90 L158 90 Z" fill="${C.cream}"/>
    <path d="M168 46 L202 46 L214 68 L168 68 Z" fill="${C.cyan}"/>
    <rect x="12" y="88" width="220" height="14" rx="4" fill="${dark}"/>
    <circle cx="52" cy="108" r="26" fill="${dark}"/><circle cx="52" cy="108" r="11" fill="${C.hub}"/>
    <circle cx="190" cy="108" r="26" fill="${dark}"/><circle cx="190" cy="108" r="11" fill="${C.hub}"/>
  </g>`;
}

/** Stylized open-pit terraces: stacked benches forming a bowl. */
function terraces(w, h, top, palette) {
  const bands = palette.length;
  let out = '';
  for (let i = 0; i < bands; i += 1) {
    const y = top + ((h - top) * i) / bands;
    const inset = (w * 0.06) * i;
    out += `<path d="M${-20 + inset * 0.3} ${y} Q${w / 2} ${y + 40 + i * 18} ${w + 20 - inset * 0.3} ${y} L${w + 20} ${h + 20} L-20 ${h + 20} Z" fill="${palette[i]}"/>`;
    out += `<path d="M${-20 + inset * 0.3} ${y} Q${w / 2} ${y + 40 + i * 18} ${w + 20 - inset * 0.3} ${y}" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="4"/>`;
  }
  return out;
}

function render(svg, file, width) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  fs.writeFileSync(path.join(OUT, file), png);
  console.log('wrote', file, png.length);
}

/* ---------- Emblem (icon subject) ---------- */
function emblemMachines(cx, cy, scale) {
  // Excavator on the left loading the truck on the right; composition box ~520x200 centred on (cx, cy).
  const s = scale;
  return `
    <ellipse cx="${cx}" cy="${cy + 92 * s}" rx="${270 * s}" ry="${22 * s}" fill="#000000" opacity="0.25"/>
    ${truck(cx - 30 * s, cy - 50 * s, 1.15 * s)}
    ${excavator(cx - 290 * s, cy - 78 * s, 1.15 * s)}`;
}

const ICON = 1024;
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}" viewBox="0 0 ${ICON} ${ICON}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="75%">
      <stop offset="0" stop-color="${C.graphite2}"/><stop offset="1" stop-color="${C.graphite}"/>
    </radialGradient>
  </defs>
  <rect width="${ICON}" height="${ICON}" fill="url(#bg)"/>
  <circle cx="512" cy="420" r="250" fill="${C.orange}"/>
  <circle cx="512" cy="420" r="250" fill="${C.yellow}" opacity="0.25"/>
  ${terraces(ICON, ICON, 600, ['#8D6A4A', '#A57C55', '#B98A5E', '#CFA274'])}
  ${emblemMachines(512, 600, 1)}
</svg>`;
render(iconSvg, 'icon.png', 1024);

// Android adaptive foreground: subject inside the 66% safe zone, transparent background.
const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}" viewBox="0 0 ${ICON} ${ICON}">
  <circle cx="512" cy="470" r="190" fill="${C.orange}"/>
  ${emblemMachines(512, 560, 0.62)}
</svg>`;
render(adaptiveSvg, 'adaptive-icon.png', 1024);

// Splash + in-app logo: transparent emblem.
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <circle cx="512" cy="440" r="300" fill="${C.orange}"/>
  <circle cx="512" cy="440" r="300" fill="${C.yellow}" opacity="0.22"/>
  ${emblemMachines(512, 560, 0.85)}
</svg>`;
render(logoSvg, 'splash-icon.png', 1024);
render(logoSvg, 'logo.png', 512);

/* ---------- Backgrounds ---------- */
const W = 1080;
const H = 1920;

function scene({ sky, sun, sunY, mountains, bands, dust }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      ${sky.map((c, i) => `<stop offset="${i / (sky.length - 1)}" stop-color="${c}"/>`).join('')}
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="${W * 0.72}" cy="${sunY}" r="150" fill="${sun}" opacity="0.9"/>
  <path d="M-20 820 L180 600 L330 720 L520 520 L700 700 L860 580 L1100 780 L1100 1000 L-20 1000 Z" fill="${mountains[0]}"/>
  <path d="M-20 900 L240 720 L420 840 L640 660 L860 820 L1100 700 L1100 1100 L-20 1100 Z" fill="${mountains[1]}"/>
  ${terraces(W, H, 960, bands)}
  <!-- Haul road zig-zagging down the benches -->
  <path d="M1000 980 L260 1120 L860 1290 L300 1460 L760 1640 L540 1920" fill="none" stroke="#E8DCC8" stroke-opacity="0.55" stroke-width="46" stroke-linejoin="round"/>
  <path d="M1000 980 L260 1120 L860 1290 L300 1460 L760 1640 L540 1920" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="4" stroke-dasharray="26 30" stroke-linejoin="round"/>
  ${truck(660, 1190, 0.55)}
  ${truck(330, 1375, 0.5, { load: false })}
  ${excavator(120, 1570, 0.75)}
  ${truck(330, 1590, 0.62)}
  <!-- Dust -->
  ${dust.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="0.18"/>`).join('')}
  <!-- Cones and rocks -->
  <path d="M900 1500 L920 1460 L940 1500 Z" fill="${C.orange}"/><path d="M160 1260 L178 1224 L196 1260 Z" fill="${C.orange}"/>
  <ellipse cx="980" cy="1760" rx="60" ry="26" fill="#8D7B6A"/><ellipse cx="80" cy="1400" rx="44" ry="20" fill="#8D7B6A"/>
</svg>`;
}

render(
  scene({
    sky: ['#2A2233', '#7A4A3A', '#E0874A', '#F6C27A'],
    sun: C.yellow,
    sunY: 700,
    mountains: ['#5A4238', '#6E5040'],
    bands: ['#7E5C40', '#946B4A', '#A97C55', '#BF9063', '#D3A777'],
    dust: [[720, 1260, 26], [690, 1275, 18], [380, 1440, 22], [420, 1655, 28]],
  }),
  'bg-home.png',
  W,
);

render(
  scene({
    sky: ['#BFE3EA', '#DDEFF0', '#F4F1EC'],
    sun: '#FFE3A3',
    sunY: 560,
    mountains: ['#B7C3BE', '#A9B2A2'],
    bands: ['#C9B08E', '#D4BC9A', '#DDC8A8', '#E6D4B6', '#EEE0C6'],
    dust: [[720, 1260, 22], [400, 1450, 18]],
  }),
  'bg-induction.png',
  W,
);
