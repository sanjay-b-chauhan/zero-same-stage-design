/* The in-page PiP on a fake desktop, by default: the real native one comes with the Zero desktop app, this one is to feel it.
   ?pip=real asks for the real always-on-top window (Document Picture-in-Picture), and falls back to the page when refused.
   Everything in here works from the window it is given, and survives the tab going to the background.
   The window gets every stylesheet of the page (b36.css with them) and the stage's light or dark, so the same tokens apply in both. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlow } from '../engine/store';
import { BAR_W, STRIP_H, TALL_AT, WIN_FLOOR_H, type Size } from './logic';
import { bindTalkKeys, talkWindow } from './talk';
import { runTimersOn } from './timerHost';

interface DocumentPip {
  window: Window | null;
  requestWindow(options: { width: number; height: number; disallowReturnToOpener?: boolean }): Promise<Window>;
}

export type PipMode = 'opening' | 'real' | 'dock';

export interface PipHost {
  mode: PipMode;
  win: Window | null;
  mount: HTMLElement | null;
  /* Resize the real window. Only works on a click. False when the browser said no. */
  fit(size: Size): boolean;
  /* a state change that came from the window itself must not resize it back */
  sameAsWindow(size: Size): boolean;
}

const LOAD_WAIT_MS = 900;
const DARK_BG = '#1a1a1c'; /* b36 slab */
const DARK_BAR = '#0b0b0c'; /* b36 ground */
const LIGHT_BG = '#ffffff';
const FONT_FACES = ['400 14px Inter', '500 14px Inter', '400 12px Inter', '500 12px Inter'];

const pipApi = (): DocumentPip | null =>
  (window as unknown as { documentPictureInPicture?: DocumentPip }).documentPictureInPicture ?? null;

export const wantsReal = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).get('pip') === 'real';
  } catch {
    return false;
  }
};

const isStyleNode = (n: Node): n is HTMLStyleElement | HTMLLinkElement =>
  n instanceof HTMLStyleElement || (n instanceof HTMLLinkElement && n.rel === 'stylesheet');

/* the classes on <html> follow the page, whenever they change */
const mirrorRoot = (doc: Document): (() => void) => {
  const from = document.documentElement;
  const to = doc.documentElement;
  const copy = () => {
    to.className = from.className;
  };
  copy();
  const watch = new MutationObserver(copy);
  watch.observe(from, { attributes: true, attributeFilter: ['class'] });
  return () => watch.disconnect();
};

/* the window's own ground under the root, light or dark with the stage, so a resize never shows the wrong colour */
const paintGround = (doc: Document, theme: HTMLMetaElement): (() => void) => {
  let was: boolean | null = null;
  const paint = () => {
    const light = useFlow.getState().ui.lightStage;
    if (light === was) return;
    was = light;
    const bg = light ? LIGHT_BG : DARK_BG;
    doc.documentElement.style.colorScheme = light ? 'light' : 'dark';
    doc.documentElement.style.background = bg;
    doc.body.style.background = bg;
    theme.content = light ? LIGHT_BG : DARK_BAR;
  };
  paint();
  return useFlow.subscribe(paint);
};

/* Inter has to load inside this document too. The window waits for it, a little, so the first paint is the real type. */
const loadFonts = (doc: Document): Promise<void> => {
  const fonts = doc.fonts as FontFaceSet | undefined;
  if (!fonts) return Promise.resolve();
  return Promise.all(FONT_FACES.map((f) => fonts.load(f).catch(() => []))).then(() => undefined);
};

/* Styles, base and a ground before anything paints, so the window never flashes white. */
export const dressWindow = (win: Window, title?: string): { mount: HTMLElement; loaded: Promise<void>; undress: () => void } => {
  const doc = win.document;
  doc.documentElement.lang = document.documentElement.lang;
  doc.documentElement.style.height = '100%';
  const unmirror = mirrorRoot(doc);
  const base = doc.createElement('base');
  base.href = document.baseURI;
  doc.head.appendChild(base);
  const theme = doc.createElement('meta');
  theme.name = 'theme-color';
  doc.head.appendChild(theme);
  doc.title = title ?? useFlow.getState().project?.manager.name ?? 'Zero';
  doc.body.style.cssText = 'margin:0;height:100%;overflow:hidden';
  const unpaint = paintGround(doc, theme);

  const waits: Array<Promise<void>> = [];
  const copy = (n: HTMLStyleElement | HTMLLinkElement) => {
    const c = doc.importNode(n, true);
    if (c.tagName === 'LINK') {
      waits.push(
        new Promise((res) => {
          c.addEventListener('load', () => res(), { once: true });
          c.addEventListener('error', () => res(), { once: true });
        })
      );
    }
    doc.head.appendChild(c);
  };
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => {
    if (isStyleNode(n)) copy(n);
  });
  /* a part loaded later brings its styles with it */
  const watch = new MutationObserver((records) => {
    records.forEach((r) =>
      r.addedNodes.forEach((n) => {
        if (isStyleNode(n)) copy(n);
      })
    );
  });
  watch.observe(document.head, { childList: true });

  const mount = doc.createElement('div');
  mount.style.height = '100%';
  doc.body.appendChild(mount);

  const loaded = Promise.race([
    Promise.all(waits).then(() => loadFonts(doc)),
    new Promise<void>((res) => win.setTimeout(res, LOAD_WAIT_MS)),
  ]);
  return {
    mount,
    loaded,
    undress: () => {
      watch.disconnect();
      unmirror();
      unpaint();
    },
  };
};

export function usePipWindow(): PipHost {
  const winRef = useRef<Window | null>(null);
  const [state, setState] = useState<{ mode: PipMode; win: Window | null; mount: HTMLElement | null }>({
    mode: 'opening',
    win: null,
    mount: null,
  });

  useEffect(() => {
    const api = pipApi();
    if (!wantsReal() || !api) {
      setState({ mode: 'dock', win: null, mount: null });
      return;
    }
    let disposed = false;
    let undress = () => {};
    let unbind = () => {};

    const land = (win: Window) => {
      winRef.current = win;
      runTimersOn(win);
      const dressed = dressWindow(win);
      undress = dressed.undress;
      /* the talk keys work with focus in this window too */
      const untalk = bindTalkKeys(win);
      talkWindow(win);

      /* Closing the window, by our switch or Chrome's X, is going back to the big screen. Nothing is lost. */
      const onHide = () => {
        if (winRef.current !== win) return;
        winRef.current = null;
        runTimersOn(null);
        talkWindow(null);
        untalk();
        undress();
        if (!disposed) useFlow.getState().actions.setSurface('big');
      };
      /* Space belongs to useHold in this document. Everything else the parent listens for still reaches it. */
      const forward = (e: KeyboardEvent) => {
        if (e.code === 'Space') return;
        if (!e.ctrlKey && !e.metaKey && e.key !== 'Escape') return;
        if (e.ctrlKey && e.key.toLowerCase() === 'd') e.preventDefault();
        document.dispatchEvent(
          new KeyboardEvent(e.type, {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            repeat: e.repeat,
            bubbles: true,
            cancelable: true,
          })
        );
      };
      /* a file dropped beside the drop area must not make this window leave the page */
      const stopDrop = (e: Event) => e.preventDefault();
      win.addEventListener('pagehide', onHide);
      win.document.addEventListener('keydown', forward);
      win.document.addEventListener('keyup', forward);
      win.document.addEventListener('dragover', stopDrop);
      win.document.addEventListener('drop', stopDrop);
      unbind = () => {
        untalk();
        talkWindow(null);
        win.removeEventListener('pagehide', onHide);
        win.document.removeEventListener('keydown', forward);
        win.document.removeEventListener('keyup', forward);
        win.document.removeEventListener('dragover', stopDrop);
        win.document.removeEventListener('drop', stopDrop);
      };

      /* Chrome may hand back the size this window last had. The state follows the window: no click, no resize. */
      const { actions, ui } = useFlow.getState();
      const tall = win.innerHeight > TALL_AT;
      if (tall !== ui.pipOpen) actions.setPipOpen(tall);

      void dressed.loaded.then(() => {
        if (disposed || winRef.current !== win) return;
        setState({ mode: 'real', win, mount: dressed.mount });
      });
    };

    const existing = api.window;
    const opening = existing
      ? Promise.resolve(existing)
      : api.requestWindow({ width: BAR_W, height: WIN_FLOOR_H, disallowReturnToOpener: true });

    opening
      .then((win) => {
        if (disposed) {
          win.close();
          return;
        }
        land(win);
      })
      .catch(() => {
        if (!disposed) setState({ mode: 'dock', win: null, mount: null });
      });

    return () => {
      disposed = true;
      unbind();
      undress();
      const win = winRef.current;
      winRef.current = null;
      runTimersOn(null);
      try {
        win?.close();
      } catch {
        /* already closed */
      }
    };
  }, []);

  const fit = useCallback((size: Size): boolean => {
    const win = winRef.current;
    if (!win || win.closed) return false;
    const frameW = Math.max(0, win.outerWidth - win.innerWidth);
    const frameH = win.outerHeight > win.innerHeight ? win.outerHeight - win.innerHeight : STRIP_H;
    try {
      win.resizeTo(size.w + frameW, Math.max(WIN_FLOOR_H, size.h) + frameH);
      return true;
    } catch {
      return false;
    }
  }, []);

  const sameAsWindow = useCallback((size: Size): boolean => {
    const win = winRef.current;
    return !!win && win.innerWidth === size.w && win.innerHeight === Math.max(WIN_FLOOR_H, size.h);
  }, []);

  return { ...state, fit, sameAsWindow };
}
