/* The line between two columns is the handle. It takes no room: a 12 px hit area sits over the seam. A hairline lives in
   it, gone at rest, the full height on hover and brighter while you drag. Double click puts the column
   back, the arrows move it from the keyboard. */
import type { KeyboardEvent, PointerEvent as RPointerEvent } from 'react';

interface GripProps {
  label: string;
  for?: 'work' | 'side';
  value: number;
  min: number;
  max: number;
  onPointerDown: (e: RPointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

export default function Grip({ label, for: of = 'work', value, min, max, onPointerDown, onDoubleClick, onKeyDown }: GripProps) {
  return (
    <div
      className="zs2-grip"
      data-for={of}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      title={`${label}. Double click to reset`}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    />
  );
}
