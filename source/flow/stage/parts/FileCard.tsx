/* A file in the chat, the ChatGPT way (his note, 2 Nov: "the resource should be Preview and better design").
   A sheet is a card with the sheet itself in it: the real first rows and columns of that file, drawn as the Google Sheet
   it opens in, then its name and what it is. A picture is the picture. The card opens the full preview beside the chat,
   Download sits on its corner. A tool she links is a blue underlined link in her words, its real logo before it and a
   small arrow after, and it opens in its own tab.
   The PIP keeps the compact row: its column is too narrow for a sheet. */
import { useMemo } from 'react';
import { ArrowUpRight, Download, ExternalLink, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import { parse } from '../../data/csv';
import { useFlow } from '../../engine/store';
import type { FileRef, Surface } from '../../types';
import { appIcon } from './appIcon';
import { openDesktopApp } from '../../pip/desktop/deskStore';
import { wantsReal } from '../../pip/usePipWindow';
import './toollink.css';

const ICON = { size: 16, strokeWidth: 1.75 };
const PEEK_ROWS = 5; /* the header row and four customers */
const PEEK_COLS = 4;

const canSaveOf = (file: FileRef) => file.kind === 'image' || (file.kind !== 'link' && file.text !== undefined);

/* the top left of the real file as Google Sheets draws it: column letters, row numbers, hairline cells, A1 selected.
   Google's own colours on both stages, the way a real tool keeps its own look inside ours */
function MiniSheet({ text }: { text: string }) {
  const t = useMemo(() => parse(text.split('\n', PEEK_ROWS + 1).join('\n')), [text]);
  const rows = [t.cols, ...t.rows].slice(0, PEEK_ROWS);
  const n = Math.min(PEEK_COLS, t.cols.length);
  const cols = Array.from({ length: n }, (_, j) => j);
  return (
    <span className="zs2-sheet" style={{ gridTemplateColumns: `22px repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
      <span className="zs2-sheet-h" data-corner="" />
      {cols.map((j) => (
        <span key={`h${j}`} className="zs2-sheet-h">
          {String.fromCharCode(65 + j)}
        </span>
      ))}
      {rows.map((r, i) => [
        <span key={`n${i}`} className="zs2-sheet-h" data-num="">
          {i + 1}
        </span>,
        ...cols.map((j) => (
          <span key={`c${i}:${j}`} className="zs2-sheet-c" data-a1={(i === 0 && j === 0) || undefined}>
            {r[j] ?? ''}
          </span>
        )),
      ])}
    </span>
  );
}

/* her tool, inline: the logo, the name underlined in blue, the arrow that says it leaves the page. b12: Claude leaves
   Zero for the fake desktop and opens there, as it would on your Mac; ?pip=real keeps the real link.
   b13 (his note: "'Open in Claude' should be the whole link ... in the sentence"): the words are "Open in Claude", all of
   them the link, and right after her line it sits inside her words (Thread.tsx) */
export function ToolLink({ file, inline }: { file: FileRef; inline?: boolean }) {
  const icon = appIcon(file);
  const onDesk = /claude/i.test(file.name) && !wantsReal();
  const label = `Open in ${file.name}`;
  return (
    <a
      className="zs2-toollink"
      data-inline={inline || undefined}
      href={file.url}
      target="_blank"
      rel="noreferrer"
      onClick={
        onDesk
          ? (e) => {
              e.preventDefault();
              openDesktopApp('claude');
            }
          : undefined
      }
      title={file.meta && file.meta !== 'Tool' ? `${file.name}, ${file.meta}` : file.name}
      aria-label={onDesk ? label : `${label}, a new tab`}
    >
      {icon && <img data-land="" className="zs2-toollink-ico" data-mono={/github/.test(icon) || undefined} src={icon} alt="" draggable={false} />}
      <span className="zs2-toollink-t">{label}</span>
      <ArrowUpRight className="zs2-toollink-go" size={13} strokeWidth={2} aria-hidden />
    </a>
  );
}

/* a sheet or a picture you can see before you open it */
function Peek({ file, surface }: { file: FileRef; surface: Surface }) {
  const openFile = useFlow((s) => s.actions.openFile);
  const download = useFlow((s) => s.actions.download);
  const icon = file.kind === 'image' ? null : appIcon(file);
  return (
    <div className="zs2-fcard" data-surface={surface} data-kind={file.kind} data-mine={file.mine || undefined}>
      <button type="button" className="zs2-fcard-open" aria-label={`Open ${file.name}`} onClick={() => openFile(file.id)}>
        <span className="zs2-fcard-peek" data-kind={file.kind}>
          {file.kind === 'csv' && file.text !== undefined && <MiniSheet text={file.text} />}
          {file.kind === 'image' && file.url && <img src={file.url} alt="" draggable={false} />}
        </span>
        <span className="zs2-fcard-foot">
          <span className="zs2-fcard-ico" data-land="">
            {icon ? <img src={icon} alt="" draggable={false} /> : <ImageIcon {...ICON} />}
          </span>
          <span className="zs2-fcard-t">
            <span className="zs2-fcard-name" title={file.name}>
              {file.name}
            </span>
            {file.meta && <span className="zs2-fcard-meta">{file.meta}</span>}
          </span>
        </span>
      </button>
      {canSaveOf(file) && (
        <button type="button" className="zs2-ghost zs2-fcard-dl" aria-label={`Download ${file.name}`} title="Download" onClick={() => download(file.id)}>
          <Download {...ICON} />
        </button>
      )}
    </div>
  );
}

/* the compact row: the real app's mark, the name with one line of what it is, View and Download */
function Row({ file, surface }: { file: FileRef; surface: Surface }) {
  const openFile = useFlow((s) => s.actions.openFile);
  const download = useFlow((s) => s.actions.download);
  const icon = file.kind === 'image' ? file.url ?? null : appIcon(file);
  return (
    <div className="zs2-card" data-surface={surface} data-kind={file.kind} data-mine={file.mine || undefined}>
      <span className="zs2-card-ico" data-kind={file.kind} data-land="" aria-hidden>
        {icon ? <img src={icon} alt="" draggable={false} /> : <FileText {...ICON} />}
      </span>
      <button type="button" className="zs2-card-text" aria-label={`Open ${file.name}`} onClick={() => openFile(file.id)}>
        <span className="zs2-card-name" title={file.name}>
          {file.name}
        </span>
        {file.meta && <span className="zs2-card-meta">{file.meta}</span>}
      </button>
      <button type="button" className="zs2-ghost" aria-label={`View ${file.name}`} title="View" onClick={() => openFile(file.id)}>
        <Eye {...ICON} />
      </button>
      {file.kind === 'link' && file.url ? (
        <a className="zs2-ghost" href={file.url} target="_blank" rel="noreferrer" aria-label={`Open ${file.name} in a new tab`} title="Open">
          <ExternalLink {...ICON} />
        </a>
      ) : (
        canSaveOf(file) && (
          <button type="button" className="zs2-ghost" aria-label={`Download ${file.name}`} title="Download" onClick={() => download(file.id)}>
            <Download {...ICON} />
          </button>
        )
      )}
    </div>
  );
}

export default function FileCard({ file, surface }: { file: FileRef; surface: Surface }) {
  if (file.kind === 'link' && file.url && !file.mine) return <ToolLink file={file} />;
  const sees = (file.kind === 'csv' && file.text !== undefined) || (file.kind === 'image' && !!file.url);
  if (surface === 'big' && sees) return <Peek file={file} surface={surface} />;
  return <Row file={file} surface={surface} />;
}
