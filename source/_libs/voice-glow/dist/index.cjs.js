"use strict";Object.defineProperties(exports,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}});const O=require("react/jsx-runtime"),u=require("react");function ht(n){const e=n.trim(),a=e.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(a){const t=a[1].length===3?a[1].split("").map(s=>s+s).join(""):a[1];return[parseInt(t.slice(0,2),16),parseInt(t.slice(2,4),16),parseInt(t.slice(4,6),16)]}const r=e.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);return r?[Math.round(+r[1]),Math.round(+r[2]),Math.round(+r[3])]:null}function Ga(n){const e=ht(n);return e?`rgb(${e[0]}, ${e[1]}, ${e[2]})`:null}function De(n){const e=ht(n);return e?`${e[0]}, ${e[1]}, ${e[2]}`:null}const pa={dark:{strokeOpacity:1.16,innerOpacity:.47,bloomOpacity:.89,innerShadow:"rgba(255, 255, 255, 0.1)",saturation:1.2,brightness:1.1},light:{strokeOpacity:1.2,innerOpacity:.85,bloomOpacity:.5,innerShadow:"rgba(0, 0, 0, 0.08)",saturation:1.6,brightness:.95,hueRange:40,hueDuration:8.5,hueBase:5,strength:.8,bandStrength:1.7}},be=[{x:0,w:74,h:46,band:0},{x:-36,w:54,h:40,band:1},{x:36,w:54,h:40,band:1},{x:-72,w:48,h:32,band:2},{x:72,w:48,h:32,band:2},{x:-108,w:42,h:26,band:1},{x:108,w:42,h:26,band:1}],va=36,ma=va*be.length,$a={colorful:{dark:["rgb(255, 70, 120)","rgb(60, 190, 255)","rgb(175, 70, 255)","rgb(60, 220, 130)","rgb(255, 150, 40)","rgb(90, 100, 255)","rgb(40, 200, 190)"],light:["rgb(255, 201, 21)","rgb(126, 196, 255)","rgb(180, 40, 230)","rgb(235, 100, 160)","rgb(255, 176, 122)","rgb(154, 160, 255)","rgb(127, 217, 238)"]},mono:{dark:["rgb(215, 215, 215)","rgb(180, 180, 180)","rgb(190, 190, 190)","rgb(160, 160, 160)","rgb(170, 170, 170)","rgb(150, 150, 150)","rgb(155, 155, 155)"],light:["rgb(60, 60, 60)","rgb(90, 90, 90)","rgb(85, 85, 85)","rgb(110, 110, 110)","rgb(105, 105, 105)","rgb(125, 125, 125)","rgb(120, 120, 120)"]},ocean:{dark:["rgb(80, 140, 255)","rgb(40, 200, 230)","rgb(120, 90, 255)","rgb(30, 170, 210)","rgb(160, 80, 240)","rgb(60, 110, 255)","rgb(40, 190, 180)"],light:["rgb(40, 100, 240)","rgb(20, 160, 200)","rgb(90, 60, 230)","rgb(20, 130, 180)","rgb(130, 50, 220)","rgb(40, 80, 230)","rgb(20, 150, 150)"]},sunset:{dark:["rgb(255, 110, 60)","rgb(255, 180, 40)","rgb(255, 60, 90)","rgb(255, 210, 80)","rgb(240, 70, 140)","rgb(255, 140, 50)","rgb(230, 50, 110)"],light:["rgb(235, 80, 30)","rgb(230, 150, 10)","rgb(230, 30, 70)","rgb(225, 175, 30)","rgb(215, 40, 110)","rgb(235, 110, 20)","rgb(205, 30, 90)"]},forest:{dark:["rgb(70, 220, 120)","rgb(40, 200, 180)","rgb(140, 230, 80)","rgb(30, 170, 140)","rgb(190, 235, 70)","rgb(50, 190, 110)","rgb(30, 150, 120)"],light:["rgb(30, 170, 80)","rgb(20, 150, 130)","rgb(90, 180, 30)","rgb(20, 130, 100)","rgb(130, 180, 20)","rgb(30, 150, 80)","rgb(20, 120, 90)"]},candy:{dark:["rgb(255, 90, 170)","rgb(255, 120, 220)","rgb(210, 80, 255)","rgb(255, 150, 190)","rgb(180, 110, 255)","rgb(255, 70, 140)","rgb(230, 100, 240)"],light:["rgb(235, 40, 140)","rgb(230, 70, 190)","rgb(180, 40, 230)","rgb(235, 100, 160)","rgb(150, 70, 230)","rgb(230, 30, 110)","rgb(200, 60, 210)"]},ice:{dark:["rgb(150, 230, 255)","rgb(90, 200, 255)","rgb(190, 240, 255)","rgb(120, 190, 255)","rgb(160, 220, 250)","rgb(80, 170, 255)","rgb(200, 235, 255)"],light:["rgb(30, 160, 220)","rgb(20, 130, 210)","rgb(60, 180, 230)","rgb(40, 120, 220)","rgb(50, 160, 220)","rgb(20, 110, 220)","rgb(70, 170, 230)"]},gold:{dark:["rgb(255, 200, 70)","rgb(255, 170, 40)","rgb(255, 220, 110)","rgb(240, 150, 30)","rgb(255, 235, 140)","rgb(230, 160, 40)","rgb(250, 210, 90)"],light:["rgb(200, 140, 10)","rgb(190, 120, 0)","rgb(210, 160, 30)","rgb(180, 110, 0)","rgb(205, 170, 40)","rgb(175, 115, 5)","rgb(195, 150, 20)"]}};function Va(n,e){const a=n.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);return a?`rgba(${a[1]}, ${a[2]}, ${a[3]}, ${e.toFixed(2)})`:n}function rt(n,e=1){return Math.max(.5,Math.round(n*e*100)/100)}function Ua(n,e){return`calc(50% + (var(--vb-cx-${e}) + var(--vb-x${n}-${e})) * var(--vb-w-${e}) * var(--vb-z-${e}, 1))`}function it({id:n,colors:e,alpha:a,sw:r,sh:t,y:s,fade:o,count:i}){return(i?be.slice(0,i):be).map((l,p)=>{const b=a>=1?e[p%e.length]:Va(e[p%e.length],a),$=`calc(${Math.round(l.w*r)}px * var(--vb-w-${n}) * var(--vb-z-${n}, 1))`,d=`calc(${Math.round(l.h*t)}px * var(--vb-h-${n}) * var(--vb-l${p}-${n}) * var(--vb-z-${n}, 1))`,h=`calc(100% + (${s}px + var(--vb-y${p}-${n})) * var(--vb-z-${n}, 1))`;return`radial-gradient(ellipse ${$} ${d} at ${Ua(p,n)} ${h}, ${b} 0%, transparent ${o}%)`}).join(`,
    `)}function Ka(n){const{id:e,borderRadius:a,borderWidth:r,strokeOpacity:t,innerOpacity:s,bloomOpacity:o,innerShadow:i,colorVariant:g,colors:l,brightness:p,saturation:b,theme:$,hueBase:d=0,glowSize:h=1,glowWidth:k=1,glowHeight:R=1,strokeScale:E=1,innerScale:B=1,innerHeight:G=1,bloomScale:V=1,bloomHeight:_=1,coreSize:H=1,coreLight:W=0,coreLightWidth:D=1,coreLightHeight:f=1,rangeWidth:N=1,rangeHeight:Z=1,softness:ce=1,distortion:U=!1,scale:I=1}=n,C=Math.round(28*I*10)/10,z=Math.round(9*I*10)/10,L=Math.max(0,a-r),m=Math.round(Math.max(40,Math.min(95,70*ce))),A=w=>k*w,x=w=>R*w,T=w=>Math.round(w*10)/10,y=`var(--vb-z-${e}, 1)`,M=w=>`calc(${T(w)}px * ${y})`,ne=$==="dark",oe=$a[g][ne?"dark":"light"].map((w,F)=>{const q=l==null?void 0:l[F];return q&&Ga(q)||w}),K=g==="mono"?.6:1,ye=(t*K).toFixed(2),ue=(s*K).toFixed(2),v=(o*K).toFixed(2),j=p.toFixed(2),X=b.toFixed(2),ee=`hue-rotate(calc(var(--voice-hue-base, ${d}deg) + var(--vb-hue-${e})))`,ge=U?` url(#vb-distort-${e})`:"",Ae=`filter: ${ee} brightness(${j}) saturate(${X});`,Ve=`filter: ${ee} brightness(${j}) saturate(${X})${ge};`,Ue=`filter: blur(${M(rt(10,h))}) ${ee} brightness(${j}) saturate(${X});`,Ke=`filter: blur(${M(rt(10,h))}) ${ee} brightness(${j}) saturate(${X})${ge};`,fe=`calc(50% + var(--vb-cx-${e}) * var(--vb-w-${e}) * ${y})`,Oe=`calc(100% + (2px + var(--vb-cy-${e})) * ${y})`,Xe=ne?`radial-gradient(ellipse calc(${T(30*H)}px * var(--vb-w-${e}) * ${y}) calc(${T(30*H)}px * var(--vb-h-${e}) * ${y}) at ${fe} ${Oe}, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.14) 30%, transparent 65%)`:`radial-gradient(ellipse calc(${T(40*H)}px * var(--vb-w-${e}) * ${y}) calc(${T(30*H)}px * var(--vb-h-${e}) * ${y}) at ${fe} ${Oe}, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.22) 35%, transparent 70%)`,Ye=it({id:e,colors:oe,alpha:1,sw:A(E),sh:x(E),y:2,fade:m}),Je=it({id:e,colors:oe,alpha:.46,sw:A(.9*B),sh:x(.9*B*G),y:0,fade:m}),Qe=it({id:e,colors:oe,alpha:ne?.9:.7,sw:A(1.15*V),sh:x(1.5*V*_),y:0,fade:Math.min(95,m+2)}),re=(w,F,q,ae=0)=>`radial-gradient(ellipse calc(${T(w*N)}px * var(--vb-w-${e}) * var(--vb-mw-${e}) * ${y}) calc((${T(F*Z)}px * var(--vb-h-${e}) + var(--vb-bh-${e})) * ${y}) at ${fe} calc(100% + var(--vb-cy-${e}) * ${y}), white 0%, rgba(255, 255, 255, 0.5) ${q}%${ae>0?`, rgba(255, 255, 255, ${ae}) 85%`:""}, transparent 100%)`,pe=(w,F)=>`opacity: calc(var(--vb-opacity-${e}, 1) * var(--vb-glow-${e}) * ${F} * var(--voice-${w}-opacity, 1) * var(--voice-strength, 1));`,Fe=(w,F,q,ae)=>`${w} {
  ${F}
  position: absolute;
  inset: 0;
  border-radius: ${M(a)};
  background: ${Je};
  box-shadow: inset 0 0 ${M(z)} 1px ${i};
  -webkit-mask-image:
    ${re(170,64,45,.3)},
    linear-gradient(white, transparent ${M(C)}, transparent calc(100% - ${C}px * ${y}), white),
    linear-gradient(to right, white, transparent ${M(C)}, transparent calc(100% - ${C}px * ${y}), white);
  -webkit-mask-composite: source-in, source-over;
  mask-image:
    ${re(170,64,45,.3)},
    linear-gradient(white, transparent ${M(C)}, transparent calc(100% - ${C}px * ${y}), white),
    linear-gradient(to right, white, transparent ${M(C)}, transparent calc(100% - ${C}px * ${y}), white);
  mask-composite: intersect, add;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  z-index: 1;
  ${q}
  ${pe("inner",ue)}
  ${ae}
}`;return`
@property --vb-opacity-${e} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-voice-beam="${e}"] {
  position: relative;
  border-radius: ${a}px;
  overflow: hidden;
  --vb-h-${e}: 0.8;
  --vb-w-${e}: 1;
${be.map((w,F)=>`  --vb-x${F}-${e}: ${w.x}px;
  --vb-l${F}-${e}: 1;
  --vb-y${F}-${e}: 0px;`).join(`
`)}
  --vb-glow-${e}: 0.4;
  --vb-z-${e}: 1;
  --vb-cx-${e}: 0px;
  --vb-cy-${e}: 0px;
  --vb-bh-${e}: 0px;
  --vb-bendA-${e}: 0;
  --vb-mw-${e}: 1;
  --vb-hue-${e}: 0deg;
  --vb-level-${e}: 0;
}

[data-voice-beam="${e}"][data-active] {
  animation: vb-fade-in-${e} 0.6s ease forwards;
}

[data-voice-beam="${e}"][data-fading] {
  animation: vb-fade-out-${e} 0.5s ease forwards;
}

/* Stroke — the colours painted into the 1px edge ring, masked to the centred ellipse. */
[data-voice-beam="${e}"][data-active]::after,
[data-voice-beam="${e}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${M(L)};
  padding: ${M(r)};
  clip-path: inset(0 round ${M(a)});
  background:
    ${Xe},
    ${Ye};
  -webkit-mask:
    ${re(170,64,45)},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    ${re(170,64,45)},
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  z-index: 2;
  ${pe("stroke",ye)}
  ${Ae}
}

/* Inner glow — soft light inside the element, faded off at the corners.
   With distortion on, this copy is clipped to ABOVE the band line (the
   polygon the driver writes each frame) and a mirror layer below carries
   the displacement filter, so only the glow under the line warps. */
${Fe(`[data-voice-beam="${e}"][data-active]::before,
[data-voice-beam="${e}"][data-fading]::before`,'content: "";',U?`clip-path: var(--vb-clip-above-${e}, inset(0 round ${a}px));`:`clip-path: inset(0 round ${a}px);`,Ae)}
${U?Fe(`[data-voice-beam="${e}"][data-active] [data-voice-beam-warp="inner"],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-warp="inner"]`,"display: block;",`clip-path: var(--vb-clip-below-${e}, inset(0 round ${a}px));`,Ve):""}

/* Bloom — the blurred halo, tallest of the three, above the content. */
[data-voice-beam="${e}"] [data-voice-beam-bloom],
[data-voice-beam="${e}"] [data-voice-beam-warp] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${M(L)};
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  opacity: 0;
}

[data-voice-beam="${e}"] [data-voice-beam-bloom],
[data-voice-beam="${e}"] [data-voice-beam-warp="bloom"] {
  -webkit-mask: ${re(200,130,35)};
  mask: ${re(200,130,35)};
  background: ${Qe};
  z-index: 3;
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-bloom] {
  display: block;
  clip-path: ${U?`var(--vb-clip-above-${e}, inset(0 round ${a}px))`:`inset(0 round ${a}px)`};
  ${pe("bloom",v)}
  ${Ue}
}
${U?`
[data-voice-beam="${e}"][data-active] [data-voice-beam-warp="bloom"],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-warp="bloom"] {
  display: block;
  clip-path: var(--vb-clip-below-${e}, inset(0 round ${a}px));
  ${pe("bloom",v)}
  ${Ke}
}

/* Processing drops the distortion: the driver marks the wrapper once the
   warp has faded out, the warp layers leave the paint and the base layers
   give up their split at the band line. */
[data-voice-beam="${e}"][data-voice-warp="off"]::before,
[data-voice-beam="${e}"][data-voice-warp="off"] [data-voice-beam-bloom] {
  clip-path: inset(0 round ${a}px);
}

[data-voice-beam="${e}"][data-voice-warp="off"] [data-voice-beam-warp] {
  display: none;
}`:""}

/* Epicentre — a soft white wash at the source, under the band line (the
   driver's clip; unclipped when no line is drawn), sitting above every
   glow layer and the band's halo so the centre reads lighter than the
   band (same z as the band canvases, painted after them). Sized by the voice like the
   other layers; off unless \`coreLight\` is set (the light theme sets it).
   Up to 1 it is the wash's opacity; past 1 the solid white core widens
   too, for a centre that stays lighter than a strong band. It follows the
   glow's presence but not \`strength\`, which would only dim it. */
${W>0?(()=>{const w=Math.max(0,Math.min(2,W-1)),F=Math.min(1,w),q=Math.max(0,w-1),ae=1+.3*w,Ze=T(45*F+27*q),et=T(40+25*F+15*q),tt=Math.min(1,.55+.35*F+.1*q).toFixed(2),Re=T(72+14*F+8*q);return`[data-voice-beam="${e}"] [data-voice-beam-core] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${M(L)};
  overflow: hidden;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  /* The blur sits on this wrapper and the band-line clip on the child,
     so the cut edge is blurred too rather than left hard. */
  filter: blur(${M(rt(8,h))});
  z-index: 4;
}

[data-voice-beam="${e}"] [data-voice-beam-core] > div {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse calc(${T(120*D*ae*I)}px * var(--vb-w-${e}) * ${y}) calc((${T(70*f*ae*I)}px * var(--vb-h-${e}) + var(--vb-bh-${e})) * ${y}) at ${fe} calc(100% + var(--vb-cy-${e}) * ${y}), white 0%, white ${Ze}%, rgba(255, 255, 255, ${tt}) ${et}%, transparent ${Re}%);
  clip-path: var(--vb-clip-below-${e}, none);
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-core],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-core] {
  display: block;
  opacity: calc(var(--vb-opacity-${e}, 1) * min(1, var(--vb-glow-${e}) * ${Math.min(1,W).toFixed(2)} * ${(1.6+1.4*w).toFixed(2)}) * var(--voice-core-light-opacity, 1));
}
`})():""}
/* Band — the canvas the driver draws the bend's contour on: an organic
   bell with chromatic fringes. Fades with the root, follows the strength
   and turns with the hue drift like the other layers. */
[data-voice-beam="${e}"] [data-voice-beam-band],
[data-voice-beam="${e}"] [data-voice-beam-band-halo] {
  display: none;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Its own compositing layer: WebKit otherwise re-rasterizes the
     filtered layer into the parent every frame on the CPU (a phone-sized
     host runs at a sixth of the frame rate without this). */
  will-change: transform;
  z-index: 4;
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-band],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-band],
[data-voice-beam="${e}"][data-active] [data-voice-beam-band-halo],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-band-halo] {
  display: block;
  opacity: calc(var(--vb-opacity-${e}, 1) * var(--voice-band-opacity, 1) * var(--voice-strength, 1));
  /* The blur vars are 0 where the canvas blurs its own strokes; where the
     2D context has no filter (WebKit) the driver sets them and the layers
     are blurred here instead — the ridge on the band canvas, its wider
     halo on the canvas beneath. */
  filter: blur(var(--vb-band-blur-${e}, 0px)) ${ee} brightness(${j}) saturate(${X});
}

[data-voice-beam="${e}"][data-active] [data-voice-beam-band-halo],
[data-voice-beam="${e}"][data-fading] [data-voice-beam-band-halo] {
  filter: blur(var(--vb-band-halo-blur-${e}, 0px)) ${ee} brightness(${j}) saturate(${X});
}

/* Resolution. The soft layers — inner light and its warp mirror, bloom and
   its mirror, the epicentre — are rastered at half size and scaled back
   up by the compositor: the box is halved, every length inside rides the
   layer's factor \`--vb-z\` at 0.5 (the driver also writes the band-line
   clips at half scale), and the will-change transform is rastered
   pre-scale where the engine does that (Chromium, Safari 18). For blurred
   gradients that is the same picture at a quarter of the raster and
   filter work, which is what a phone at 3x runs out of. The 1px stroke
   stays full-res on every screen: at half size it is half a CSS pixel,
   which a 3x phone rasters into a faint smear instead of the hairline,
   and the layer is cheap (no blur). The component sets
   \`data-voice-halfres\`. */
[data-voice-beam="${e}"][data-voice-halfres]::before,
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-warp],
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-core] {
  --vb-z-${e}: 0.5;
  inset: auto;
  left: 0;
  top: 0;
  width: 50%;
  height: 50%;
  transform: translateZ(0) scale(2);
  transform-origin: 0 0;
}
${U?`[data-voice-beam="${e}"][data-voice-halfres][data-active]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-fading]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-active] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-voice-halfres][data-fading] [data-voice-beam-bloom] {
  clip-path: var(--vb-clip-above-z-${e}, inset(0 round ${M(a)}));
}
[data-voice-beam="${e}"][data-voice-halfres][data-active] [data-voice-beam-warp],
[data-voice-beam="${e}"][data-voice-halfres][data-fading] [data-voice-beam-warp] {
  clip-path: var(--vb-clip-below-z-${e}, inset(0 round ${M(a)}));
}
/* Processing (warp off): the mirrors are gone, so the base layers paint
   the whole box again — this must outweigh the split above. */
[data-voice-beam="${e}"][data-voice-halfres][data-voice-warp="off"]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-voice-warp="off"] [data-voice-beam-bloom] {
  clip-path: inset(0 round ${M(a)});
}`:`[data-voice-beam="${e}"][data-voice-halfres][data-active]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-fading]::before,
[data-voice-beam="${e}"][data-voice-halfres][data-active] [data-voice-beam-bloom],
[data-voice-beam="${e}"][data-voice-halfres][data-fading] [data-voice-beam-bloom] {
  clip-path: inset(0 round ${M(a)});
}`}
[data-voice-beam="${e}"][data-voice-halfres] [data-voice-beam-core] > div {
  clip-path: var(--vb-clip-below-z-${e}, none);
}
@keyframes vb-fade-in-${e} {
  to { --vb-opacity-${e}: 1; }
}

@keyframes vb-fade-out-${e} {
  from { --vb-opacity-${e}: 1; }
  to { --vb-opacity-${e}: 0; }
}

[data-voice-beam="${e}"][data-paused],
[data-voice-beam="${e}"][data-paused]::after,
[data-voice-beam="${e}"][data-paused]::before,
[data-voice-beam="${e}"][data-paused] [data-voice-beam-bloom] {
  animation-play-state: paused !important;
}
`}let ke=null;function wa(){if(typeof window>"u")return null;const n=window;return n.AudioContext??n.webkitAudioContext??null}function Xa(){return wa()!=null}function bt(){const n=wa();return n?(ke||(ke=new n),ke.state==="suspended"&&ke.resume().catch(()=>{}),ke):null}const st=new WeakMap;function Ya(n){const e=bt();if(!e||n.getAudioTracks().length===0)return null;let a=st.get(n);a||(a={node:e.createMediaStreamSource(n),refs:0},st.set(n,a)),a.refs+=1;const r=e.createAnalyser();r.fftSize=1024,r.smoothingTimeConstant=.5,a.node.connect(r);let t=!1;return{analyser:r,release:()=>{if(!t){t=!0;try{a.node.disconnect(r)}catch{}if(a.refs-=1,a.refs<=0){try{a.node.disconnect()}catch{}st.delete(n)}}}}}const la=new WeakMap;function Ja(n){let e=la.get(n);return e||(e={level:0,bands:[0,0,0],phase:0,scanA:0,scanT:0,t:0,lastTs:0,warp:1},la.set(n,e)),e}const Ge=new Set;let $e=null,lt=0;const Qa=1e3/60-2,Za=22,en=500,tn=4e3;let qe=0,ct=!1,Be=!1,me=0,da=0;const xa=Math.PI*2,an=5,nn=1.7,on=[[80,300],[300,2e3],[2e3,6e3]];function ya(n){return n<0?0:n>1?1:n}function rn(n,e){const a=e/2;return((n+a)%e+e)%e-a}function sn(n,e){const a=n/(e/2+4);return Math.max(0,1-a*a)}function ha(n,e){if(n<=e)return 0;const a=(n-e)/Math.max(.001,1-e);return ya((1-Math.exp(-3*a))/(1-Math.exp(-3)))}function He(n,e,a,r,t){const s=e>n?r:t,o=1-Math.exp(-a/Math.max(.001,s));return n+(e-n)*o}const cn=2,ln=.06,dn=.35,hn=.03,bn=!(typeof navigator<"u"&&/AppleWebKit/.test(navigator.userAgent)&&!/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent)),ba=.05,un=6,gn=12,fn=.1,ua=.1,pn=170,vn=64,ga=56;function mn(n,e,a,r){const t=n<0?1-r:1+r,s=Math.max(.05,a*t),o=Math.exp(-Math.pow(Math.abs(n)/s,e)),i=Math.exp(-Math.pow(1/s,e));return Math.max(0,(o-i)/(1-i))}function $n(n,e,a,r,t){if(a<=0||e<=0)return 0;const s=e*Math.max(0,Math.min(.98,r));if(n<=s)return 0;const o=Math.min(1,(n-s)/Math.max(1,e-s));return a*Math.pow(o,Math.max(.5,t))}function Ma(n,e,a){return Math.max(0,Math.min(n,e/2,a/2))}function dt(n,e,a,r=0){if(a<=0)return 0;const t=Math.min(n,e-n)-r;if(t>=a)return 0;if(t<=0)return a;const s=a-t;return a-Math.sqrt(Math.max(0,a*a-s*s))}function wn(n,e,a,r){const t=a/2+e.cx*e.w,s=pn*n.rangeWidth*e.w*e.mw,o=r*.82*Math.min(1,n.scale),i=Math.min(o,(vn*n.rangeHeight*e.h+e.lift)*n.bandPosition),g=r-n.bandOffset,l=Math.min(1,e.corner*4),p=n.bandTail*(1-l*l*(3-2*l)),b=p>.001,$=b?n.bandTailOverflow:0,d=b?-$:t-s,h=b?a+$:t+s,k=[];for(let R=0;R<=ga;R++){const E=d+(h-d)*R/ga,B=Math.max(-1,Math.min(1,(E-t)/Math.max(1,s))),G=(E<t?t:a-t)+$,V=mn(B,n.bandCurve,n.bandSpread,n.bandSkew)+$n(Math.abs(E-t),G,p,n.bandTailPosition,n.bandTailCurve),_=e.corner>0?dt(E,a,Ma(n.radius,a,r))*e.corner:0;k.push([E,g-i*V-_])}return k}function xn(n,e,a,r,t){for(const[s,o]of[["",1],["-z",.5]]){const i=b=>(b*o).toFixed(1)+"px",g=a.map(([b,$])=>`${i(b)} ${i($)}`),l=`polygon(0 ${i(t)}, ${g.join(", ")}, ${i(r)} ${i(t)})`,p=`polygon(0 0, ${i(r)} 0, ${i(r)} ${i(t)}, ${g.slice().reverse().join(", ")}, 0 ${i(t)})`;n.style.setProperty(`--vb-clip-below${s}-${e}`,l),n.style.setProperty(`--vb-clip-above${s}-${e}`,p)}}function yn(n,e,a){let r=a;for(let i=0;i<e.length;i++)e[i][1]<r&&(r=e[i][1]);const t=Math.max(0,Math.min(.9,Math.floor((r-un)/a/ba)*ba));if(t===n.filterTop)return;n.filterTop=t;const s=1+Math.max(fn,gn/a),o=n.filter;o.setAttribute("x",`${-ua*100}%`),o.setAttribute("width",`${(1+2*ua)*100}%`),o.setAttribute("y",`${(t*100).toFixed(0)}%`),o.setAttribute("height",`${((s-t)*100).toFixed(1)}%`)}function Mn(n,e,a){const{canvas:r,ctx:t,el:s,config:o}=n;if(!r||!t)return;const i=s.clientWidth,g=s.clientHeight;if(!i||!g)return;const l=Math.min(cn,typeof window<"u"&&window.devicePixelRatio||1),p=Math.round(i*l),b=Math.round(g*l);(r.width!==p||r.height!==b)&&(r.width=p,r.height=b),t.setTransform(l,0,0,l,0,0),t.clearRect(0,0,i,g);const $=n.haloCanvas,d=n.haloCtx;$&&d&&(($.width!==p||$.height!==b)&&($.width=p,$.height=b),d.setTransform(l,0,0,l,0,0),d.clearRect(0,0,i,g));const h=Math.min(1,.6*o.bandStrength*e.strength);if(h<.005||o.bandWidth<=0)return;const k=o.theme==="dark",R=o.bandWidth*(1+.35*e.level),E=o.bandAberration*(.35+.65*e.level),B=(4+12*E)*o.scale,G=4*E*o.scale,V=(m,A)=>{t.beginPath(),t.moveTo(a[0][0]+m,a[0][1]+A);for(let x=1;x<a.length;x++)t.lineTo(a[x][0]+m,a[x][1]+A)},_={r:o.bandColors.above,g:o.bandColors.mid,c:o.bandColors.core,b:o.bandColors.below},H=(k?.42:.4)*h,W=14*R,D=3.5*o.bandWidth/2,f=D*l,N=typeof t.filter=="string",Z=N?"0px":`${D.toFixed(2)}px`;n.cssBlur!==Z&&(s.style.setProperty(`--vb-band-blur-${o.id}`,Z),s.style.setProperty(`--vb-band-halo-blur-${o.id}`,N?"0px":`${(D*3).toFixed(2)}px`),n.cssBlur=Z);const ce=[[1,.16],[.72,.2],[.46,.26],[.22,.34]],U=[{rgb:_.r,a:1,ox:G,oy:-B},{rgb:_.g,a:.55,ox:G*.35,oy:-B*.35},{rgb:_.b,a:1,ox:-G,oy:B},{rgb:_.c,a:.9,ox:0,oy:0}];t.lineCap="round",t.lineJoin="round",t.globalCompositeOperation="source-over";const I=a[0][0],C=a[a.length-1][0],z=(m,A)=>{const x=t.createLinearGradient(I,0,C,0),T=o.bandTail>0?.015:.18;return x.addColorStop(0,`rgba(${m}, 0)`),x.addColorStop(T,`rgba(${m}, ${A.toFixed(3)})`),x.addColorStop(1-T,`rgba(${m}, ${A.toFixed(3)})`),x.addColorStop(1,`rgba(${m}, 0)`),x},L=!N&&d?d:t;N&&(t.filter=`blur(${(f*3).toFixed(1)}px)`),L.lineCap="round",L.lineJoin="round",L.strokeStyle=z(_.c,H*.3),L.lineWidth=W*2.2,L.beginPath(),L.moveTo(a[0][0],a[0][1]);for(let m=1;m<a.length;m++)L.lineTo(a[m][0],a[m][1]);L.stroke(),N&&(t.filter=`blur(${f.toFixed(1)}px)`);for(const m of U)for(const[A,x]of ce)t.strokeStyle=z(m.rgb,H*m.a*x),t.lineWidth=Math.max(.6,W*A),V(m.ox,m.oy),t.stroke();N&&(t.filter="none"),t.globalCompositeOperation="source-over"}function Sn(n){return(1-Math.cos(xa*n))/2}function Tn(n,e){const a=n.analyser,r=n.time,t=n.freq;a.getFloatTimeDomainData(r);let s=0;for(let i=0;i<r.length;i++)s+=r[i]*r[i];e.level=Math.sqrt(s/r.length)*an*n.config.sensitivity,a.getByteFrequencyData(t);const o=a.context.sampleRate/a.fftSize;for(let i=0;i<3;i++){const[g,l]=on[i],p=Math.max(0,Math.floor(g/o)),b=Math.min(t.length-1,Math.ceil(l/o));let $=0;for(let h=p;h<=b;h++)$+=t[h];const d=b>=p?$/(b-p+1)/255:0;e.bands[i]=d*nn*n.config.sensitivity}}const he={level:0,bands:[0,0,0]};function Sa(n){$e=requestAnimationFrame(Sa);const e=qe?n-qe:0;if(qe=n,ct){if(Be=!Be,Be)return;n>=da&&(ct=!1,me=0)}else e>Za?me?n-me>en&&(ct=!0,Be=!1,da=n+tn):me=n:me=0;n-lt<Qa||(lt=n,Ge.forEach(a=>{var ue;const{el:r,config:t,source:s,s:o}=a,i=t.paused;if(i&&a.paintedConfig===t)return;const g=i?0:o.lastTs?Math.min(.05,(n-o.lastTs)/1e3):1/60;o.lastTs=n,o.t+=g;const l=o.t;if(!i)if(a.analyser)Tn(a,he);else{const v=s.getLevel?ya(s.getLevel()):0;he.level=v,he.bands[0]=v,he.bands[1]=v*(.72+.28*Math.sin(l*9.1)),he.bands[2]=v*(.6+.4*Math.sin(l*13.7+2))}const p=ha(he.level,t.threshold);o.level=He(o.level,p,g,t.attack,t.release);for(let v=0;v<3;v++){const j=ha(he.bands[v],t.threshold*.6);o.bands[v]=He(o.bands[v],j,g,t.attack,t.release*1.15)}const b=ma*t.lobeSpacing;t.processing&&o.scanA<.001&&o.scanT===0&&(o.scanT=Math.max(.05,t.processingDuration)/2);const d=Math.max(.05,t.processingEase);o.scanA=He(o.scanA,t.processing?1:0,g,d*.9,d*.8),t.processing?o.scanT+=g:o.scanA<.001&&(o.scanT=0);const h=o.scanA*o.scanA*(3-2*o.scanA),k=r.clientWidth,R=r.clientHeight,E=b/2*t.processingTravel,B=o.scanT/Math.max(.05,t.processingDuration),G=Math.floor(B),V=B-G,_=Math.max(1,t.processingCurve),H=V<.5?.5*Math.pow(2*V,_):1-.5*Math.pow(2-2*V,_),W=t.reducedMotion?0:G%2===0?2*H-1:1-2*H,D=h*E*W,f=1-h*.6,N=1-h*.45,Z=1+h*.3*(1-W*W),ce=t.reducedMotion?.5:.5+.5*Math.sin(xa*l/t.breatheDuration),U=o.level+(1-o.level)*t.idle*ce,I=Math.max(0,Math.min(1,(h-.25)/.75)),C=I*I*(3-2*I),z=Math.max(U,t.processingLevel*C),L=.15+.85*z,m=.5+t.reach*z,A=(.85+t.spread*z)*Z;t.flow!==0&&!t.reducedMotion&&(o.phase=((o.phase+t.flow*z*g)%b+b)%b),r.style.setProperty(`--vb-level-${t.id}`,o.level.toFixed(3)),r.style.setProperty(`--vb-cx-${t.id}`,`${D.toFixed(1)}px`),r.style.setProperty(`--vb-mw-${t.id}`,N.toFixed(3));const x=t.bend*z;r.style.setProperty(`--vb-bh-${t.id}`,`${Math.max(0,x).toFixed(1)}px`);const T=t.bend>0?Math.min(1,x/t.bend):0;r.style.setProperty(`--vb-bendA-${t.id}`,T.toFixed(3));const y={cx:D,w:A,h:m,mw:N,lift:x,strength:T,level:o.level,corner:h},M=k/2+D*A,ne=30*t.scale*A,we=Ma(t.radius,k,R),oe=h*t.cornerFollow;r.style.setProperty(`--vb-cy-${t.id}`,`${(-dt(M,k,we,ne*1.4)*oe).toFixed(1)}px`),o.warp=He(o.warp,t.processing?0:1,g,dn,ln);const xe=o.warp,K=a.displace!=null&&xe<hn;if(K!==a.warpOff&&(a.warpOff=K,K?r.setAttribute("data-voice-warp","off"):r.removeAttribute("data-voice-warp")),k&&R&&(a.ctx||a.displace)){const v=wn(t,y,k,R);(a.displace&&!K||t.coreLight>0)&&xn(r,t.id,v,k,R),a.filter&&!K&&bn&&yn(a,v,R),a.ctx&&Mn(a,y,v)}if(a.displace&&!K){const v=t.reducedMotion?0:t.distortion*120*t.scale*(.15+.85*z)*xe;a.displace.scale.baseVal=v,a.noiseShift&&(a.noiseShift.dx.baseVal=8*t.scale*Math.sin(l*.9),a.noiseShift.dy.baseVal=4*t.scale*Math.sin(l*.6+1.3))}r.style.setProperty(`--vb-glow-${t.id}`,L.toFixed(3)),r.style.setProperty(`--vb-h-${t.id}`,m.toFixed(3)),r.style.setProperty(`--vb-w-${t.id}`,A.toFixed(3));for(let v=0;v<be.length;v++){const j=be[v],X=rn(j.x*t.lobeSpacing+o.phase,b),ee=t.bands?.6+.7*o.bands[j.band]:1;r.style.setProperty(`--vb-x${v}-${t.id}`,`${(X*f).toFixed(1)}px`),r.style.setProperty(`--vb-l${v}-${t.id}`,(ee*sn(X,b)).toFixed(3));const ge=k/2+(D+X*f)*A;r.style.setProperty(`--vb-y${v}-${t.id}`,`${(-dt(ge,k,we,ne)*oe).toFixed(1)}px`)}const ye=t.staticColors||t.reducedMotion||t.hueRange===0?0:-t.hueRange+2*t.hueRange*Sn(l/t.hueDuration);r.style.setProperty(`--vb-hue-${t.id}`,`${ye.toFixed(2)}deg`),(ue=a.onLevel)==null||ue.call(a,o.level),a.paintedConfig=t}))}function kn(){$e==null&&(lt=0,qe=0,me=0,$e=requestAnimationFrame(Sa))}function An(){Ge.size===0&&$e!=null&&(cancelAnimationFrame($e),$e=null)}function On(n,e,a,r){const t={el:n,config:e,source:a,onLevel:r,analyser:null,releaseAnalyser:null,time:null,freq:null,canvas:null,ctx:null,haloCanvas:null,haloCtx:null,displace:null,noiseShift:null,filter:null,filterTop:-1,s:Ja(n),paintedConfig:null,cssBlur:null,warpOff:n.hasAttribute("data-voice-warp")};e.distortion>0&&(t.displace=n.querySelector(":scope > svg feDisplacementMap"),t.noiseShift=n.querySelector(":scope > svg feOffset"),t.filter=n.querySelector(":scope > svg filter"));const s=n.querySelector(":scope > [data-voice-beam-band]");if(s){t.canvas=s,t.ctx=s.getContext("2d");const o=n.querySelector(":scope > [data-voice-beam-band-halo]");o&&(t.haloCanvas=o,t.haloCtx=o.getContext("2d"))}if(t.s.lastTs=0,a.stream){const o=Ya(a.stream);o&&(t.analyser=o.analyser,t.releaseAnalyser=o.release,t.time=new Float32Array(o.analyser.fftSize),t.freq=new Uint8Array(o.analyser.frequencyBinCount))}return Ge.add(t),kn(),()=>{var o;Ge.delete(t),(o=t.releaseAnalyser)==null||o.call(t),An()}}const Ta={scale:1,glowSize:1,processingDuration:1.1,processingLevel:.55,processingTravel:1.55,processingCurve:2.1,cornerFollow:.45,strokeOpacity:1,innerOpacity:1,bloomOpacity:1,idle:.18,reach:1.2,spread:1.05,flow:48,bend:60,bandStrength:1.55,bandWidth:2.15,bandPosition:.35,bandCurve:1.75,bandSpread:.87,bandSkew:.12,bandOffset:-27,bandTail:.59,bandTailPosition:.67,bandTailCurve:2.4,bandTailOverflow:15,bandAberration:.89,distortion:.62,distortionDetail:2.3,glowWidth:.65,glowHeight:1.25,lobeSpacing:.85,rangeWidth:.75,rangeHeight:1,softness:1.07,coreSize:1,coreLight:0,coreLightWidth:1,coreLightHeight:1,strokeScale:1,innerScale:1,innerHeight:1,bloomScale:1,bloomHeight:1},ka={default:{},pill:{scale:.45,glowSize:.95,strokeOpacity:1.2,innerOpacity:.85,reach:1.35,spread:1.1,flow:0,bend:23,bandStrength:1.55,bandWidth:1.85,bandCurve:1.95,bandSpread:.38,bandOffset:-16,bandTail:0,processingTravel:2,cornerFollow:0,distortion:.45,distortionDetail:3,glowWidth:.65,glowHeight:.95,lobeSpacing:.45,rangeWidth:.8,rangeHeight:.7,softness:.88,coreSize:.25,strokeScale:1.25,innerScale:.95,bloomScale:1.05,bloomHeight:2.25},mobile:{scale:1.25,spread:.45,reach:3,flow:60,bend:70,bandWidth:2.4,bandCurve:1.55,bandSpread:.9,bandOffset:-50,bandTail:.62,bandTailPosition:.42,bandTailCurve:2.7,bandTailOverflow:22,processingDuration:1.05,processingLevel:.35,processingTravel:1,cornerFollow:.4,bandStrength:1.8,distortionDetail:2,glowWidth:1.15,glowHeight:2.1,lobeSpacing:1.35,rangeWidth:1.25,rangeHeight:1.2,softness:1.1}},Aa={default:{brightness:1.15},pill:{brightness:1.35,saturation:1.5},mobile:{strength:1,brightness:1.2,saturation:1.5}},Fn={default:{},pill:{},mobile:{strength:1}};function Oa(n="default",e="dark"){return(e==="light"?Fn[n]:void 0)??Aa[n]}const Rn={default:{bandStrength:1.7},pill:{bandStrength:2},mobile:{bandStrength:1.7}};function Fa(n="default",e="dark"){const a=ka[n],r={};return e==="light"&&(a.reach===void 0&&(r.reach=1.8),a.spread===void 0&&(r.spread=.8),a.coreLight===void 0&&(r.coreLight=1.8)),{...Ta,...r,...a,...e==="light"?Rn[n]:void 0}}const Ne={dark:{core:"255, 255, 255",above:"255, 70, 80",mid:"90, 255, 150",below:"80, 140, 255"},light:{core:"197, 139, 255",above:"255, 122, 182",mid:"126, 196, 255",below:"45, 255, 171"}},Pn=1,Cn=16,Ln=6e4,fa=typeof navigator<"u"&&/AppleWebKit/.test(navigator.userAgent)&&!/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent),En=(()=>{if(typeof document>"u")return!0;const n=document.createElement("canvas").getContext("2d");return!!n&&typeof n.filter=="string"})();function Wn(){const[n,e]=u.useState(()=>typeof window>"u"||window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");return u.useEffect(()=>{if(typeof window>"u")return;const a=window.matchMedia("(prefers-color-scheme: dark)"),r=t=>e(t.matches?"dark":"light");return a.addEventListener("change",r),()=>a.removeEventListener("change",r)},[]),n}function In(){const[n,e]=u.useState(()=>typeof window>"u"||!window.matchMedia?!1:window.matchMedia("(prefers-reduced-motion: reduce)").matches);return u.useEffect(()=>{if(typeof window>"u"||!window.matchMedia)return;const a=window.matchMedia("(prefers-reduced-motion: reduce)"),r=t=>e(t.matches);return a.addEventListener("change",r),()=>a.removeEventListener("change",r)},[]),n}function zn(n,e){return n==="auto"?e:n}const Ra=u.forwardRef(function({children:e,type:a="default",scale:r,stream:t=null,level:s=0,sensitivity:o=3.1,threshold:i=.015,attack:g=.325,release:l=.86,idle:p,breatheDuration:b=5.2,reach:$,spread:d,bands:h=!0,flow:k,processing:R=!1,processingDuration:E,processingLevel:B,processingTravel:G,processingCurve:V,cornerFollow:_,processingEase:H=.6,colorVariant:W="colorful",colors:D,bandColors:f,theme:N="dark",staticColors:Z=!1,hueRange:ce,hueDuration:U,active:I=!0,paused:C=!1,borderRadius:z,brightness:L,saturation:m,glowSize:A,strokeOpacity:x,innerOpacity:T,bloomOpacity:y,bend:M,bandStrength:ne,bandWidth:we,bandPosition:oe,bandCurve:xe,bandSpread:K,bandSkew:ye,bandOffset:ue,bandTail:v,bandTailPosition:j,bandTailCurve:X,bandTailOverflow:ee,bandAberration:ge,distortion:Ae,distortionDetail:Ve,glowWidth:Ue,glowHeight:Ke,lobeSpacing:fe,rangeWidth:Oe,rangeHeight:Xe,softness:Ye,coreSize:Je,coreLight:Qe,coreLightWidth:re,coreLightHeight:pe,strokeScale:Fe,innerScale:w,innerHeight:F,bloomScale:q,bloomHeight:ae,strength:Ze,className:et,style:tt,css:Re,onLevel:ut,onActivate:Pe,onDeactivate:Ce,onAnimationEnd:Le,...Pa},Me){const le=u.useId().replace(/:/g,"-"),Ca=Wn(),J=zn(N,Ca),La=D?D.join("|"):"",Ea=f?[f.core,f.above,f.mid,f.below].join("|"):"",c=Fa(a,J),P=Math.max(.05,r??c.scale),gt=A??c.glowSize,ft=x??c.strokeOpacity,pt=T??c.innerOpacity,vt=y??c.bloomOpacity,mt=E??c.processingDuration,$t=B??c.processingLevel,wt=G??c.processingTravel,xt=V??c.processingCurve,yt=_??c.cornerFollow,Mt=p??c.idle,St=$??c.reach,Tt=d??c.spread,kt=(k??c.flow)*P,At=(M??c.bend)*P,Ot=ne??c.bandStrength,Ft=(we??c.bandWidth)*P,Rt=oe??c.bandPosition,Pt=xe??c.bandCurve,Ct=K??c.bandSpread,Lt=ye??c.bandSkew,Et=(ue??c.bandOffset)*P,Wt=v??c.bandTail,It=j??c.bandTailPosition,zt=X??c.bandTailCurve,_t=(ee??c.bandTailOverflow)*P,Dt=ge??c.bandAberration,Wa=Ae??c.distortion,Bt=(Ve??c.distortionDetail)/P,Ht=(Ue??c.glowWidth)*P,Nt=(Ke??c.glowHeight)*P,jt=(fe??c.lobeSpacing)*P,Ee=(Oe??c.rangeWidth)*P,We=(Xe??c.rangeHeight)*P,qt=Ye??c.softness,Gt=(Je??c.coreSize)*P,Se=Math.max(0,Math.min(3,Qe??c.coreLight)),Vt=re??c.coreLightWidth,Ut=pe??c.coreLightHeight,Kt=Fe??c.strokeScale,Xt=w??c.innerScale,Yt=F??c.innerHeight,Jt=q??c.bloomScale,Qt=ae??c.bloomHeight,Zt=In(),Te=u.useRef(null),[de,ea]=u.useState(I),[ie,ta]=u.useState(!1),[at,Ia]=u.useState(!0),[za,_a]=u.useState(null),[Da,Ba]=u.useState(0);u.useEffect(()=>{if(!fa)return;const S=Te.current;if(!S)return;const Y=()=>Ba(S.clientWidth*S.clientHeight);if(Y(),typeof ResizeObserver>"u")return;const se=new ResizeObserver(Y);return se.observe(S),()=>se.disconnect()},[]);const ve=fa&&Da>Ln?0:Wa;u.useEffect(()=>{if(z!=null)return;const S=Te.current;if(!S)return;const Y=()=>{const te=S.firstElementChild;if(!te)return;const _e=getComputedStyle(te),ot=parseFloat(_e.borderTopLeftRadius);!isNaN(ot)&&ot>0&&_a(ot)};Y();const se=new MutationObserver(Y);return se.observe(S,{childList:!0,subtree:!1}),()=>se.disconnect()},[z,e]),u.useEffect(()=>{I&&!de&&!ie?ea(!0):!I&&de&&!ie&&ta(!0)},[I,de,ie]),u.useEffect(()=>{const S=Te.current;if(!S||typeof IntersectionObserver>"u")return;const Y=new IntersectionObserver(se=>{for(const te of se)Ia(te.isIntersecting)},{rootMargin:"256px"});return Y.observe(S),()=>Y.disconnect()},[]);const Ha=u.useCallback(S=>{const Y=S.animationName;Y.includes("fade-out")?(ea(!1),ta(!1),Ce==null||Ce()):Y.includes("fade-in")&&(Pe==null||Pe()),Le==null||Le(S)},[Pe,Ce,Le]),Q=pa[J],Ie=z??za??Cn,nt=Oa(a,J),Na=Ze??nt.strength??Q.strength??1,aa=ce??Q.hueRange??24,na=U??Q.hueDuration??12,oa=L??nt.brightness??Q.brightness,ra=m??nt.saturation??Q.saturation,ia=u.useMemo(()=>Ka({id:le,borderRadius:Ie,borderWidth:Pn,strokeOpacity:Q.strokeOpacity*ft,innerOpacity:Q.innerOpacity*pt,bloomOpacity:Q.bloomOpacity*vt,innerShadow:Q.innerShadow,colorVariant:W,colors:D,brightness:oa,saturation:ra,theme:J,hueBase:Q.hueBase??0,glowSize:gt*P,glowWidth:Ht,glowHeight:Nt,strokeScale:Kt,innerScale:Xt,innerHeight:Yt,bloomScale:Jt,bloomHeight:Qt,coreSize:Gt,coreLight:Se,coreLightWidth:Vt,coreLightHeight:Ut,rangeWidth:Ee,rangeHeight:We,softness:qt,distortion:ve>0,scale:P}),[le,Ie,Q,W,La,oa,ra,J,c,gt,ft,pt,vt,P,Ht,Nt,Kt,Xt,Yt,Jt,Qt,Gt,Se,Vt,Ut,Ee,We,qt,ve>0]),sa=u.useMemo(()=>({id:le,sensitivity:Math.max(0,o),threshold:Math.max(0,Math.min(.95,i)),attack:Math.max(0,g),release:Math.max(0,l),idle:Math.max(0,Math.min(1,Mt)),breatheDuration:Math.max(.2,b),reach:Math.max(0,St),spread:Math.max(0,Tt),bands:h,flow:kt,lobeSpacing:Math.max(.1,jt),bend:Math.max(0,At),bandStrength:Math.max(0,Ot),bandWidth:Math.max(0,Ft),bandPosition:Math.max(0,Rt),bandCurve:Math.max(.3,Pt),bandSpread:Math.max(.05,Ct),bandSkew:Math.max(-.9,Math.min(.9,Lt)),bandOffset:Et,bandTail:Math.max(0,Math.min(1.5,Wt)),bandTailPosition:Math.max(0,Math.min(.98,It)),bandTailCurve:Math.max(.5,zt),bandTailOverflow:Math.max(0,_t),bandAberration:Math.max(0,Math.min(1,Dt)),rangeWidth:Ee,rangeHeight:We,theme:J,bandColors:{core:(f==null?void 0:f.core)&&De(f.core)||Ne[J].core,above:(f==null?void 0:f.above)&&De(f.above)||Ne[J].above,mid:(f==null?void 0:f.mid)&&De(f.mid)||Ne[J].mid,below:(f==null?void 0:f.below)&&De(f.below)||Ne[J].below},distortion:Math.max(0,Math.min(1,ve)),coreLight:Se,scale:P,radius:Ie,processing:R,processingDuration:Math.max(.05,mt),processingLevel:Math.max(0,Math.min(1,$t)),processingEase:Math.max(.05,H),processingTravel:Math.max(0,wt),processingCurve:Math.max(1,xt),cornerFollow:Math.max(0,Math.min(1,yt)),hueRange:Math.max(0,aa),hueDuration:Math.max(.5,na),staticColors:W==="mono"?!0:Z,reducedMotion:Zt,paused:C}),[le,o,i,g,l,Mt,b,St,Tt,h,kt,jt,At,Ot,Ft,Rt,Pt,Ct,Lt,Et,Wt,It,zt,_t,Dt,Ee,We,J,Ea,ve,Se,P,Ie,R,mt,$t,H,wt,xt,yt,aa,na,Z,W,Zt,C]),ca=u.useRef(s);ca.current=s;const ze=u.useRef(ut);ze.current=ut,u.useEffect(()=>{if(!(de||ie)||!at)return;const S=Te.current;return S?On(S,sa,{stream:t,getLevel:()=>{const te=ca.current;return typeof te=="function"?te():te}},te=>{var _e;return(_e=ze.current)==null?void 0:_e.call(ze,te)}):void 0},[sa,t,de,ie,at]);const ja=u.useCallback(S=>{Te.current=S,typeof Me=="function"?Me(S):Me&&(Me.current=S)},[Me]),qa={...tt??{},"--voice-strength":Math.max(0,Math.min(1,Na))};return O.jsxs(O.Fragment,{children:[O.jsx("style",{children:Re?`${ia}
${Re.split("{id}").join(le)}`:ia}),O.jsxs("div",{...Pa,ref:ja,"data-voice-beam":le,"data-voice-type":a,"data-voice-halfres":"","data-active":de&&!ie?"":void 0,"data-fading":ie?"":void 0,"data-paused":de&&!ie&&(!at||C)?"":void 0,"data-listening":t?"":void 0,"data-processing":R?"":void 0,className:et,style:qa,onAnimationEnd:Ha,children:[e,O.jsx("div",{"data-voice-beam-bloom":!0}),ve>0&&O.jsxs(O.Fragment,{children:[O.jsx("div",{"data-voice-beam-warp":"inner"}),O.jsx("div",{"data-voice-beam-warp":"bloom"})]}),!En&&O.jsx("canvas",{"data-voice-beam-band-halo":!0,"aria-hidden":"true"}),O.jsx("canvas",{"data-voice-beam-band":!0,"aria-hidden":"true"}),Se>0&&O.jsx("div",{"data-voice-beam-core":!0,children:O.jsx("div",{})}),ve>0&&O.jsx("svg",{"aria-hidden":"true",width:"0",height:"0",style:{position:"absolute",pointerEvents:"none"},children:O.jsxs("filter",{id:`vb-distort-${le}`,x:"-20%",y:"-20%",width:"140%",height:"140%",colorInterpolationFilters:"sRGB",children:[O.jsx("feTurbulence",{type:"fractalNoise",baseFrequency:`${(.012*Bt).toFixed(4)} ${(.05*Bt).toFixed(4)}`,numOctaves:2,seed:7,result:"noise"}),O.jsx("feOffset",{in:"noise",dx:"0",dy:"0",result:"moved"}),O.jsx("feColorMatrix",{in:"moved",type:"matrix",values:"1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1",result:"map"}),O.jsx("feDisplacementMap",{in:"SourceGraphic",in2:"map",scale:0,xChannelSelector:"R",yChannelSelector:"G"})]})})]})]})}),_n={echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1};function je(){return typeof navigator<"u"&&typeof navigator.mediaDevices<"u"&&typeof navigator.mediaDevices.getUserMedia=="function"}function Dn(n={}){const{constraints:e,autoStart:a=!1}=n,[r,t]=u.useState(null),[s,o]=u.useState(()=>je()?"idle":"unsupported"),[i,g]=u.useState(null),l=u.useRef(null),p=u.useRef(e);p.current=e;const b=u.useCallback(()=>{const d=l.current;l.current=null,d&&d.getTracks().forEach(h=>h.stop()),t(null),o(je()?"idle":"unsupported")},[]),$=u.useCallback(async()=>{if(!je())return o("unsupported"),null;if(l.current)return l.current;bt(),o("requesting"),g(null);try{const d=await navigator.mediaDevices.getUserMedia({audio:{..._n,...p.current??{}}});l.current=d,t(d),o("live");const h=()=>{l.current===d&&(l.current=null,t(null),o("idle"))};return d.getAudioTracks().forEach(k=>k.addEventListener("ended",h)),d}catch(d){const h=d instanceof Error?d:new Error(String(d));return g(h),o(h.name==="NotAllowedError"||h.name==="SecurityError"?"denied":"error"),null}},[]);return u.useEffect(()=>{a&&$()},[a]),u.useEffect(()=>()=>{const d=l.current;l.current=null,d&&d.getTracks().forEach(h=>h.stop())},[]),{stream:r,state:s,error:i,supported:je(),start:$,stop:b}}exports.LOBE_SPACING=va;exports.LOBE_SPAN=ma;exports.VoiceBeam=Ra;exports.default=Ra;exports.getAudioContext=bt;exports.isAudioSupported=Xa;exports.parseRgb=ht;exports.resolveVoiceDefaults=Fa;exports.resolveVoiceStyle=Oa;exports.themePresets=pa;exports.useMicrophone=Dn;exports.voiceDefaults=Ta;exports.voiceLobes=be;exports.voicePalettes=$a;exports.voiceTypePresets=ka;exports.voiceTypeStyle=Aa;
