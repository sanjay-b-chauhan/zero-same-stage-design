/* Everything she has shared, by stage. One compact row a file, on the big screen and in the small window: its real app,
   its name, and the keys. No previews in here, the file opens beside it. */
import { Download, ExternalLink, Eye, Image as ImageIcon, X } from 'lucide-react';
import { useFlow } from '../../engine/store';
import type { FileRef, Surface } from '../../types';
import { appIcon } from './appIcon';
import { hideRes } from './sideStore';

const ICON = { size: 16, strokeWidth: 1.75 };
const EMPTY: FileRef[] = [];

/* In the small window a file is one row: its real app, its name, View. Five or ten of them read in one look.
   What a file looks like inside stays in the chat, on its card. */
function ResRow({ file, onView }: { file: FileRef; onView?: (id: string) => void }) {
  const openFile = useFlow((s) => s.actions.openFile);
  const icon = appIcon(file);
  return (
    <div className="zs2-resrow">
      <span className="zs2-resrow-ico" aria-hidden>
        {icon ? <img src={icon} alt="" draggable={false} /> : <ImageIcon size={14} strokeWidth={1.75} />}
      </span>
      <span className="zs2-resrow-name" title={file.name}>
        {file.name}
      </span>
      <button type="button" className="zs2-resrow-view" onClick={() => (onView ? onView(file.id) : openFile(file.id))}>
        View
      </button>
    </div>
  );
}

/* the big screen's row: what it is under its name, then View and Download (a link opens in its own tab) */
function BigRow({ file }: { file: FileRef }) {
  const openFile = useFlow((s) => s.actions.openFile);
  const download = useFlow((s) => s.actions.download);
  const icon = appIcon(file);
  const canSave = file.kind === 'image' || (file.kind !== 'link' && file.text !== undefined);
  return (
    <div className="zs2-resrow" data-surface="big">
      <span className="zs2-resrow-ico" aria-hidden>
        {icon ? <img src={icon} alt="" draggable={false} /> : <ImageIcon size={14} strokeWidth={1.75} />}
      </span>
      <button type="button" className="zs2-resrow-text" onClick={() => openFile(file.id)}>
        <span className="zs2-resrow-name" title={file.name}>
          {file.name}
        </span>
        {file.meta && <span className="zs2-resrow-meta">{file.meta}</span>}
      </button>
      <button type="button" className="zs2-ghost" aria-label={`View ${file.name}`} data-tip="View" onClick={() => openFile(file.id)}>
        <Eye {...ICON} />
      </button>
      {file.kind === 'link' && file.url ? (
        <a className="zs2-ghost" href={file.url} target="_blank" rel="noreferrer" aria-label={`Open ${file.name} in a new tab`} data-tip="Open">
          <ExternalLink {...ICON} />
        </a>
      ) : (
        canSave && (
          <button type="button" className="zs2-ghost" aria-label={`Download ${file.name}`} data-tip="Download" onClick={() => download(file.id)}>
            <Download {...ICON} />
          </button>
        )
      )}
    </div>
  );
}

/* pinned: the files column on the left. It still has a close, the paperclip brings it back */
export default function ResourcesList({
  surface,
  onClose,
  pinned,
  onView,
  bare,
}: {
  surface: Surface;
  onClose?: () => void;
  pinned?: boolean;
  onView?: (id: string) => void;
  /* b20: inside the work's Resources tab, which is its own heading */
  bare?: boolean;
}) {
  const files = useFlow((s) => s.stage?.files ?? EMPTY);
  const stages = useFlow((s) => s.project?.stages);
  const closeSide = useFlow((s) => s.actions.closeSide);
  const close = onClose ?? closeSide;

  const groups = (stages ?? [])
    .map((st) => ({ st, files: files.filter((f) => f.stageId === st.id && !f.mine) }))
    .filter((g) => g.files.length > 0);

  return (
    <div className="zs2-side" data-surface={surface}>
      {surface === 'big' && !bare && (
        <header className="zs2-side-head">
          <span className="zs2-side-title">Resources</span>
          <button type="button" className="zs2-ico" aria-label="Close" onClick={pinned ? () => (hideRes(true), closeSide()) : close}>
            <X {...ICON} />
          </button>
        </header>
      )}
      {surface === 'pip' ? (
        <div className="zs2-res zs2-res-rows">
          {groups.flatMap((g) => g.files).map((f) => (
            <ResRow key={f.id} file={f} onView={onView} />
          ))}
          {groups.length === 0 && <p className="zs2-res-none">Anything she sends lands here.</p>}
        </div>
      ) : (
      <div className="zs2-res">
        {groups.map((g) => (
          <section key={g.st.id} className="zs2-res-group">
            <h3>{g.st.title}</h3>
            {g.files.map((f) => (
              <BigRow key={f.id} file={f} />
            ))}
          </section>
        ))}
        {groups.length === 0 && <p className="zs2-res-none">Anything she sends lands here.</p>}
      </div>
      )}
    </div>
  );
}
