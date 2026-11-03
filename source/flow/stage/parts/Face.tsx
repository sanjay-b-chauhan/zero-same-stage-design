/* Her face. The solid circle behind it follows her real voice from ui.level, patched straight to the element. */
import { useEffect, useRef } from 'react';
import { useFlow } from '../../engine/store';

export default function Face({ size, live = true }: { size: number; live?: boolean }) {
  const manager = useFlow((s) => s.project?.manager);
  const circle = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!live) return;
    const apply = (v: number) => {
      if (circle.current) circle.current.style.transform = `scale(${1 + Math.min(1, v) * 0.42})`;
    };
    apply(useFlow.getState().ui.level);
    let last = -1;
    return useFlow.subscribe((s) => {
      if (s.ui.level === last) return;
      last = s.ui.level;
      apply(last);
    });
  }, [live]);

  return (
    <span className="zs2-face" style={{ width: size, height: size }}>
      {live && <span ref={circle} className="zs2-face-circle" />}
      {manager?.face ? <img className="zs2-face-img" src={manager.face} alt={manager.full} draggable={false} /> : null}
    </span>
  );
}
