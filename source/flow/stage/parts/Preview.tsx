/* The file itself. A real table with a sticky header for a CSV, plain text for text, and Download either way.
   A table moves when you grab it and drag, any way. */
import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Globe, X } from 'lucide-react';
import { fileRef } from '../../engine/stage';
import { useFlow } from '../../engine/store';
import { parse, type Table } from '../../data/csv';
import type { Surface } from '../../types';
import { useGrabPan } from './useGrabPan';
import { hostPath } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };

type Loaded = { kind: 'table'; table: Table } | { kind: 'text'; text: string } | { kind: 'none' };

export default function Preview({ surface, onClose }: { surface: Surface; onClose?: () => void }) {
  /* a file from an earlier stage is still yours to open */
  const found = useFlow((s) => s.stage?.files.find((f) => f.id === s.ui.previewFileId) ?? (s.ui.previewFileId ? fileRef(s.ui.previewFileId) : undefined));
  /* keeps showing the last file while the panel slides away */
  const last = useRef(found);
  if (found) last.current = found;
  const file = found ?? last.current;
  const closeSide = useFlow((s) => s.actions.closeSide);
  const download = useFlow((s) => s.actions.download);
  const close = onClose ?? closeSide;
  const [loaded, setLoaded] = useState<{ id?: string; body: Loaded }>({ body: { kind: 'none' } });
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || file.kind === 'link' || file.kind === 'image') {
      setLoaded({ id: file?.id, body: { kind: 'none' } });
      return;
    }
    /* what she shared and what you handed in both carry their text */
    if (file.text !== undefined) {
      setLoaded({
        id: file.id,
        body: file.kind === 'csv' ? { kind: 'table', table: parse(file.text) } : { kind: 'text', text: file.text },
      });
      return;
    }
    if (!file.url) {
      setLoaded({ id: file.id, body: { kind: 'none' } });
      return;
    }
    let gone = false;
    const id = file.id;
    fetch(file.url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((txt) => {
        if (gone) return;
        if (file.kind === 'csv') setLoaded({ id, body: { kind: 'table', table: parse(txt) } });
        else setLoaded({ id, body: { kind: 'text', text: txt } });
      })
      .catch(() => {
        if (!gone) setLoaded({ id, body: { kind: 'none' } });
      });
    return () => {
      gone = true;
    };
  }, [file?.url, file?.kind, file?.id, file?.text]);

  const body = file && loaded.id === file.id ? loaded.body : ({ kind: 'none' } as Loaded);
  useGrabPan(sheet, body.kind === 'table');

  if (!file) return <div className="zs2-side" data-surface={surface} />;

  return (
    <div className="zs2-side" data-surface={surface}>
      <header className="zs2-side-head">
        <span className="zs2-side-title" title={file.name}>
          {file.name}
        </span>
        {file.kind === 'link' && file.url ? (
          <a className="zs2-ico" href={file.url} target="_blank" rel="noreferrer" aria-label="Open the link">
            <ExternalLink {...ICON} />
          </a>
        ) : (
          <button type="button" className="zs2-ico" aria-label={`Download ${file.name}`} onClick={() => download(file.id)}>
            <Download {...ICON} />
          </button>
        )}
        <button type="button" className="zs2-ico" aria-label="Close" onClick={close}>
          <X {...ICON} />
        </button>
      </header>
      <div ref={sheet} className="zs2-preview" data-grab={body.kind === 'table' || undefined}>
        {body.kind === 'table' && (
          <table className="zs2-table">
            <thead>
              <tr>
                {body.table.cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {body.kind === 'text' && <pre className="zs2-pretext">{body.text}</pre>}
        {file.kind === 'image' && file.url && <img className="zs2-preview-img" src={file.url} alt={file.name} draggable={false} />}
        {file.kind === 'link' && (
          <div className="zs2-preview-link">
            <div className="zs2-card-strip">
              <Globe size={12} strokeWidth={1.75} />
              <span className="zs2-card-host">{hostPath(file.url).host}</span>
              <span className="zs2-card-path">{hostPath(file.url).path}</span>
            </div>
            <a className="zk3" data-size="s" href={file.url} target="_blank" rel="noreferrer">
              Open in a new tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
