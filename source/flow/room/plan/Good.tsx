/* What good looks like on the objective: one plain link, the deliverable her kickoff named. No surface until you point
   at it; then a download key shows at its end. A click opens the sample in a centred preview that grows out of the
   link and goes back into it. Two things only: preview it, or download it */
import { Download, FileText, Link2, Presentation, X } from 'lucide-react';
import { forwardRef, useLayoutEffect, useRef, type RefObject } from 'react';
import { softClick } from '../../audio';
import { deliverableArt, type DeliverableIcon } from '../../open/briefData';
import { moveTo, place as placeLook } from '../../open/motion';
import { SPRING, SPRING_MS, prefersReduced } from '../../stage/parts/util';
import type { ProjectMeta } from '../../types';
import GoodDoc from './GoodDoc';
import type { Good } from './goodData';

const DEL_ICON: Record<DeliverableIcon, typeof FileText> = { doc: FileText, deck: Presentation, link: Link2 };
const SHUT = 'cubic-bezier(.5,0,.75,0)';

function DelIcon({ good }: { good: Good }) {
  const art = deliverableArt({ label: good.title, type: good.type });
  const Icon = art.icon ? DEL_ICON[art.icon] : FileText;
  return art.img ? <img src={art.img} alt="" draggable={false} /> : <Icon size={14} strokeWidth={2} />;
}

export const GoodLink = forwardRef<HTMLButtonElement, { good: Good; onOpen: () => void }>(function GoodLink({ good, onOpen }, ref) {
  return (
    <div className="ob-good" data-rise>
      <span className="ob-lab">What good looks like</span>
      <span className="ob-gl">
        <button
          ref={ref}
          type="button"
          className="ob-act ob-gl-a"
          aria-haspopup="dialog"
          onClick={() => {
            softClick();
            onOpen();
          }}
        >
          <DelIcon good={good} />
          {good.title}
          <span className="ob-type">{good.type}</span>
        </button>
        {good.pdf && (
          <a className="ob-gl-dl" href={good.pdf} download={good.file} aria-label={`Download ${good.title}`} onClick={() => softClick()}>
            <Download size={14} strokeWidth={2} />
          </a>
        )}
      </span>
    </div>
  );
});

/* where the link is, as the preview's own offset and scale, so it grows out of it and goes back into it */
const fromLink = (link: HTMLElement | null, box: HTMLElement): string => {
  const b = box.getBoundingClientRect();
  if (!link || !b.width) return 'translateY(24px) scale(0.96)';
  const l = link.getBoundingClientRect();
  const dx = l.left + l.width / 2 - (b.left + b.width / 2);
  const dy = l.top + l.height / 2 - (b.top + b.height / 2);
  return `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(${Math.max(0.08, l.width / b.width).toFixed(3)})`;
};

export function GoodPreview({
  good,
  project,
  open,
  linkRef,
  onClose,
}: {
  good: Good;
  project: ProjectMeta;
  open: boolean;
  linkRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const scrim = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useLayoutEffect(() => {
    const el = box.current;
    const sc = scrim.current;
    const link = linkRef.current;
    if (!el || !sc) return;
    if (open) {
      seen.current = true;
      sc.style.visibility = 'visible';
      el.style.visibility = 'visible';
      moveTo(sc, { opacity: '1' }, { duration: 420, easing: 'ease-out' });
      /* measured at rest, then sent back into the link to grow out of it */
      placeLook(el, { transform: 'none', filter: 'blur(0px)', opacity: '1' });
      if (!prefersReduced(el)) {
        placeLook(el, { transform: fromLink(link, el), filter: 'blur(8px)', opacity: '0' });
        moveTo(el, { transform: 'none', filter: 'blur(0px)', opacity: '1' }, { duration: SPRING_MS, easing: SPRING });
      }
      el.focus({ preventScroll: true });
    } else if (seen.current) {
      moveTo(sc, { opacity: '0' }, { duration: 260, easing: 'ease-out' }, () => (sc.style.visibility = 'hidden'));
      const to = fromLink(link, el);
      moveTo(el, { transform: to, filter: 'blur(6px)', opacity: '0' }, { duration: 340, easing: SHUT }, () => (el.style.visibility = 'hidden'));
      const at = document.activeElement;
      if (!at || at === document.body || el.contains(at)) link?.focus({ preventScroll: true });
    }
  }, [open, linkRef]);

  return (
    <>
      <div ref={scrim} className="ob-pv-scrim" aria-hidden onClick={onClose} />
      <div className="ob-pv-wrap">
        <section ref={box} className="ob-pv" role="dialog" aria-modal="true" aria-label={good.title} tabIndex={-1} inert={!open}>
          <header className="ob-pv-h">
            <span className="ob-pv-ic">
              <DelIcon good={good} />
            </span>
            <span className="ob-pv-t">
              {good.title}
              <span className="ob-type">{good.type}</span>
            </span>
            {good.pdf && (
              <a className="ob-pv-dl" href={good.pdf} download={good.file} onClick={() => softClick()}>
                <Download size={14} strokeWidth={2} />
                Download
              </a>
            )}
            <button type="button" className="ob-pv-x" aria-label="Close the preview" onClick={onClose}>
              <X size={16} strokeWidth={1.75} />
            </button>
          </header>
          <div className="ob-pv-body">
            <GoodDoc good={good} project={project} />
          </div>
        </section>
      </div>
    </>
  );
}
