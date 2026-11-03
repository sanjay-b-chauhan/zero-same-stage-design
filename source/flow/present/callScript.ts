/* b36: the live call's words. Eryn runs it alone: one manager, one face. The deck is the learner's own three slides from
   stage 5, her questions are the VP's push back from the check-in, the answers are the learner's lines there. */

export const ERYN = { name: 'Eryn Mitchell', short: 'Eryn', role: 'Manager', img: 'static/faces/eryn.webp' } as const;
export const ME = { name: 'Sanjay', img: 'static/faces/learner.jpg' } as const;

export const CALL = {
  title: 'Final presentation',
  project: 'Spotify pricing',
  minutes: 5,
} as const;

export const CHECKS = ['Light', 'Framing', 'Sound'] as const;

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

export type MomentKind = 'worked' | 'work';

export interface Moment {
  kind: MomentKind;
  title: string;
  note: string;
  at: number;
  slide: number;
  tag: string;
}

export const FEEDBACK = {
  band: 'Exceeds expectations',
  verdict: 'Name the churn number on the risk slide and this is ready for the VP.',
  length: 300,
  moments: [
    { kind: 'worked', title: 'You led with the ask', note: 'The VP knew what you wanted inside ten seconds.', at: 8, slide: 0, tag: 'Clarity' },
    { kind: 'worked', title: 'The numbers did the arguing', note: '$4.82 against $12.68 made the case before you did.', at: 52, slide: 1, tag: 'Evidence' },
    { kind: 'worked', title: 'You answered Germany with a number', note: 'No opinion, just the revenue gap and the last raise.', at: 200, slide: 1, tag: 'Q&A' },
    { kind: 'work', title: 'The risk slide had no trigger', note: 'Say which churn number makes you roll it back.', at: 100, slide: 2, tag: 'Clarity' },
    { kind: 'work', title: 'You read slide three out loud', note: 'Say the point, let the slide hold the words.', at: 135, slide: 2, tag: 'Delivery' },
    { kind: 'work', title: 'The one step answer was soft', note: 'Lead with what one step teaches you in a month.', at: 268, slide: 0, tag: 'Q&A' },
  ] as readonly Moment[],
  scores: [
    { name: 'Clarity', v: 8, note: 'The ask landed in the first ten seconds' },
    { name: 'Evidence', v: 9, note: 'Every claim had a number behind it' },
    { name: 'Structure', v: 7, note: 'Ask, numbers, risk, in that order' },
    { name: 'Delivery', v: 6, note: 'You read the risk slide word for word' },
    { name: 'Q&A', v: 7, note: 'Two sharp answers, one that went soft' },
  ],
} as const;

export const FINISH = {
  line: 'That’s the whole project. Brazil goes to the VP on Monday, with your deck.',
  title: 'Project complete',
  project: 'Find where Spotify can raise prices next',
  stages: 5,
  portfolio: 'Brazil pricing deck',
} as const;
