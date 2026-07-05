// Curated example briefs for the Describe-it step. Two jobs: show the RANGE (most of
// these have no starting template in the catalog) and teach what a good brief looks like:
// what it is, what the operator fills in, and how it should feel.

export interface ExamplePrompt {
  label: string;
  prompt: string;
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: 'Election results',
    prompt:
      'Election results panel: three candidates as horizontal bars that grow to their percentage ' +
      'on play. Fields: three candidate names, three party names, three percentages. Bars in party ' +
      'colors from the accent, counted-up numbers at the bar ends. Serious, newsroom-clean, ' +
      'bottom-center.',
  },
  {
    label: 'Weather now',
    prompt:
      'A "weather now" side panel: big temperature, a condition line ("Partly cloudy"), wind and ' +
      'humidity as small rows, and the city name as a caps kicker on top. Fields for all values. ' +
      'Calm and airy, mid-right, gentle slide-in.',
  },
  {
    label: 'Race timing tower',
    prompt:
      'A motorsport timing tower, top-left: positions 1–5 as compact rows (position number on an ' +
      'accent chip, driver three-letter code, gap time). One textarea field, one line per driver ' +
      '"VER +0.000". Rows cascade in quickly on play. Condensed, high-contrast, sport energy.',
  },
  {
    label: 'Breaking news stinger',
    prompt:
      'A full-width BREAKING NEWS stinger: a red band slams in across the lower third with the ' +
      'word BREAKING, then a headline field slides up under it. Urgent but controlled - fast ' +
      'snap in, no bounce. Fields: label (default BREAKING) and headline.',
  },
  {
    label: 'Recipe card',
    prompt:
      'A cooking-show ingredient card, mid-left: dish name as heading, then a textarea of ' +
      'ingredients (one per line) rendered as a tidy checklist with accent bullets. Warm, ' +
      'friendly, soft corners; ingredients cascade in one by one.',
  },
  {
    label: 'Donation counter',
    prompt:
      'A charity telethon total counter, bottom-center: a big euro amount that counts up to the ' +
      'field value on every update while on air, with a small "TOTAL RAISED" kicker and a ' +
      'progress bar toward a goal field. Celebratory but tasteful.',
  },
  {
    label: 'Karaoke line',
    prompt:
      'A karaoke-style lyric line, bottom-center: one field with the current line, one with the ' +
      'next line smaller and dimmed below it. The current line wipes to the accent color left to ' +
      'right over 4 seconds after play. Playful, rounded, high readability.',
  },
  {
    label: 'Versus card',
    prompt:
      'A fullscreen match-up card: two team names and logos (image fields) facing off around a ' +
      'big VS, with a small event/date line underneath. Both sides slide in from their edges and ' +
      'meet in the middle. Dark arena mood, sharp accents.',
  },
];
