/* The one key, under the Submission heading on the big screen, and the drop area it opens.
   Locked, it sits pressed flat into the ground and says what it opens. Unlocked it rises onto its lip in green, the one
   commit on the screen. Then the file row, then Fix and resubmit, then Start POU, then Back to the project. Same place.
   It is the compact key everywhere (his note, 2 Nov: "CTA or something smaller"), as wide as its words.
   Drag and drop listens on the document the part is in, so it works from the PiP too. */
import { useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { Check, Lock, Upload, X } from 'lucide-react';
import BorderBeam from 'border-beam';
import { softClick } from '../../audio';
import { useFlow, type FlowState } from '../../engine/store';
import type { Surface } from '../../types';
import { useDraft } from './draft';
import { FIRM, FIRM_MS, fileIcon, land, prefersReduced, rise, takesLink, typeTag } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };

function useStageMeta() {
  return useFlow((s) => s.project?.stages.find((x) => x.id === s.stage?.stageId));
}

/* every step before the submit step is done */
function useUnlocked() {
  return useFlow((s) => {
    const steps = s.stage?.steps ?? [];
    /* a stub stage has no steps and nothing to hand in, so its key stays locked */
    return steps.length > 0 && steps.filter((x) => x.kind !== 'submit').every((x) => x.state === 'done');
  });
}

/* Submit clean dataset. A name that starts in capitals keeps them: Submit GitHub repo */
const submitLabel = (s: FlowState): string => {
  const label = s.project?.stages.find((x) => x.id === s.stage?.stageId)?.deliverable.label;
  if (!label) return 'Submit';
  const word = /^[A-Z][a-z]+[A-Z]/.test(label) || /^[A-Z]{2}/.test(label) ? label : label[0].toLowerCase() + label.slice(1);
  return `Submit ${word}`;
};

export function nextStageLabel(idx: number, count: number): string {
  return `Continue stage ${idx + 2} of ${count}`;
}

/* the one key, a tactile .zk3. Locked it reads locked: flat in the ground, a lock, what it opens. The moment it unlocks it
   springs up onto its lip */
function Key({
  label,
  tag,
  locked,
  tone,
  surface,
  onPress,
}: {
  label: string;
  tag?: string;
  locked?: boolean;
  tone?: 'go';
  surface: Surface;
  onPress?: () => void;
}) {
  const el = useRef<HTMLButtonElement>(null);
  const was = useRef(locked);
  useLayoutEffect(() => {
    const k = el.current;
    if (was.current && !locked && k && !prefersReduced(k)) {
      k.animate([{ transform: 'translateY(4px) scale(0.97)' }, { transform: 'translateY(0) scale(1)' }], { duration: FIRM_MS, easing: FIRM });
    } else if (was.current === undefined) rise(k, { y: 8, blur: 4, ms: 520 });
    was.current = locked;
  }, [locked]);
  return (
    <div className="zs2-keyrow">
      <button
        ref={el}
        type="button"
        className="zk3 zs2-key"
        data-tone={locked ? undefined : tone}
        data-size="s"
        data-surface={surface}
        data-locked={locked || undefined}
        disabled={locked}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (locked) return;
          softClick();
          onPress?.();
        }}
      >
        {locked && <Lock size={14} strokeWidth={1.75} />}
        <span>{label}</span>
        {locked && tag && <span className="zs2-locked-tag">{tag}</span>}
      </button>
    </div>
  );
}

function FileLine({ green, surface }: { green: boolean; surface: Surface }) {
  const submitted = useFlow((s) => s.stage?.submitted);
  const reading = useFlow((s) => s.stage?.phase === 'review');
  const light = useFlow((s) => s.ui.lightStage);
  const el = useRef<HTMLDivElement>(null);
  const was = useRef(green);
  useLayoutEffect(() => {
    if (green && !was.current) land(el.current, 0.94, 0, 2);
    was.current = green;
  }, [green]);
  if (!submitted) return null;
  const icon = fileIcon(submitted.isLink ? 'link' : 'csv');
  const line = (
    <div ref={el} className="zs2-fileline" data-green={green || undefined} data-surface={surface}>
      <div className="zs2-fileline-top">
        <span className="zs2-fileline-icon">
          {green ? <Check {...ICON} /> : icon ? <img src={icon} alt="" draggable={false} /> : null}
        </span>
        <span className="zs2-fileline-name">{submitted.name}</span>
      </div>
      {green && submitted.stats && submitted.stats.length > 0 && (
        <dl className="zs2-stats">
          {submitted.stats.map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value.split(/(\d[\d.,]*)/).map((part, i) => (i % 2 ? <span key={i} className="z-num">{part}</span> : part))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
  /* while she reads it, a beam runs the edge. The PIP has no beam: its loop would run in the wrong window */
  if (surface !== 'big' || green) return line;
  return (
    <BorderBeam size="md" colorVariant="mono" theme={light ? 'light' : 'dark'} active={reading} borderRadius={14} duration={2.4}>
      {line}
    </BorderBeam>
  );
}

function Drop({ surface }: { surface: Surface }) {
  const meta = useStageMeta();
  const title = useFlow(submitLabel);
  const closeSubmit = useFlow((s) => s.actions.closeSubmit);
  const submitFile = useFlow((s) => s.actions.submitFile);
  const submitLink = useFlow((s) => s.actions.submitLink);
  const link = useDraft((s) => s.link);
  const setDraft = useDraft((s) => s.set);
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    rise(box.current, { y: 14, blur: 6, scale: 0.98, ms: 560 });
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) submitFile(f);
    else {
      const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
      if (url) submitLink(url.trim());
    }
  };
  const sendLink = () => {
    const u = link.trim();
    if (!u) return;
    submitLink(u);
    setDraft({ link: '' });
  };
  const type = meta ? typeTag(meta.deliverable.type) : '';
  const linkOnly = takesLink(meta?.deliverable.type);

  return (
    <div ref={box} className="zs2-drop" data-surface={surface}>
      <div className="zs2-drop-head">
        <span>{title}</span>
        <button type="button" className="zs2-ico" aria-label="Close" onClick={closeSubmit}>
          <X {...ICON} />
        </button>
      </div>
      {!linkOnly && (
      <div
        className="zs2-drop-zone"
        data-over={over || undefined}
        role="button"
        tabIndex={0}
        onClick={() => picker.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') picker.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={onDrop}
      >
        <Upload {...ICON} />
        <span>Drop your {type} or click to upload</span>
      </div>
      )}
      {!linkOnly && (
        <input
          ref={picker}
          type="file"
          hidden
          accept={type || undefined}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) submitFile(f);
            e.target.value = '';
          }}
        />
      )}
      <div className="zs2-drop-link" data-only={linkOnly || undefined}>
        <input
          className="zs2-drop-input"
          value={link}
          placeholder={linkOnly ? 'Paste the link' : 'Or paste a link'}
          spellCheck={false}
          onChange={(e) => setDraft({ link: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendLink();
          }}
        />
        <button type="button" className="zk3 zs2-drop-key" data-tone="go" data-size="s" disabled={!link.trim()} onClick={sendLink}>
          Submit
        </button>
      </div>
    </div>
  );
}

export default function SubmitArea({ surface, part = 'all' }: { surface: Surface; part?: 'all' | 'key' | 'drop' }) {
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const submitOpen = useFlow((s) => s.stage?.submitOpen ?? false);
  const allTicked = useFlow((s) => (s.stage?.feedback ?? []).every((f) => f.checked));
  const a = useFlow((s) => s.actions);
  const meta = useStageMeta();
  const unlocked = useUnlocked();
  const label = useFlow(submitLabel);
  /* nothing at the bottom until her first word lands the first step. A stage you play on cards has nothing to submit */
  const landed = useFlow((s) => {
    const steps = s.stage?.steps ?? [];
    return steps.length === 0 || (!!steps[0].revealed && steps.some((x) => x.kind === 'submit'));
  });

  const tag = meta ? typeTag(meta.deliverable.type) : undefined;

  const host = useRef<HTMLDivElement>(null);

  /* a file dragged onto the window opens the drop area, and a miss never makes the browser leave the page */
  useEffect(() => {
    const doc = host.current?.ownerDocument;
    if (!doc) return;
    const stop = (e: Event) => e.preventDefault();
    const enter = (e: globalThis.DragEvent) => {
      e.preventDefault();
      const types = e.dataTransfer?.types;
      if (!types || !Array.from(types).includes('Files')) return;
      const st = useFlow.getState().stage;
      if (!st || st.submitOpen) return;
      const ready = st.steps.filter((x) => x.kind !== 'submit').every((x) => x.state === 'done');
      if (st.phase === 'work' && ready) useFlow.getState().actions.openSubmit();
    };
    doc.addEventListener('dragenter', enter);
    doc.addEventListener('dragover', stop);
    doc.addEventListener('drop', stop);
    return () => {
      doc.removeEventListener('dragenter', enter);
      doc.removeEventListener('dragover', stop);
      doc.removeEventListener('drop', stop);
    };
  }, []);

  const showDrop = submitOpen && (part === 'all' || part === 'drop');
  const showKey = part !== 'drop';

  return (
    <div ref={host} className="zs2-submit" data-surface={surface}>
      {showDrop && <Drop surface={surface} />}
      {showKey && landed && !submitOpen && phase === 'work' && (
        <Key label={label} tag={tag} locked={!unlocked} tone="go" surface={surface} onPress={a.openSubmit} />
      )}
      {showKey && phase === 'review' && <FileLine green={false} surface={surface} />}
      {showKey && !submitOpen && phase === 'feedback' && (
        <Key label="Fix and resubmit" locked={!allTicked} tone="go" surface={surface} onPress={a.resubmit} />
      )}
      {showKey && phase === 'approved' && (
        <>
          <FileLine green surface={surface} />
          <Key label="Start POU" tone="go" surface={surface} onPress={a.startPou} />
        </>
      )}
      {showKey && phase === 'pou' && <FileLine green surface={surface} />}
      {showKey && phase === 'done' && (
        <>
          <FileLine green surface={surface} />
          <Key label="Back to the project" surface={surface} onPress={() => a.goto('objective')} />
        </>
      )}
    </div>
  );
}
