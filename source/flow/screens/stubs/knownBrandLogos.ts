/* The real lookup answers with a Google favicon over the network. Our two brands answer with their real logo from disk. */
import { resolveKnownBrandLogo as lookup } from '@/renderer/windows/newMainUI/pilotWebUI/components/Portfolio/utils/knownBrandLogos.ts';

export * from '@/renderer/windows/newMainUI/pilotWebUI/components/Portfolio/utils/knownBrandLogos.ts';

const LOCAL: Record<string, string> = {
  spotify: 'static/logos/logo-spotify.svg',
  amazon: 'static/logos/logo-amazon.svg',
};

export const resolveKnownBrandLogo = (name: string | undefined | null, size = 128): string | undefined =>
  LOCAL[name?.trim().toLowerCase() ?? ''] ?? lookup(name, size);
