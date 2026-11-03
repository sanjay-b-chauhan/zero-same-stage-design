/* A labelled settings panel in the DialKit manner: solid, one hairline, rows of 36, segmented text. */
import type { ReactNode } from 'react';

export function DialPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`z4-dial ${className}`}>{children}</div>;
}

export function DialRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="z4-dial-row">
      <span>{label}</span>
      {children}
    </div>
  );
}

export function DialSeg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <span className="z4-dial-seg">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </span>
  );
}

/* a plain toggle for anything that is on or off (his note, 2 Nov: "a toggle, not like a switcher") */
export function DialToggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="zk-tg" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}
