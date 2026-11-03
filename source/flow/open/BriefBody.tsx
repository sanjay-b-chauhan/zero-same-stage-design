/* The project brief's content, b47's read on b36's dark sheet: plain tabs over one scrolling read, the selected tab in a
   thin outline pill that follows the read. Overview (the description with its numbers lit, then Company, Manager and
   Project Type), What you'll cover (Tool Stack, Workflows, Skills & Concepts), Stages with the total, Deliverables.
   Shown in the opening's sheet and again from the objective's Project brief. It fills its parent as a column.
   data-rise="h" is the tab row, data-rise="b" the first section's lines: the sheet lifts them in when it arrives. */
import { Briefcase, FileText, Link2, Presentation } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { clock } from '../clock';
import { prefersReduced } from '../stage/parts/util';
import type { ProjectMeta } from '../types';
import { BRIEFS, deliverableArt, emphasize, hoursText, totalMinutes, type DeliverableIcon } from './briefData';
import './open.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'cover', label: "What you'll cover" },
  { id: 'stages', label: 'Stages' },
  { id: 'deliverables', label: 'Deliverables' },
] as const;
type SecId = (typeof SECTIONS)[number]['id'];

const SPY_AIR = 48;
const LOCK_MS = 900;
const LINE_ICON = { size: 14, strokeWidth: 1.75 } as const;
const DEL_ICON: Record<DeliverableIcon, typeof FileText> = { doc: FileText, deck: Presentation, link: Link2 };

export default function BriefBody({ project }: { project: ProjectMeta }) {
  const copy = BRIEFS[project.id];
  const total = totalMinutes(project.stages);
  const uid = useId();
  const [tab, setTab] = useState<SecId>('overview');
  const row = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const read = useRef<HTMLDivElement>(null);
  const secs = useRef<Partial<Record<SecId, HTMLElement | null>>>({});
  const lock = useRef<{ id: SecId; timer: number } | null>(null);

  /* the outline pill sits on the chosen word and glides to the next */
  useLayoutEffect(() => {
    const r = row.current;
    const p = pill.current;
    if (!r || !p) return;
    const fit = () => {
      const b = r.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
      if (!b) return;
      p.style.width = `${b.offsetWidth}px`;
      p.style.transform = `translateX(${b.offsetLeft}px)`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(r);
    if (!r.dataset.ready) requestAnimationFrame(() => (r.dataset.ready = '1'));
    return () => ro.disconnect();
  }, [tab]);

  /* the tab follows the read: the last section whose top has reached the top, or the last one at the bottom */
  const spy = useCallback(() => {
    const el = read.current;
    if (!el || lock.current) return;
    let on: SecId = 'overview';
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) on = SECTIONS[SECTIONS.length - 1].id;
    else
      for (const s of SECTIONS) {
        const sec = secs.current[s.id];
        if (sec && sec.offsetTop <= el.scrollTop + SPY_AIR) on = s.id;
      }
    setTab(on);
  }, []);

  useEffect(
    () => () => {
      if (lock.current) clock.clearTimeout(lock.current.timer);
    },
    []
  );

  const jump = (id: SecId) => {
    const el = read.current;
    const sec = secs.current[id];
    if (!el || !sec) return;
    setTab(id);
    if (lock.current) clock.clearTimeout(lock.current.timer);
    const release = () => {
      lock.current = null;
    };
    lock.current = { id, timer: clock.setTimeout(release, LOCK_MS) };
    /* past the section's own top line, so no hairline sits under the tabs */
    const top = id === 'overview' ? 0 : sec.offsetTop + 1;
    el.scrollTo({ top, behavior: prefersReduced(el) ? 'auto' : 'smooth' });
  };

  const keep = (id: SecId) => (n: HTMLElement | null) => {
    secs.current[id] = n;
  };

  return (
    <div className="zo-brief">
      <div ref={row} className="zo-tabs" role="tablist" aria-label="Project brief" data-rise="h">
        <span ref={pill} className="zo-tabpill" aria-hidden />
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`${uid}-t-${s.id}`}
            data-tab={s.id}
            aria-selected={tab === s.id}
            aria-controls={`${uid}-s-${s.id}`}
            onClick={() => jump(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div ref={read} className="zo-read" onScroll={spy}>
        <section ref={keep('overview')} id={`${uid}-s-overview`} className="zo-sec" aria-labelledby={`${uid}-t-overview`}>
          <div className="zo-sh" data-rise="b">
            <h3>Overview</h3>
          </div>
          <p className="zo-p zo-desc" data-rise="b">
            {emphasize(copy.description, copy.emphasis).map((r, i) => (r.em ? <em key={i}>{r.text}</em> : r.text))}
          </p>
          <div className="zo-facts" data-rise="b">
            <div className="b-who">
              <span className="zo-lg32">
                <img src={project.logo} alt="" draggable={false} />
              </span>
              <span className="b-who-t">
                <span className="b-who-n">{project.company}</span>
                <span className="b-who-r">Company</span>
              </span>
            </div>
            <i className="zo-fdv" aria-hidden />
            <div className="b-who">
              <img src={project.manager.face} alt="" draggable={false} />
              <span className="b-who-t">
                <span className="b-who-n">{project.manager.full}</span>
                <span className="b-who-r">Manager</span>
              </span>
            </div>
            <i className="zo-fdv" aria-hidden />
            <div className="b-who">
              <span className="zo-ic32">
                <Briefcase {...LINE_ICON} />
              </span>
              <span className="b-who-t">
                <span className="b-who-n">{copy.category}</span>
                <span className="b-who-r">Project Type</span>
              </span>
            </div>
          </div>
        </section>

        <section ref={keep('cover')} id={`${uid}-s-cover`} className="zo-sec" aria-labelledby={`${uid}-t-cover`}>
          <div className="zo-sh">
            <h3>What you'll cover</h3>
          </div>
          <p className="zo-sub zo-sub1">Tool Stack</p>
          <ul className="zo-tools">
            {copy.tools.map((t) => (
              <li key={t.id}>
                <span className="zo-lg24">
                  <img src={t.logo} alt="" draggable={false} />
                </span>
                {t.name}
              </li>
            ))}
          </ul>
          <p className="zo-sub">Workflows</p>
          <ul className="zo-bul">
            {copy.workflows.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="zo-sub">Skills &amp; Concepts</p>
          <ul className="zo-pills">
            {copy.skills.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </section>

        <section ref={keep('stages')} id={`${uid}-s-stages`} className="zo-sec" aria-labelledby={`${uid}-t-stages`}>
          <div className="zo-sh">
            <h3>Stages</h3>
            <span>Estimated Time</span>
          </div>
          <ol className="zo-tl">
            {project.stages.map((s, i) => (
              <li key={s.id}>
                <span className="zo-node">{i + 1}</span>
                <span className="zo-tx">{s.title}</span>
                <span className="zo-tm">{s.minutes} min</span>
              </li>
            ))}
          </ol>
          <p className="zo-tot">
            <span>Total Estimated Time</span>
            <span>{hoursText(total)}</span>
          </p>
        </section>

        <section ref={keep('deliverables')} id={`${uid}-s-deliverables`} className="zo-sec" aria-labelledby={`${uid}-t-deliverables`}>
          <div className="zo-sh">
            <h3>Deliverables</h3>
          </div>
          <ul className="zo-dels">
            {project.stages.map((s) => {
              const art = deliverableArt(s.deliverable);
              const Icon = art.icon ? DEL_ICON[art.icon] : null;
              return (
                <li key={s.id}>
                  <span className="zo-dic">
                    {art.img ? <img src={art.img} alt="" draggable={false} /> : Icon ? <Icon {...LINE_ICON} /> : null}
                  </span>
                  <span className="zo-dt">{s.deliverable.label}</span>
                  <span className="zo-tm">{s.deliverable.type}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
