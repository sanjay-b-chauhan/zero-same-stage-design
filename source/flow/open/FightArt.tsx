/* the fight poster on the world card (open/fight.ts). You, VS, the boss; the props; the boss fight's name */
import type { CSSProperties } from 'react';
import { ArrowRight, Megaphone, User } from 'lucide-react';
import type { Fight } from './fight';

const ROOM = 12; /* a corner of the hundred: four by three, the last one walking out */

export default function FightArt({ f, me }: { f: Fight; me: { name: string; face: string } }) {
  return (
    <div className="zo-fight" style={{ '--fx': f.brand } as CSSProperties} aria-label={`${me.name} versus ${f.boss}. ${f.fight}`}>
      <span className="zo-fx-half" aria-hidden />
      <div className="zo-fx-row" aria-hidden>
        <span className="zo-fx-f" data-side="a">
          <span className="zo-fx-pic">
            <img src={me.face} alt="" draggable={false} />
          </span>
          <b>{me.name}</b>
        </span>
        <span className="zo-fx-vs">VS</span>
        <span className="zo-fx-f" data-side="b">
          <span className="zo-fx-pic" data-look={f.look}>
            {f.look === 'room' ? (
              <span className="zo-fx-room">
                {Array.from({ length: ROOM }, (_, i) => (
                  <User key={i} data-out={i === ROOM - 1 || undefined} strokeWidth={2.25} />
                ))}
              </span>
            ) : (
              <Megaphone strokeWidth={1.75} />
            )}
          </span>
          <b>{f.boss}</b>
        </span>
      </div>
      <span className="zo-fx-props" aria-hidden>
        <s>{f.from}</s>
        <ArrowRight strokeWidth={2} />
        <em>{f.to}</em>
      </span>
      <strong className="zo-fx-t" aria-hidden>
        {f.fight}
      </strong>
    </div>
  );
}
