/* The real app a file opens in, as its icon: Google Sheets for a sheet, the tool's own mark for a tool link.
   null when there is no real mark for it, and the row draws a plain glyph instead. */
import type { FileRef } from '../../types';

const TOOLS: Array<[RegExp, string]> = [
  [/github\.com/i, 'static/logos/tool-github.png'],
  [/openrouter\.ai/i, 'static/logos/tool-openrouter.png'],
  [/smith\.langchain|langsmith/i, 'static/logos/tool-langsmith.png'],
  [/claude[- ]?code|docs\.anthropic\.com/i, 'static/logos/tool-claudecode.webp'],
  [/claude\.ai/i, 'static/logos/logo-claude.svg'],
];

export const appIcon = (f: FileRef): string | null => {
  if (f.kind === 'csv' || /\.(csv|xlsx?)$/i.test(f.name)) return 'static/logos/logo-sheets.svg';
  if (f.kind === 'link') {
    const hit = TOOLS.find(([re]) => re.test(f.url ?? '') || re.test(f.name));
    return hit ? hit[1] : 'static/logos/chrome.svg';
  }
  if (f.kind === 'text' || /\.(md|txt)$/i.test(f.name)) return 'static/logos/f-md.svg';
  return null;
};
