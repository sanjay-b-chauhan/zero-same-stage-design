/* The real hook resolves icons through the desktop app's media bridge, which a browser does not have.
   Same exports. The two chip icons are lucide's folder and file-text, sized so the first frame stays sharp at 2x. */
const svg = (paths: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#1f1d1e" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  )}`;

const FOLDER = svg(
  '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'
);
const DOCUMENT = svg(
  '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>'
);

const LOCAL: Record<string, string> = {
  'icon-project-brief': FOLDER,
  'icon-sample-report': DOCUMENT,
  'voice-animation': 'static-media://asset/voice-animation',
};

export interface StaticMediaState {
  url: string | null;
  settled: boolean;
}

export const useStaticMedia = (id: string | null): StaticMediaState => ({
  url: (id && LOCAL[id]) || null,
  settled: true,
});

export const useStaticMediaUrl = (id: string | null): string | null => useStaticMedia(id).url;
