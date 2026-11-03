/* b14 (his note, 2 Nov: "we have to generate scenario titles, not this image ... a gamey fight title ... two names ...
   some elements regarding this ... the boss fight name"). Each scenario's card is a fight poster made in type: you on
   the left, the scenario's boss on the right, the boss fight's name under them, the real numbers as its props.
   A new scenario is new words here, nothing drawn or generated. */
import type { ProjectId } from '../types';

export interface Fight {
  boss: string; /* the name on the right */
  fight: string; /* the boss fight's name, the big line */
  from: string; /* what it is now, struck */
  to: string; /* what it becomes, in the brand colour */
  brand: string; /* the company's own colour, the boss side only */
  look: 'room' | 'claims'; /* the boss's portrait: the room of people, or the claims stacking up */
}

export const FIGHTS: Partial<Record<ProjectId, Fight>> = {
  spotify: { boss: 'The Walkout', fight: 'One More Dollar', from: '$11.99', to: '$12.99', brand: '#1ed760', look: 'room' },
  amazon: { boss: 'The Hype', fight: 'Prove It', from: 'Claim', to: 'Fact', brand: '#ff9900', look: 'claims' },
};
