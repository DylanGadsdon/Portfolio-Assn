// public/js/world/art.js — every drawing in the world, as SVG.
//
// SVG is a text format for vector drawings: shapes described with numbers.
// Because each drawing becomes a real element on the page, the browser can
// animate it, hover it and drag it like any other HTML element.
// All creatures face RIGHT; the code flips them to swim left.

export const art = {
  gull: `
<svg viewBox="0 0 80 40" class="art gull">
  <g class="wing wing-back"><path d="M38 20 Q24 4 6 10 Q22 12 34 22Z" fill="#c9d3dc"/></g>
  <ellipse cx="42" cy="22" rx="16" ry="6.5" fill="#fbfdff"/>
  <path d="M26 21 L16 18 L18 24Z" fill="#dfe6ec"/>
  <circle cx="56" cy="19" r="5.5" fill="#fbfdff"/>
  <path d="M60.5 19 L68 20.5 L60.5 21.5Z" fill="#f2b233"/>
  <circle cx="57.5" cy="18" r="1" fill="#1b2430"/>
  <g class="wing wing-front"><path d="M42 20 Q50 2 70 4 Q54 10 46 23Z" fill="#aeb9c4"/><path d="M62 5 Q68 4 70 4 Q66 7 63 8Z" fill="#2b3440"/></g>
</svg>`,

  dolphin: `
<svg viewBox="0 0 140 60" class="art dolphin">
  <defs><linearGradient id="g-dolphin" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5f7f99"/><stop offset=".55" stop-color="#7f9cb4"/><stop offset="1" stop-color="#dfe9f1"/></linearGradient></defs>
  <path d="M8 30 Q2 18 4 12 Q12 22 20 27 Q50 12 92 18 Q116 21 126 30 Q134 31 138 34 Q128 36 120 35 Q100 44 60 42 Q34 42 20 34 Q10 42 4 50 Q4 40 8 30Z" fill="url(#g-dolphin)"/>
  <path d="M70 18 Q74 4 86 0 Q82 10 84 19Z" fill="#56748c"/>
  <path d="M74 40 Q70 50 60 54 Q66 46 66 41Z" fill="#56748c"/>
  <circle cx="114" cy="27" r="1.8" fill="#14202b"/>
  <path d="M118 33 Q126 34 134 33.5" stroke="#3d566b" stroke-width="1.2" fill="none"/>
</svg>`,

  turtle: `
<svg viewBox="0 0 110 70" class="art turtle">
  <path d="M30 46 Q14 60 4 62 Q14 50 24 42Z" fill="#6f9b5a"/>
  <path d="M76 46 Q96 64 106 62 Q94 52 82 42Z" fill="#6f9b5a"/>
  <path d="M28 26 Q10 10 2 14 Q14 22 26 34Z" fill="#7aa864"/>
  <path d="M74 24 Q96 4 108 10 Q94 20 80 34Z" fill="#7aa864"/>
  <ellipse cx="94" cy="34" rx="13" ry="9" fill="#86b46e"/>
  <circle cx="101" cy="31" r="1.8" fill="#162013"/>
  <ellipse cx="52" cy="36" rx="34" ry="22" fill="#3e6b3a"/>
  <g fill="#5d8f4f" stroke="#2c4f2a" stroke-width="1.5">
    <path d="M52 18 L62 24 L62 36 L52 42 L42 36 L42 24Z"/>
    <path d="M30 26 L40 24 L42 36 L34 44 L24 38Z"/>
    <path d="M74 26 L64 24 L62 36 L70 44 L80 38Z"/>
    <path d="M42 36 L52 42 L50 54 L36 52 L34 44Z"/>
    <path d="M62 36 L52 42 L54 54 L68 52 L70 44Z"/>
  </g>
  <path d="M18 36 Q10 38 6 36 Q10 33 18 34Z" fill="#6f9b5a"/>
</svg>`,

  whale: `
<svg viewBox="0 0 400 150" class="art whale">
  <defs><linearGradient id="g-whale" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#253445"/><stop offset=".6" stop-color="#2f4257"/><stop offset="1" stop-color="#8c9fb2"/></linearGradient></defs>
  <path class="fluke" d="M40 68 Q18 40 2 38 Q14 60 30 74 Q14 92 4 114 Q22 106 42 80Z" fill="#253445"/>
  <path d="M34 74 Q90 40 200 42 Q300 44 360 62 Q392 72 396 86 Q388 104 350 108 Q260 116 170 108 Q90 102 34 80Z" fill="url(#g-whale)"/>
  <g stroke="#56697d" stroke-width="2" fill="none" opacity=".8">
    <path d="M250 104 Q320 104 372 94"/><path d="M240 110 Q316 112 368 100"/><path d="M236 98 Q300 98 376 86"/>
  </g>
  <path class="pec" d="M260 98 Q240 140 170 148 Q200 132 236 98Z" fill="#7d91a6"/>
  <path d="M122 46 Q130 36 142 44Z" fill="#253445"/>
  <g fill="#3d5168"><circle cx="350" cy="60" r="3"/><circle cx="362" cy="64" r="2.6"/><circle cx="372" cy="69" r="2.2"/><circle cx="340" cy="58" r="2.6"/></g>
  <circle cx="330" cy="82" r="3" fill="#0d151e"/>
</svg>`,

  squid: `
<svg viewBox="0 0 320 120" class="art squid">
  <defs><linearGradient id="g-squid" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7c2a2a"/><stop offset="1" stop-color="#b8493f"/></linearGradient></defs>
  <g class="arms" stroke="#a23c35" stroke-linecap="round" fill="none">
    <path d="M110 60 Q70 40 30 52 Q10 58 2 48" stroke-width="5"/>
    <path d="M110 62 Q70 74 34 66 Q14 62 4 72" stroke-width="5"/>
    <path d="M112 58 Q80 48 50 40" stroke-width="7"/>
    <path d="M112 60 Q80 60 46 58" stroke-width="7"/>
    <path d="M112 64 Q80 74 52 80" stroke-width="7"/>
    <path d="M114 56 Q90 44 64 36" stroke-width="6"/>
    <path d="M114 66 Q90 80 66 86" stroke-width="6"/>
  </g>
  <path d="M110 46 Q170 32 250 40 Q284 44 300 60 Q284 76 250 80 Q170 88 110 74 Q102 60 110 46Z" fill="url(#g-squid)"/>
  <path d="M268 44 Q298 30 318 60 Q298 90 268 76Z" fill="#9b3a33"/>
  <circle cx="132" cy="58" r="9" fill="#f2e6c8"/><circle cx="134" cy="58" r="5" fill="#120808"/>
  <g fill="#d36a5c" opacity=".55"><circle cx="180" cy="50" r="3"/><circle cx="210" cy="66" r="4"/><circle cx="236" cy="52" r="3"/><circle cx="196" cy="70" r="2"/></g>
</svg>`,

  jelly: `
<svg viewBox="0 0 60 100" class="art jelly">
  <defs><radialGradient id="g-jelly" cx=".5" cy=".4" r=".6">
    <stop offset="0" stop-color="#f7b6ff" stop-opacity=".95"/><stop offset="1" stop-color="#8a3cff" stop-opacity=".35"/></radialGradient></defs>
  <g class="tentacles" stroke="#d89cff" stroke-width="1.6" fill="none" opacity=".75">
    <path d="M16 34 Q10 56 18 76 Q24 90 16 98"/><path d="M26 36 Q22 60 30 80"/><path d="M34 36 Q40 58 32 82 Q28 92 34 98"/><path d="M44 34 Q50 54 44 74"/>
  </g>
  <path d="M4 34 Q4 4 30 4 Q56 4 56 34 Q48 30 42 36 Q36 30 30 36 Q24 30 18 36 Q12 30 4 34Z" fill="url(#g-jelly)"/>
  <ellipse cx="30" cy="20" rx="10" ry="6" fill="#ffe3ff" opacity=".6"/>
</svg>`,

  angler: `
<svg viewBox="0 0 120 80" class="art angler">
  <path d="M60 18 Q76 0 98 6" stroke="#5b4a3a" stroke-width="2" fill="none"/>
  <circle class="lure" cx="99" cy="7" r="5" fill="#d8ffef"/>
  <path d="M24 40 Q6 22 2 24 Q8 40 2 58 Q8 58 24 44Z" fill="#3b2f27"/>
  <path d="M22 40 Q30 14 70 16 Q104 20 112 42 Q106 66 70 68 Q34 68 22 40Z" fill="#4a3a2f"/>
  <path d="M84 48 Q100 46 114 40 Q108 58 92 60 Q84 58 84 48Z" fill="#1a120d"/>
  <g fill="#eee"><path d="M88 49 l2 5 l2 -5Z"/><path d="M94 48 l2 6 l2 -6Z"/><path d="M100 46 l2 6 l2 -6Z"/><path d="M106 44 l1.6 5 l1.6 -5Z"/><path d="M92 60 l2 -5 l2 5Z"/><path d="M98 59 l2 -5 l2 5Z"/></g>
  <circle cx="84" cy="32" r="5" fill="#d4e6ff"/><circle cx="85" cy="32" r="2.5" fill="#05070a"/>
</svg>`,

  fish: `
<svg viewBox="0 0 120 70" class="art fish">
  <g fill="#ffd166">
    <path d="M10 20 Q22 10 34 20 Q22 30 10 20Z"/><path d="M10 20 L2 14 L2 26Z"/>
    <path d="M44 10 Q56 0 68 10 Q56 20 44 10Z"/><path d="M44 10 L36 4 L36 16Z"/>
    <path d="M76 26 Q88 16 100 26 Q88 36 76 26Z"/><path d="M76 26 L68 20 L68 32Z"/>
    <path d="M30 44 Q42 34 54 44 Q42 54 30 44Z"/><path d="M30 44 L22 38 L22 50Z"/>
    <path d="M66 54 Q78 44 90 54 Q78 64 66 54Z"/><path d="M66 54 L58 48 L58 60Z"/>
    <path d="M94 46 Q104 38 116 46 Q104 54 94 46Z"/><path d="M94 46 L88 41 L88 51Z"/>
  </g>
</svg>`,

  guy: `
<svg viewBox="0 0 40 64" class="art guy">
  <ellipse cx="20" cy="62" rx="12" ry="2" fill="#000" opacity=".15"/>
  <path d="M13 44 L12 60 L18 60 L19 46Z" fill="#26313d"/><path d="M27 44 L28 60 L22 60 L21 46Z" fill="#26313d"/>
  <path d="M9 26 Q20 20 31 26 L30 46 L10 46Z" fill="#ff7a29"/>
  <path class="arm-wave" d="M30 28 Q38 22 38 12" stroke="#ff7a29" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M10 28 Q4 34 6 42" stroke="#ff7a29" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="20" cy="16" r="8" fill="#f2c9a0"/>
  <path d="M11 15 Q12 4 20 4 Q28 4 29 15 Z" fill="#20374d"/><circle cx="20" cy="3" r="3" fill="#ffd166"/>
  <circle cx="17" cy="17" r="1" fill="#222"/><circle cx="23" cy="17" r="1" fill="#222"/>
  <path d="M18 21 Q20 22.5 22 21" stroke="#9b5b3c" stroke-width="1" fill="none"/>
</svg>`,

  rocket: `
<svg viewBox="0 0 60 130" class="art rocket">
  <g class="flame"><path d="M20 108 Q30 140 40 108 Q30 118 20 108Z" fill="#ffb02e"/><path d="M24 108 Q30 128 36 108Z" fill="#fff2a8"/></g>
  <path d="M14 82 L2 108 L18 100Z" fill="#d6423a"/><path d="M46 82 L58 108 L42 100Z" fill="#d6423a"/>
  <path d="M30 2 Q50 24 48 70 L46 102 L14 102 L12 70 Q10 24 30 2Z" fill="#f1efe9"/>
  <path d="M30 2 Q42 14 46 30 L14 30 Q18 14 30 2Z" fill="#d6423a"/>
  <circle cx="30" cy="54" r="9" fill="#2b4d6e" stroke="#9aa6b1" stroke-width="3"/>
  <circle cx="27" cy="51" r="3" fill="#8fd3ff" opacity=".8"/>
  <rect x="14" y="94" width="32" height="8" fill="#9aa6b1"/>
  <path d="M26 102 L26 110 L34 110 L34 102Z" fill="#5a6672"/>
</svg>`,

  station: `
<svg viewBox="0 0 360 160" class="art station">
  <g class="panels" fill="#1d3f7a" stroke="#8fb3e8" stroke-width="1">
    <rect x="10" y="10" width="70" height="40"/><rect x="10" y="110" width="70" height="40"/>
    <rect x="280" y="10" width="70" height="40"/><rect x="280" y="110" width="70" height="40"/>
  </g>
  <g stroke="#5f7da8" stroke-width=".8" opacity=".7">
    <path d="M27 10 V50 M45 10 V50 M63 10 V50 M27 110 V150 M45 110 V150 M63 110 V150 M297 10 V50 M315 10 V50 M333 10 V50 M297 110 V150 M315 110 V150 M333 110 V150"/>
  </g>
  <rect x="44" y="76" width="272" height="8" fill="#b7bec7"/>
  <g stroke="#b7bec7" stroke-width="3"><path d="M45 50 V110 M315 50 V110"/></g>
  <rect x="140" y="62" width="80" height="36" rx="16" fill="#e9ecef"/>
  <rect x="120" y="70" width="24" height="20" rx="4" fill="#d3d8de"/><rect x="216" y="70" width="24" height="20" rx="4" fill="#d3d8de"/>
  <rect x="168" y="44" width="24" height="20" rx="4" fill="#d3d8de"/><rect x="168" y="96" width="24" height="18" rx="4" fill="#d3d8de"/>
  <g fill="#ffd166"><circle cx="160" cy="80" r="3"/><circle cx="180" cy="80" r="3"/><circle cx="200" cy="80" r="3"/></g>
  <rect x="120" y="66" width="16" height="4" fill="#ff5b5b" class="beacon"/>
</svg>`,

  // An original alien warship: an angular wedge with a ribbed spine and green reactor vents.
  warship: `
<svg viewBox="0 0 520 220" class="art warship">
  <defs><linearGradient id="g-war" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a2f38"/><stop offset=".5" stop-color="#14171d"/><stop offset="1" stop-color="#0a0b0e"/></linearGradient></defs>
  <path d="M6 110 L140 40 L420 22 L516 70 L490 110 L516 150 L420 198 L140 180Z" fill="url(#g-war)" stroke="#3b4350" stroke-width="2"/>
  <path d="M140 40 L190 110 L140 180" stroke="#3b4350" stroke-width="2" fill="none"/>
  <g stroke="#454e5c" stroke-width="3">
    <path d="M220 30 L236 110 L220 190"/><path d="M270 27 L286 110 L270 193"/><path d="M320 25 L336 110 L320 195"/><path d="M370 23 L386 110 L370 197"/>
  </g>
  <g class="vents" fill="#7dff9a"><rect x="470" y="88" width="28" height="8"/><rect x="470" y="124" width="28" height="8"/><rect x="430" y="104" width="34" height="12"/></g>
  <g class="guns" fill="#b6ffc6"><circle cx="30" cy="110" r="7"/><circle cx="150" cy="58" r="5"/><circle cx="150" cy="162" r="5"/></g>
  <g fill="#7dff9a" opacity=".55"><rect x="240" y="104" width="8" height="12"/><rect x="290" y="104" width="8" height="12"/><rect x="340" y="104" width="8" height="12"/></g>
</svg>`,

  submarine: `
<svg viewBox="0 0 260 120" class="art submarine">
  <defs><linearGradient id="g-sub" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f6c64b"/><stop offset="1" stop-color="#b37e17"/></linearGradient></defs>
  <path d="M132 34 L132 8 L150 8" stroke="#8a6212" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M110 46 L118 24 L170 24 L178 46Z" fill="#d9a42e"/>
  <path class="prop" d="M14 58 L2 40 L8 76Z" fill="#8a6212"/>
  <path d="M16 60 Q16 42 60 42 L210 42 Q256 44 258 66 Q256 88 210 90 L60 90 Q16 90 16 72Z" fill="url(#g-sub)"/>
  <g fill="#ffe9a8" stroke="#8a6212" stroke-width="3"><circle cx="110" cy="66" r="10"/><circle cx="150" cy="66" r="10"/><circle cx="190" cy="66" r="10"/></g>
  <g fill="#fff8d6" opacity=".9"><circle cx="107" cy="63" r="3"/><circle cx="147" cy="63" r="3"/><circle cx="187" cy="63" r="3"/></g>
  <path class="beam" d="M258 64 L420 30 L420 100Z" fill="#fff6c2" opacity=".18"/>
</svg>`,

  balloon: `
<svg viewBox="0 0 60 90" class="art balloon">
  <path d="M30 2 Q56 2 56 30 Q56 52 32 66 L28 66 Q4 52 4 30 Q4 2 30 2Z" fill="currentColor"/>
  <path d="M30 2 Q40 10 40 34 Q38 54 30 66 Q22 54 20 34 Q20 10 30 2Z" fill="#fff" opacity=".18"/>
  <path d="M30 66 L30 88" stroke="#c9d6e3" stroke-width="1.2"/>
  <rect x="25" y="64" width="10" height="5" rx="1" fill="#6b4d33"/>
</svg>`,

  buoy: `
<svg viewBox="0 0 80 110" class="art buoy">
  <rect x="36" y="4" width="8" height="30" fill="#5a6672"/><circle cx="40" cy="6" r="5" fill="#ffd166" class="buoy-light"/>
  <path d="M14 34 L66 34 L58 80 L22 80Z" fill="#e8483f"/>
  <rect x="17" y="50" width="46" height="10" fill="#f6f2ea"/>
  <path d="M10 80 Q40 92 70 80 L66 96 Q40 108 14 96Z" fill="#c23a32"/>
</svg>`,
};

// Small person icon for the population counter
export const personIcon = `<svg viewBox="0 0 12 16" width="10" height="14"><circle cx="6" cy="3.4" r="3" fill="currentColor"/><path d="M1 16 Q1 8 6 8 Q11 8 11 16Z" fill="currentColor"/></svg>`;
