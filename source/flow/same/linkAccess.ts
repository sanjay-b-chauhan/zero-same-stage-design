/* b17: who can open a submitted link, faked like the rest of the prototype. Most work links are private when first
   pasted: a Google Doc, Sheet, Slides or Drive file, a Figma file, a Notion page, a Dropbox or OneDrive file without a
   share marker reads as private. Everything else reads as open. */
export interface LinkHost {
  name: string;
  steps: string[];
}

const HOSTS: { test: RegExp; host: LinkHost }[] = [
  { test: /docs\.google\.com|drive\.google\.com/i, host: { name: 'Google', steps: ['Open it and press Share, top right', 'Under General access pick Anyone with the link', 'Leave it on Viewer, then Copy link'] } },
  { test: /figma\.com/i, host: { name: 'Figma', steps: ['Press Share, top right', 'Set Anyone with the link to can view', 'Copy link'] } },
  { test: /notion\.(so|site)/i, host: { name: 'Notion', steps: ['Press Share, top right', 'Open Publish and turn it on', 'Copy the web link'] } },
  { test: /dropbox\.com|1drv\.ms|onedrive\.live\.com|sharepoint\.com/i, host: { name: 'the file', steps: ['Open the Share menu', 'Set the link so anyone who has it can view', 'Copy link'] } },
];

const SHARED = /usp=sharing|\/pub(html)?\b|[?&]share=|anyone|\/s\/[a-z0-9]+\?dl=|[?&]t=/i;

export const hostOf = (url: string): LinkHost | null => HOSTS.find((h) => h.test.test(url))?.host ?? null;

export const looksPrivate = (url: string): boolean => !!hostOf(url) && !SHARED.test(url);
