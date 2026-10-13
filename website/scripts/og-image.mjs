import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const here = dirname(fileURLToPath(import.meta.url))
const fonts = resolve(here, '../../ios/Unearth/Resources/Fonts')

const pin = (x, y, fill, inner, stroke) => `
  <g transform="translate(${x - 26} ${y - 64}) scale(1.55)">
    <path d="M17 41s14-13.4 14-24A14 14 0 0 0 3 17c0 10.6 14 24 14 24Z" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="2.5"` : ''}/>
    <path d="M11 16l2.5-3.5h7L23 16l-6 7z" fill="${inner}"/>
  </g>`

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <clipPath id="panel"><rect x="760" y="50" width="390" height="530" rx="40"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="#F6F7F5"/>

  <g transform="translate(70 70)">
    <rect width="76" height="76" rx="17" fill="#E3F0E8"/>
    <g transform="scale(0.76)">
      <path d="M28 28v24a22 22 0 0 0 44 0V28" fill="none" stroke="#1F6B4F" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M39 44l5-7h12l5 7-11 13z" fill="#A85F0A"/>
    </g>
    <text x="96" y="52" font-family="Bricolage Grotesque" font-weight="700" font-size="44" fill="#15201B" letter-spacing="-1">Unearth</text>
  </g>

  <g font-family="Bricolage Grotesque" font-weight="700" font-size="86" letter-spacing="-3" fill="#15201B">
    <text x="66" y="290">The best places</text>
    <text x="66" y="384">aren’t on the</text>
    <text x="66" y="478"><tspan fill="#56635C">top-10</tspan> lists.</text>
  </g>
  <rect x="62" y="446" width="__STRIKE__" height="9" rx="4.5" fill="#A85F0A"/>

  <text x="70" y="552" font-family="DM Sans" font-weight="500" font-size="26" fill="#56635C">Hidden places, shared by people who’ve been there.</text>

  <g clip-path="url(#panel)">
    <rect x="760" y="50" width="390" height="530" fill="#EEF2EC"/>
    <ellipse cx="1090" cy="120" rx="110" ry="70" fill="#DCEBDD"/>
    <ellipse cx="800" cy="540" rx="120" ry="80" fill="#DCEBDD"/>
    <g fill="none" stroke="#FFFFFF" stroke-linecap="round">
      <path d="M740 210 C 860 230, 960 160, 1170 200" stroke-width="16"/>
      <path d="M950 30 C 940 200, 1000 360, 970 600" stroke-width="16"/>
      <path d="M740 420 C 860 390, 1000 470, 1170 410" stroke-width="16"/>
      <path d="M840 30 L 880 600" stroke-width="8"/>
      <path d="M1080 30 C 1070 220, 1120 380, 1100 600" stroke-width="8"/>
    </g>
    ${pin(860, 200, '#1F6B4F', '#E3F0E8')}
    ${pin(1060, 170, '#FFFFFF', '#A85F0A', '#1F6B4F')}
    ${pin(1080, 390, '#FFFFFF', '#A85F0A', '#1F6B4F')}
    ${pin(850, 450, '#FFFFFF', '#A85F0A', '#1F6B4F')}
    ${pin(965, 330, '#A85F0A', '#FFFFFF')}
  </g>
</svg>`

function render(strikeWidth) {
  return new Resvg(svg.replace('__STRIKE__', String(strikeWidth)), {
    font: {
      loadSystemFonts: false,
      fontFiles: [
        `${fonts}/BricolageGrotesque-Bold.ttf`,
        `${fonts}/DMSans-Medium.ttf`,
      ],
      defaultFontFamily: 'DM Sans',
    },
  }).render()
}

const measure = new Resvg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><text x="0" y="120" font-family="Bricolage Grotesque" font-weight="700" font-size="86" letter-spacing="-3">top-10</text></svg>`,
  { font: { loadSystemFonts: false, fontFiles: [`${fonts}/BricolageGrotesque-Bold.ttf`] } },
)
const box = measure.getBBox()
const strike = Math.round((box?.width ?? 260) + 8)

const out = resolve(here, '../public/og-image.png')
writeFileSync(out, render(strike).asPng())
console.log(`wrote ${out} (strike ${strike}px)`)
