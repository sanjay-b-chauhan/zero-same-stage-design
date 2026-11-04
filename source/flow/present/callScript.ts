/* b36: the live call's words. Eryn runs it alone: one manager, one face. The deck is the learner's own three slides from
   stage 5, her questions are the VP's push back from the check-in, the answers are the learner's lines there. */

export const ERYN = { name: 'Eryn Mitchell', short: 'Eryn', role: 'Manager', img: 'static/faces/eryn.webp' } as const;
export const ME = { name: 'Sanjay', img: 'static/faces/learner.jpg' } as const;

export const CALL = {
  title: 'Final presentation',
  project: 'Spotify pricing',
  minutes: 5,
} as const;

/* b39 (his note: "the quality checks, framing, slide, mic"): three checks before you share, each says what it is doing */
export const CHECKS = [
  { id: 'framing', l: 'Framing', s: 'Checking your framing' },
  { id: 'slide', l: 'Slide', s: 'Opening your deck' },
  { id: 'mic', l: 'Mic', s: 'Listening to your mic' },
] as const;
export const CHECKS_DONE = 'You’re all set';
export const CHECK_H = 'Make sure Eryn can see and hear you';

export const GREET = [
  'Hey, good to see you again.',
  'You’ve got five minutes, and the clock only starts when you share.',
  'Share your deck whenever you’re ready, and take me through the call.',
] as const;

export const PRESENT_LINES = {
  start: 'Clock’s running. Take it away.',
  minute: 'About a minute left, start landing it.',
} as const;

export interface Slide {
  k: string;
  t: string;
  b: readonly string[];
}

export const DECK = {
  file: 'Brazil pricing',
  slides: [
    { k: 'The ask', t: 'Raise Brazil Individual to R$25.90', b: ['R$23.90 to R$25.90', 'One step, about 8 percent, next month'] },
    { k: 'The numbers', t: 'Brazil has the most room', b: ['Brazil earns $4.82 a customer, Germany $12.68', 'Nobody left Brazil after the last raise'] },
    { k: 'The risk', t: 'We catch churn in the first month', b: ['Watch Brazil cancellations every week', 'If churn moves in the first month, roll it back'] },
  ] as readonly Slide[],
} as const;

export const QA = {
  offer: 'That was good. I’ve got three questions, the way the VP would ask them. Tell me when you’re ready.',
  turns: [
    { q: 'Why Brazil? Germany earns way more.', a: 'Germany already earns twelve sixty-eight a customer. Brazil earns four eighty-two, and nobody left after the last raise. So Brazil has the room.', ack: 'Okay, yeah, that lands.' },
    { q: 'And if people leave?', a: 'We watch Brazil cancellations every week. If churn moves in the first month, we roll it back.', ack: 'Good. That’s what the VP will want to hear.' },
    { q: 'Last one. Why one step and not two?', a: 'One step is what the model supports. We learn in a month, then decide the next one with real numbers.', ack: 'That tracks.' },
  ],
  closing: ['That’s everything from me. Really nice work in there.', 'Give me a minute, I’ll write up your feedback.'],
} as const;

export const REVIEW_STEPS = [
  'Watching your five minutes back',
  'Marking the moments that landed',
  'Checking your answers against the model',
  'Writing it up',
] as const;

export type MomentKind = 'worked' | 'work';
export type Crit = 'Delivery' | 'Understanding';

export interface Moment {
  kind: MomentKind;
  title: string;
  at: number;
  slide: number;
  crit: Crit;
  band: number;
  did: string;
  how: string;
}

/* b39 (his note: "that meeting expectation and all those things in the UI"): bands, not scores. 0 Below, 1 Meets,
   2 Exceeds, 3 Exceptional, the same four dashes as the memo review */
export const FEEDBACK = {
  band: 2,
  overview:
    'You led with the ask and let two numbers carry the case, and your Germany answer held up. The risk slide is where it slipped. You read it out and never named the line we roll back at. Say that number in your own words and this goes to the VP as is.',
  bands: [
    { name: 'Delivery', v: 1 },
    { name: 'Understanding', v: 2 },
  ] as readonly { name: Crit; v: number }[],
  length: 300,
  moments: [
    { kind: 'worked', title: 'You led with the ask', at: 8, slide: 0, crit: 'Delivery', band: 2, did: 'Your first sentence was the ask. R$25.90, next month, one step. The VP knew what you wanted inside ten seconds.', how: 'Say what it earns in that same sentence, about 8 percent more a customer.' },
    { kind: 'worked', title: 'The numbers did the arguing', at: 52, slide: 1, crit: 'Understanding', band: 3, did: '$4.82 against $12.68, and nobody left after the last raise. You let the gap make the case before you did.', how: 'Two numbers, then stop talking. Keep it exactly like this.' },
    { kind: 'worked', title: 'You answered Germany with a number', at: 200, slide: 1, crit: 'Understanding', band: 2, did: 'Asked why not Germany, you went straight to the revenue gap and the last raise. No opinion, just the numbers.', how: 'Name what Germany would cost us too, and the answer has nothing left to push on.' },
    { kind: 'work', title: 'The risk slide had no trigger', at: 100, slide: 2, crit: 'Understanding', band: 1, did: 'You said we watch churn every week, but not which number makes us roll it back.', how: 'Say the line out loud. If 2 of the 8 Brazil customers cancel in month one, we roll it back.' },
    { kind: 'work', title: 'You read slide three out loud', at: 135, slide: 2, crit: 'Delivery', band: 1, did: 'You read the risk slide word for word, eyes on the screen.', how: 'Say the point in your own words and let the slide hold the detail.' },
    { kind: 'work', title: 'The one step answer was soft', at: 268, slide: 0, crit: 'Understanding', band: 1, did: 'You said one step is what the model supports, then trailed off.', how: 'Lead with what one step teaches us in a month, then say when we decide the next one.' },
  ] as readonly Moment[],
} as const;

export const FINISH = {
  line: 'That’s the whole project. Brazil goes to the VP on Monday, with your deck.',
  title: 'Project complete',
  project: 'Find where Spotify can raise prices next',
  stages: 5,
  portfolio: 'Brazil pricing deck',
} as const;
