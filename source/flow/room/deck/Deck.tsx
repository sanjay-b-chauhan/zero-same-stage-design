/* The kickoff deck, generated in the kit. One object or one line at a time, small precise type, the rest is air.
   Fills its parent, transparent. Renders right for any panel and shown, so seeking is free: only one swap ever plays.
   Colour, line, shadow, radius and font come from tokens only, so a style preset restyles it from one switch. */
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { clock } from '../../clock';
import { softLand } from '../../audio';
import { pop, rise } from '../../stage/parts/util';
import type { ProjectId } from '../../types';
import { BodyView, Say, StatRow } from './bodies';
import { sceneOf, type Scene, type Words } from './panels';
import { cx, DeckCtx, Em, hasEm, R, Swap } from './parts';
import './deck.css';

export interface DeckProps {
  project: ProjectId;
  panel: string; /* the current panel id, for example p-b2-3 */
  shown: ReadonlySet<string>; /* the ids revealed so far on her words, for example num-six */
  quiet?: boolean; /* no landing sounds. Pass the Sound setting here */
}

function WordLines({ w }: { w: Words }) {
  return (
    <div className="dk-w">
      {w.a && (
        <p className={cx('dk-a', hasEm(w.a) && 'dk-two')}>
          <Em text={w.a} />
        </p>
      )}
      {w.b && (
        <R as="p" id={w.b.id} className="dk-b">
          <Em text={w.b.text} />
        </R>
      )}
      {w.stat && <StatRow stat={w.stat} />}
    </div>
  );
}

/* the panel, plus everything a panel earlier in this scene already revealed */
const effective = (scene: Scene, panel: string, shownKey: string): Set<string> => {
  const eff = new Set(shownKey ? shownKey.split('|') : []);
  for (const p of scene.panels) {
    eff.add(p);
    if (p === panel) break;
    scene.ids?.[p]?.forEach((id) => eff.add(id));
  }
  return eff;
};

const isPanel = (id: string) => id.startsWith('p-');

const SceneView = memo(function SceneView({ scene, panel, shownKey, quiet }: { scene: Scene; panel: string; shownKey: string; quiet: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const eff = useMemo(() => effective(scene, panel, shownKey), [scene, panel, shownKey]);
  const prev = useRef<Set<string> | null>(null);
  const timers = useRef<number[]>([]);
  const landed = useRef(0);

  const before = prev.current;
  const added = before ? [...eff].filter((x) => !before.has(x) && !isPanel(x)) : [];
  const removed = before ? [...before].filter((x) => !eff.has(x)).length : 0;
  /* a seek: more than a natural cue at once, or anything taken back. It renders straight, with no reveals replayed */
  const jump = before === null || added.length > 2 || removed > 0;

  useLayoutEffect(() => {
    prev.current = eff;
    if (jump || !added.length || !root.current) return;
    const el = root.current;
    added.forEach((id) => {
      el.querySelectorAll<HTMLElement>(`[data-r="${id}"]`).forEach((n, i) => {
        const st = Number(n.dataset.st || 0);
        rise(n, { y: 8, blur: 6, delay: i * st });
        if (!quiet && (i === 0 || st)) {
          const k = landed.current++;
          timers.current.push(clock.setTimeout(() => softLand(k), i * st));
        }
      });
      el.querySelectorAll<HTMLElement>(`[data-on="${id}"]`).forEach((n, i) => {
        const st = Number(n.dataset.st || 0);
        pop(n, 0.9, i * st);
        if (!quiet) {
          const k = landed.current++;
          timers.current.push(clock.setTimeout(() => softLand(k), i * st));
        }
      });
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [eff]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => clock.clearTimeout(t));
  }, []);

  const ctx = useMemo(() => ({ has: (id: string) => eff.has(id), jump }), [eff, jump]);
  const w = scene.words?.[panel];
  const words = scene.say ? (
    <Say steps={scene.say} big={scene.sayBig} />
  ) : w ? (
    <div className="dk-words">
      <WordLines w={w} />
    </div>
  ) : null;
  const body = scene.body ? <BodyView body={scene.body} /> : null;

  return (
    <DeckCtx.Provider value={ctx}>
      <div ref={root} className={cx('dk-col', jump && 'dk-jump', scene.above && 'dk-above')}>
        {scene.above ? body : words}
        {scene.above ? words : body}
      </div>
    </DeckCtx.Provider>
  );
});

export default function Deck({ project, panel, shown, quiet = false }: DeckProps) {
  const found = sceneOf(project, panel);
  const shownKey = [...shown].sort().join('|');
  if (!found) return <div className="dk" />;
  return (
    <div className="dk">
      <Swap k={`${project}:${found.index}`} kind="scene" layerClass="dk-layer">
        <SceneView scene={found.scene} panel={panel} shownKey={shownKey} quiet={quiet} />
      </Swap>
    </div>
  );
}
