import { CSSProperties } from 'react';
import { ForwardRefExoticComponent } from 'react';
import { HTMLAttributes } from 'react';
import { ReactNode } from 'react';
import { RefAttributes } from 'react';

/**
 * The page's shared AudioContext, created on first use. Call it from a
 * user gesture (the microphone button) where you can: Safari only lets a
 * context start inside one. It is resumed on every call, so a context the
 * browser suspended in the background picks up again.
 */
export declare function getAudioContext(): AudioContext | null;

/**
 * Web Audio plumbing shared by every VoiceBeam instance.
 *
 * One AudioContext for the page, one MediaStreamAudioSourceNode per stream
 * (reference-counted, so several beams can listen to the same microphone),
 * and one AnalyserNode per instance. Nothing is connected to the
 * destination, so the audio is analysed but never played back.
 */
/** True when this browser can analyse audio at all. */
export declare function isAudioSupported(): boolean;

/** Resting distance between neighbouring lobes, px. */
export declare const LOBE_SPACING = 36;

/** Width of the ring the lobes travel around, px — one full turn of the flow. */
export declare const LOBE_SPAN: number;

export declare type MicrophoneState = 'idle' | 'requesting' | 'live' | 'denied' | 'unsupported' | 'error';

/**
 * Colour parsing for the palette and band props: `#rgb`, `#rrggbb`,
 * `rgb(r, g, b)` and `rgba(r, g, b, a)` all resolve to an [r, g, b]
 * triple. Anything else returns null and the caller keeps its default.
 */
export declare function parseRgb(color: string): [number, number, number] | null;

export declare function resolveVoiceDefaults(type?: VoiceBeamType, theme?: 'dark' | 'light'): VoiceGeometry;

/** The colour tuning for a type on a theme. */
export declare function resolveVoiceStyle(type?: VoiceBeamType, theme?: 'dark' | 'light'): VoiceTypeStyle;

/**
 * Per-theme presets. Tuned against border-beam's `line` type on the same
 * dark/light stages, so the two read as one family when used side by side.
 */
export declare const themePresets: Record<'dark' | 'light', VoiceThemeColors>;

/**
 * Microphone access for VoiceBeam.
 *
 * ```tsx
 * const mic = useMicrophone();
 * <button onClick={mic.start}>Listen</button>
 * <VoiceBeam stream={mic.stream}>…</VoiceBeam>
 * ```
 *
 * The stream is stopped on unmount, and when the browser ends the track
 * (device unplugged, permission revoked) the state falls back to 'idle'.
 */
export declare function useMicrophone(options?: UseMicrophoneOptions): UseMicrophoneResult;

export declare interface UseMicrophoneOptions {
    /**
     * Extra `getUserMedia` audio constraints. The defaults turn the browser's
     * voice processing off (echo cancellation, noise suppression, auto gain)
     * so the beam sees the real dynamics of the voice rather than a levelled
     * signal; pass `{}` to keep the browser defaults.
     */
    constraints?: MediaTrackConstraints;
    /** Ask for the microphone on mount rather than waiting for `start()`. */
    autoStart?: boolean;
}

export declare interface UseMicrophoneResult {
    /** The live stream to hand to `<VoiceBeam stream={…}>`, or null. */
    stream: MediaStream | null;
    state: MicrophoneState;
    /** The error behind a 'denied' / 'error' state, if any. */
    error: Error | null;
    /** True when this browser can capture audio at all. */
    supported: boolean;
    /** Request the microphone. Call it from a click so Safari lets audio start. */
    start: () => Promise<MediaStream | null>;
    /** Stop every track and drop the stream. */
    stop: () => void;
}

/**
 * VoiceBeam component — sound-reactive glow for React
 *
 * A centred, colourful beam along the bottom edge of the wrapped element
 * that rises and blooms with the level of a voice. Feed it a microphone
 * stream, or drive it yourself with `level`.
 *
 * @example
 * ```tsx
 * const mic = useMicrophone();
 *
 * <VoiceBeam stream={mic.stream}>
 *   <ChatInput />
 * </VoiceBeam>
 * ```
 */
declare const VoiceBeam: ForwardRefExoticComponent<VoiceBeamProps & RefAttributes<HTMLDivElement>>;
export { VoiceBeam }
export default VoiceBeam;

/**
 * Color variant for the beam — the same eight palettes as border-beam
 * - 'colorful': Full spectrum, Siri-like (default)
 * - 'mono': Monochromatic grayscale
 * - 'ocean': Blue and purple tones
 * - 'sunset': Warm orange, yellow, and red tones
 * - 'forest': Green and teal tones
 * - 'candy': Pink and magenta tones
 * - 'ice': Cyan and pale blue tones
 * - 'gold': Amber and yellow tones
 */
export declare type VoiceBeamColorVariant = 'colorful' | 'mono' | 'ocean' | 'sunset' | 'forest' | 'candy' | 'ice' | 'gold';

/**
 * A level source: a plain number, or a getter the driver samples every
 * frame. Pass a getter for anything that changes many times a second so
 * the component does not re-render per frame.
 */
export declare type VoiceBeamLevel = number | (() => number);

/**
 * Props for the VoiceBeam component
 */
export declare interface VoiceBeamProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Content to wrap with the voice beam effect */
    children: ReactNode;
    /**
     * Host preset: 'default' (chat input), 'pill' (recording pill) or
     * 'mobile' (bottom of a phone screen). Sets the defaults of the
     * geometry props below for that host; any prop you pass still wins.
     * @default 'default'
     */
    type?: VoiceBeamType;
    /**
     * Size of the whole effect. Multiplies every pixel dimension at once —
     * lobes, their spacing, the visible range, the bend, the band, the core,
     * the bloom blur, the flow speed — so the glow grows or shrinks as one
     * thing, on top of the type preset and the individual geometry props.
     * @default 1 (0.45 for `type="pill"`)
     */
    scale?: number;
    /**
     * Audio to react to. When set, the beam analyses this stream (level plus
     * low / mid / high bands) and ignores `level`. Get one from the
     * `useMicrophone` hook or any `getUserMedia` / WebRTC source.
     */
    stream?: MediaStream | null;
    /**
     * Manual drive, 0–1, used when no `stream` is given. A number re-renders
     * on change; a getter is sampled once per frame without re-rendering.
     * @default 0
     */
    level?: VoiceBeamLevel;
    /**
     * Input gain on the analysed audio. The default suits a laptop microphone
     * at conversational distance; raise it for quiet sources, lower it for a
     * close or hot one.
     * @default 3.1
     */
    sensitivity?: number;
    /**
     * Noise gate, 0–1. Levels below it read as silence, so room hum and
     * fan noise do not keep the beam twitching.
     * @default 0.015
     */
    threshold?: number;
    /**
     * Seconds the glow takes to rise toward a louder level.
     * @default 0.325
     */
    attack?: number;
    /**
     * Seconds the glow takes to settle after the sound drops.
     * @default 0.86
     */
    release?: number;
    /**
     * Resting presence, 0–1 — how much the beam breathes while silent so it
     * never looks dead. 0 hides it completely between sounds.
     * @default 0.23
     */
    idle?: number;
    /**
     * Period of the idle breathing in seconds.
     * @default 5.2
     */
    breatheDuration?: number;
    /**
     * How tall the glow grows at full level, as a multiple of its resting
     * height. The rise is centered on the bottom edge.
     * @default 1.2 (1.8 on the light theme; 1.35 for `pill`, 3 for `mobile`)
     */
    reach?: number;
    /**
     * How far the glow widens at full level, as a fraction of its resting
     * width. Side lobes drift outward as well, so a loud sound spreads.
     * @default 1.05 (0.8 on the light theme; 1.1 for `pill`, 0.45 for `mobile`)
     */
    spread?: number;
    /**
     * Let the low / mid / high bands move the colored lobes independently
     * (center follows the lows, the sides the mids and highs). With a
     * manual `level` the bands are synthesised from the level, so the lobes
     * still dance. Off, every lobe follows the one level.
     * @default true
     */
    bands?: boolean;
    /**
     * How fast the spectrum travels sideways, in px per second at full
     * level — the lobes slide left to right while a voice is heard and rest
     * when it stops, so every colour takes a turn at the centre. Negative
     * flows right to left; 0 holds the lobes in place.
     * @default 48
     */
    flow?: number;
    /**
     * Processing state — turn it on once the voice has been captured and
     * something is working on it. The lobes gather into one compact beam
     * that travels the glow's range left to right and back, eased at each
     * end and looped — border-beam's `line` type, confined to the voice
     * glow — and the glow is held lit at `processingLevel` so the beam has
     * colour. Both blend in and out smoothly. The distortion settles out in
     * about a quarter second and stays off while processing.
     * @default false
     */
    processing?: boolean;
    /**
     * Seconds for one pass of the processing beam (left to right, or back
     * again).
     * @default 1.1 (1.05 for `type="mobile"`)
     */
    processingDuration?: number;
    /**
     * How lit the glow is held while processing, 0–1, as if a voice were
     * speaking at that level.
     * @default 0.55 (0.35 for `type="mobile"`)
     */
    processingLevel?: number;
    /**
     * Seconds the morph between the voice glow and the travelling beam
     * takes, in either direction — the gather, the narrowing and the travel
     * ease in and out over it.
     * @default 0.6
     */
    processingEase?: number;
    /**
     * How far the processing beam travels to each side, as a multiple of
     * half the lobe ring: 1 sweeps the glow's resting spread, lower keeps
     * it near the centre, higher runs it out to the corners.
     * @default 1.55 (2 for `pill`, 1 for `mobile`)
     */
    processingTravel?: number;
    /**
     * How the processing beam eases into each turn of its sweep: 1 runs at
     * a constant speed and turns sharply, 2 slows smoothly into the ends,
     * higher dwells there longer before heading back.
     * @default 2.1
     */
    processingCurve?: number;
    /**
     * How much the coloured glow rides the element's corner arcs while
     * processing, 0–1: 0 keeps it flat along the bottom edge, 1 lifts it
     * along the rounded corner as it passes through. The band line follows
     * the corner either way.
     * @default 0.45 (0 for `type="pill"`, 0.4 for `type="mobile"`)
     */
    cornerFollow?: number;
    /**
     * Color variant for the beam
     * @default 'colorful'
     */
    colorVariant?: VoiceBeamColorVariant;
    /**
     * Your own lobe colours, centre first then the pairs outward — up to
     * seven, any CSS hex or rgb. Slots you leave out (or that fail to
     * parse) keep the variant's colour for the theme.
     */
    colors?: string[];
    /**
     * The band's colours: the core ridge and its chromatic fringes above,
     * between and below. Any CSS hex or rgb; unset ones keep the theme's
     * defaults (white core with red / green / blue fringes on dark, a pink
     * core with rose / lavender / sky on light).
     */
    bandColors?: {
        core?: string;
        above?: string;
        mid?: string;
        below?: string;
    };
    /**
     * Theme mode — adapts beam colors for dark or light backgrounds;
     * 'auto' follows prefers-color-scheme
     * @default 'dark'
     */
    theme?: VoiceBeamTheme;
    /**
     * Disable the slow hue drift for static colors
     * @default false
     */
    staticColors?: boolean;
    /**
     * Hue drift range in degrees (the palette wanders ± this far)
     * @default 24 (dark) / 40 (light)
     */
    hueRange?: number;
    /**
     * Period of the hue drift in seconds
     * @default 12 (dark) / 8.5 (light)
     */
    hueDuration?: number;
    /**
     * Whether the effect is on. Off fades the beam out and stops the audio
     * analysis.
     * @default true
     */
    active?: boolean;
    /**
     * Freezes the effect where it is — the glow, the band and the audio
     * analysis all hold their last frame — without fading it out. Other
     * props still shape the held frame, and the clocks resume where they
     * stopped.
     * @default false
     */
    paused?: boolean;
    /**
     * Custom border radius in pixels. When omitted, the component
     * auto-detects the border-radius of the first child element.
     */
    borderRadius?: number;
    /**
     * Brightness multiplier for the glow
     * @default 1.15 (dark chat input) / 0.95 (light); the dark theme itself is 1.1, `pill` runs 1.35, `mobile` 1.2 on dark
     */
    brightness?: number;
    /**
     * Saturation multiplier for the glow
     * @default 1.2 (dark) / 1.6 (light); `pill` and `mobile` run 1.5 on dark
     */
    saturation?: number;
    /**
     * Multiplies the bloom blur radius, so the halo reads tighter (< 1) or
     * wider and softer (> 1).
     * @default 1
     */
    glowSize?: number;
    /**
     * Per-layer opacity multipliers on the theme's own: the crisp edge
     * stroke, the soft inner light and the blurred bloom. The same knobs
     * as the `--voice-stroke-opacity` / `--voice-inner-opacity` /
     * `--voice-bloom-opacity` CSS hooks.
     * @default 1
     */
    strokeOpacity?: number;
    innerOpacity?: number;
    bloomOpacity?: number;
    /**
     * Bend — how much, in px, the glow's top contour humps up at the centre
     * at full level. The ceiling the glow is masked to gains that height in
     * the middle and none at the ends, and a faint rim traces the curve, so
     * the glow's outline bows upward with the voice like space bending
     * around it. 0 keeps the contour at its plain ellipse.
     * @default 60
     */
    bend?: number;
    /** Opacity of the band, 0 hides it. @default 1.55 (1.8 for `mobile`; on light 1.7, or 2 for `pill`) */
    bandStrength?: number;
    /** Thickness of the band. @default 2.15 */
    bandWidth?: number;
    /** Height of the band's peak as a fraction of the glow's ceiling, 0.1–1.3. @default 0.35 */
    bandPosition?: number;
    /** Bell exponent: below 2 an exponential, cusp-like rise; 2 a gaussian; above, a flatter top. @default 1.75 */
    bandCurve?: number;
    /** Bell width as a fraction of the glow's half-range: small is a narrow spike with long tails, large a broad dome. @default 0.87 */
    bandSpread?: number;
    /** Asymmetry, −0.6–0.6: positive widens the right side and steepens the left. @default 0.12 */
    bandSkew?: number;
    /** Vertical shift of the whole band line in px; negative sinks it toward the edge. @default -27 */
    bandOffset?: number;
    /** How far the band's ends rise again toward the corners, as a fraction of its peak, 0–1 — the line opens upward at the edges instead of dying flat. @default 0.59 (0 for `pill`) */
    bandTail?: number;
    /** Where the tail's rise starts, as a share of the distance from the beam's centre to the element's edge (0.85 = only the last 15%); it always reaches the full lift exactly at the corner. @default 0.67 */
    bandTailPosition?: number;
    /** Exponent of the rise: 1 a straight ramp, 2 a parabola, higher a hook that stays low and whips up at the corner. @default 2.4 */
    bandTailCurve?: number;
    /** Px the band runs past each side of the element, so the hook peaks outside and is cropped by the component's edge. Scales with `scale`. @default 15 */
    bandTailOverflow?: number;
    /** Chromatic aberration — how far the red and blue fringes split from the core, 0–1. @default 0.89 */
    bandAberration?: number;
    /**
     * Distortion — how much the glow under the band warps sideways, 0–1.
     * A slowly drifting noise field displaces the inner light and the bloom
     * horizontally, stronger as the voice rises, so the colours shimmer and
     * stretch like light through bent space. Only the glow UNDER the band
     * line warps — the layers are split at the line — and it is independent
     * of `bandStrength`, so the line can be invisible and the warp strong.
     * The edge stroke stays crisp. 0 turns the filter off entirely.
     * @default 0.62
     */
    distortion?: number;
    /** Grain of the distortion's noise: below 1 broad slow waves, above 1 finer ripples. @default 2.3 */
    distortionDetail?: number;
    /** Width of every colour lobe, all layers. @default 0.65 */
    glowWidth?: number;
    /** Height of every colour lobe, all layers. @default 1.25 */
    glowHeight?: number;
    /** Distance between the lobes (and the ring the flow travels). @default 0.85 */
    lobeSpacing?: number;
    /** Width of the visible ellipse the glow is masked to. @default 0.75 */
    rangeWidth?: number;
    /** Height of the visible ellipse the glow is masked to. @default 1 */
    rangeHeight?: number;
    /** Where each lobe fades out — below 1 crisper, above 1 softer. @default 1.07 */
    softness?: number;
    /** The white hot spot at the centre of the edge. @default 1 */
    coreSize?: number;
    /**
     * The epicentre: a soft white wash under the band line at the centre of
     * the edge, so the source reads lighter than the band. 0–3: up to 1 the
     * wash's opacity, past 1 its solid white core widens and the whole wash
     * grows, washing out more of the colour beneath.
     * @default 0 (1.8 on the light theme)
     */
    coreLight?: number;
    /** Width of the epicentre wash. @default 1 */
    coreLightWidth?: number;
    /** Height of the epicentre wash. @default 1 */
    coreLightHeight?: number;
    /** Size of the colours painted into the 1px edge stroke. @default 1 */
    strokeScale?: number;
    /** Size of the soft light inside the element. @default 1 */
    innerScale?: number;
    /** Extra height of the inner light — how far it reaches into the element. @default 1 */
    innerHeight?: number;
    /** Size of the blurred halo. @default 1 */
    bloomScale?: number;
    /** Extra height of the halo — how far the soft light climbs. @default 1 */
    bloomHeight?: number;
    /**
     * Overall strength/opacity of the effect (0–1).
     * Only affects the beam layers — not the children.
     * @default 1 (dark) / 0.8 (light); 1 on both for `type="mobile"`
     */
    strength?: number;
    /**
     * Additional class name for the container
     */
    className?: string;
    /**
     * Additional inline styles for the container
     */
    style?: CSSProperties;
    /**
     * Extra CSS appended after the beam's own generated stylesheet. Write
     * `{id}` wherever the instance id belongs — the root is
     * `[data-voice-beam="{id}"]`, its layers the `::before` / `::after`
     * pseudo-elements and `[data-voice-beam-bloom]`, and keyframes are named
     * `*-{id}` — and it is substituted per instance.
     */
    css?: string;
    /**
     * Called every frame with the smoothed level (0–1) the beam is showing.
     * Handy for a meter or a "listening" label; avoid setting React state
     * from it on every call.
     */
    onLevel?: (level: number) => void;
    /**
     * Callback when the fade-in completes
     */
    onActivate?: () => void;
    /**
     * Callback when the fade-out completes
     */
    onDeactivate?: () => void;
}

/**
 * Theme mode for adapting beam colors to the background
 */
export declare type VoiceBeamTheme = 'dark' | 'light' | 'auto';

/**
 * Host preset — retunes the glow's geometry for the element it wraps
 * - 'default': a chat input or card, ~350px wide
 * - 'pill': a small recording pill, ~150×44 — glow pulled in, shallower bend
 * - 'mobile': the bottom of a phone screen — wider range, taller rise
 *
 * A preset only supplies defaults; every geometry prop still overrides it.
 */
export declare type VoiceBeamType = 'default' | 'pill' | 'mobile';

/**
 * The tuned defaults — the `default` type, a ~350px chat input.
 */
export declare const voiceDefaults: VoiceGeometry;

/**
 * The geometry and response knobs a `type` preset may retune. Everything
 * here is a prop on the component; the preset only supplies the default,
 * so an explicit prop always wins.
 */
export declare interface VoiceGeometry {
    /** Size of the whole effect (see the `scale` prop). */
    scale: number;
    /** Bloom blur multiplier (see the `glowSize` prop). */
    glowSize: number;
    /** Processing: seconds per pass of the beam, the level it is held at, how far it travels and how it eases into the turns. */
    processingDuration: number;
    processingLevel: number;
    processingTravel: number;
    processingCurve: number;
    /** How much the travelling beam rides the element's corner arcs, 0–1. */
    cornerFollow: number;
    /** Per-layer opacity multipliers on the theme preset. */
    strokeOpacity: number;
    innerOpacity: number;
    bloomOpacity: number;
    idle: number;
    reach: number;
    spread: number;
    flow: number;
    bend: number;
    bandStrength: number;
    bandWidth: number;
    bandPosition: number;
    bandCurve: number;
    bandSpread: number;
    bandSkew: number;
    bandOffset: number;
    /** How far the band's ends rise again toward the corners, as a fraction of its peak. */
    bandTail: number;
    /** Where the tail's rise starts, as a share of the centre-to-edge distance; it always reaches full lift at the corner. */
    bandTailPosition: number;
    /** Exponent of the rise: 1 a straight ramp, higher a hook that stays low then whips up at the corner. */
    bandTailCurve: number;
    /** Px the band runs past each side of the element, so the hook is cropped by the component. */
    bandTailOverflow: number;
    bandAberration: number;
    distortion: number;
    distortionDetail: number;
    glowWidth: number;
    glowHeight: number;
    lobeSpacing: number;
    rangeWidth: number;
    rangeHeight: number;
    softness: number;
    coreSize: number;
    /** The epicentre: a white wash under the band line at the centre of the edge, 0–1 (light theme only by default). */
    coreLight: number;
    coreLightWidth: number;
    coreLightHeight: number;
    strokeScale: number;
    innerScale: number;
    innerHeight: number;
    bloomScale: number;
    bloomHeight: number;
}

/**
 * Lobe geometry, in px for a ~350px-wide reference element. Seven soft
 * ellipses fan out from the bottom center: the centre lobe follows the low
 * band, its neighbours the mids, the outer pair the highs and the far pair
 * the mids again, so a voice makes the colours ripple outward instead of
 * one blob pumping. `x` is the resting offset from centre; the driver
 * slides every lobe along by the flow phase (wrapping at ±LOBE_SPAN/2 so
 * the colours cycle through the centre) and it scales with the spread so
 * a loud sound pushes the side lobes apart.
 */
export declare interface VoiceLobe {
    x: number;
    w: number;
    h: number;
    band: 0 | 1 | 2;
}

export declare const voiceLobes: readonly VoiceLobe[];

/**
 * Seven colours per palette, one per lobe (centre first, then pairs). Light
 * palettes use deeper values because they sit on a white surface at far
 * lower opacity.
 */
export declare const voicePalettes: Record<VoiceBeamColorVariant, {
    dark: string[];
    light: string[];
}>;

/**
 * Theme color configuration
 */
export declare interface VoiceThemeColors {
    strokeOpacity: number;
    innerOpacity: number;
    bloomOpacity: number;
    innerShadow: string;
    saturation: number;
    brightness: number;
    /** Optional per-theme hue drift defaults; fall back to 24° / 12 s / 0°. */
    hueRange?: number;
    hueDuration?: number;
    hueBase?: number;
    /** Optional per-theme overall strength (falls back to 1). */
    strength?: number;
    /** Optional per-theme band strength for types that do not set their own. */
    bandStrength?: number;
}

/**
 * Per-type overrides on the defaults. The glow is authored in px for the
 * default host, so a smaller or larger host needs its lobes, range and
 * band rescaled to read the same.
 *
 * - `pill`: a ~150×44 recording pill — everything pulled in, a lower
 *   reach, a shallower bend, a thinner band.
 * - `mobile`: the bottom of a phone screen (~400px wide, tall) — a wider
 *   range and lobe ring, a taller rise, a broader band.
 */
export declare const voiceTypePresets: Record<VoiceBeamType, Partial<VoiceGeometry>>;

/**
 * Colour tuning a type may carry on top of the theme preset (brightness
 * and saturation default per theme, so these are optional overrides).
 */
export declare type VoiceTypeStyle = {
    brightness?: number;
    saturation?: number;
    strength?: number;
};

export declare const voiceTypeStyle: Record<VoiceBeamType, VoiceTypeStyle>;

export { }
