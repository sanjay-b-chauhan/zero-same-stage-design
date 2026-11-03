/* The explainers that play after a No. Free local Kokoro takes from b1, reused as they are. Each cue is the exact start of a line,
   so the screen can obey the voice. The voice carries the words: scenes are what shows, lines are only for captions. */
export interface FilmScene {
  a: number; /* first cue this scene shows on */
  b: number; /* last cue */
  kind: 'words' | 'steps' | 'route' | 'trace';
  items: string[];
}

export interface FilmDef {
  id: string;
  title: string;
  src: string;
  dur: number;
  cues: number[];
  lines: string[];
  scenes: FilmScene[];
}

export const FILMS: Record<string, FilmDef> = {
  prompt: {
    id: 'prompt',
    title: 'Writing a prompt',
    src: 'static/media/film-prompt.mp3',
    dur: 17.173,
    cues: [0, 3.115, 5.397, 7.125, 8.917, 10.56, 13.12, 15.637],
    lines: [
      'Okay, so think of Claude like a new hire on day one.',
      "Super smart, but they weren't in the meeting.",
      'They only know what you tell them.',
      'So a good prompt does three things.',
      'One, says what the file is.',
      'Two, spells out every fix, one by one.',
      'And three, says exactly what you want back.',
      "That's it. Now you try.",
    ],
    scenes: [
      { a: 0, b: 0, kind: 'words', items: ['New hire', 'Day one'] },
      { a: 1, b: 1, kind: 'words', items: ["Wasn't in the meeting"] },
      { a: 2, b: 2, kind: 'words', items: ['Knows only', 'what you tell them'] },
      { a: 3, b: 7, kind: 'steps', items: ['What the file is', 'Every fix, one by one', 'What you want back'] },
    ],
  },
  openrouter: {
    id: 'openrouter',
    title: 'What OpenRouter is',
    src: 'static/media/film-openrouter.mp3',
    dur: 18.773,
    cues: [0, 4.096, 11.008, 15.445],
    lines: [
      "So OpenRouter's basically a universal power adapter.",
      'Your app plugs in once, with one key, and it can reach Claude, GPT, Gemini, whatever you need.',
      "You don't sign up with each one, and you don't rewrite your code when you switch.",
      'You just get the one key, and keep it private. Cool?',
    ],
    scenes: [
      { a: 0, b: 2, kind: 'route', items: ['Your app', 'OpenRouter', 'Claude', 'GPT', 'Gemini'] },
      { a: 3, b: 3, kind: 'words', items: ['One key', 'Keep it private'] },
    ],
  },
  langsmith: {
    id: 'langsmith',
    title: 'What LangSmith is',
    src: 'static/media/film-langsmith.mp3',
    dur: 18.261,
    cues: [0, 2.859, 9.429, 12.203, 16.213],
    lines: [
      "LangSmith's like the black box on a plane.",
      'Every time your app calls a model, it writes down what went in, what came out, and how long it took.',
      "So when an answer looks wrong, you don't guess.",
      'You open the trace and you see exactly where it went sideways.',
      "You'll need a key for that too.",
    ],
    scenes: [
      { a: 0, b: 0, kind: 'words', items: ['The black box', 'on a plane'] },
      { a: 1, b: 3, kind: 'trace', items: ['Went in', 'Check this claim', 'Came out', 'Verified, no source', 'Took', '1.8 s'] },
      { a: 4, b: 4, kind: 'words', items: ['One more key'] },
    ],
  },
};
