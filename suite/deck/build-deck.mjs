import PptxGenJS from 'pptxgenjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Builds the studio-law deck.
 *
 * Every figure quoted on slides 5, 7 and 8 comes from `npm run suite:scene06`,
 * which computes them from the canonical graph. If the fixture changes, rerun
 * it and update FACTS below — do not adjust the numbers by hand.
 */

// ── Verified against `npm run suite:scene06` (2026-09-26) ──
const FACTS = {
  slots: 6,
  distinctShots: 5,
  takes: 3,
  runtimeS: '19.0',
  targetS: '20.0',
  toleranceS: '0.5',
  shortByS: '1.0',
  blockers: 4,
  noMaster: 'SLOT/S06_03',
  unapprovedCanon: 'VPKG/LIN_V1',
  reusedShot: 'SHOT/S06_A',
  selfcheckChecks: 14,
  competingSchemas: 5,
};

// ── Palette: drawn from the project's own world bible — stark monochrome
//    punctuated by a singular aggressive accent (crimson or gold). ──
const C = {
  bg: '0E0E10',
  card: '1C1D21',
  cardHi: '24262C',
  rule: '33353C',
  text: 'EDEDF0',
  muted: '8C919B',
  crimson: 'B3122B',
  gold: 'C9962C',
};

const F = { head: 'Cambria', body: 'Calibri', mono: 'Courier New' };
const M = 0.55;            // page margin
const CW = 10 - M * 2;     // content width = 8.9

// Header geometry. The chip sits ABOVE the title — titles are kept to one
// line at 28pt so nothing can wrap down into the subtitle.
const CHIP_Y = 0.40;
const TITLE_Y = 0.80;
const SUB_Y = 1.36;
const TOP_SUB = 1.78;      // content top when a subtitle is present
const TOP_NOSUB = 1.50;    // content top without one

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625 — set before any slide is added
pres.author = 'Hollywood by HG';
pres.title = 'Hollywood by HG — The Studio Law';

const slide = () => {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  return s;
};

/**
 * The deck's motif: a monospace ID chip. The whole system is built on
 * canonical IDs, so the recurring element is an ID plate rather than a stripe.
 */
const chip = (s, text, x, y, color = C.gold, w = null) => {
  const width = w ?? Math.max(0.72, 0.085 * text.length + 0.3);
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w: width, h: 0.26, rectRadius: 0.05,
    fill: { color: C.card }, line: { color, width: 0.75 },
  });
  s.addText(text, {
    x, y, w: width, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 8.5, color, bold: true,
    align: 'center', valign: 'middle', charSpacing: 0.4,
  });
  return width;
};

const header = (s, tag, tagColor, titleText, sub = null) => {
  chip(s, tag, M, CHIP_Y, tagColor);
  s.addText(titleText, {
    x: M, y: TITLE_Y, w: CW, h: 0.5, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 28, bold: true, color: C.text, valign: 'middle',
  });
  if (sub) {
    s.addText(sub, {
      x: M, y: SUB_Y, w: CW, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 12.5, color: C.muted, italic: true, valign: 'middle',
    });
  }
};

const card = (s, { x, y, w, h, hi = false }) => {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.035,
    fill: { color: hi ? C.cardHi : C.card },
    line: { color: hi ? C.crimson : C.rule, width: hi ? 1 : 0.75 },
  });
};

// ─────────────────────────────────────────────────────────── 1. TITLE
{
  const s = slide();
  chip(s, 'HG-SUITE-SCRATCH-MAP-0926', M, 0.62, C.gold);
  s.addText('Hollywood by HG', {
    x: M, y: 1.28, w: CW, h: 0.95, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 52, bold: true, color: C.text, valign: 'middle',
  });
  s.addText('The studio law', {
    x: M, y: 2.24, w: CW, h: 0.55, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 30, color: C.crimson, valign: 'middle',
  });
  s.addText(
    'This is not a tour of buttons. It is the set of rules that decide what is true, ' +
    'who may change it, and when a cut is finished.',
    {
      x: M, y: 3.0, w: 6.5, h: 0.75, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 14, color: C.muted, valign: 'top', lineSpacingMultiple: 1.25,
    },
  );
  const laws = ['01  One writer', '02  Four objects', '03  No Generate', '04  Three locks', '05  One gate'];
  laws.forEach((t, i) => {
    s.addText(t, {
      x: M + i * 1.79, y: 4.42, w: 1.75, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 10, color: i === 0 ? C.gold : C.muted, bold: true,
    });
  });
  s.addShape(pres.ShapeType.line, {
    x: M, y: 4.32, w: CW, h: 0, line: { color: C.rule, width: 1 },
  });
  s.addNotes(
    'Framing: the deck states law, not features. Five laws, one per section, each ' +
    'backed by something the repository actually enforces or computes.',
  );
}

// ─────────────────────────────────────────── 2. LAW 01 — NOTHING IS TRUE
{
  const s = slide();
  header(s, 'LAW 01', C.crimson, 'Nothing is true until VCO records it');

  s.addText(
    'An engine never writes. It returns a patch. VCO applies the patch, appends the events, ' +
    'and only then has anything happened.',
    {
      x: M, y: TOP_NOSUB, w: CW, h: 0.44, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 14, color: C.text, lineSpacingMultiple: 1.15,
    },
  );

  s.addText('EnginePatch', {
    x: M + 1.9, y: 1.96, w: 0.95, h: 0.22, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 8, color: C.gold, align: 'center',
  });

  const engines = ['EDNA', 'PLATE', 'BOARD', 'VCS-15', 'COMPILER'];
  engines.forEach((e, i) => {
    const y = 2.22 + i * 0.54;
    card(s, { x: M, y, w: 1.85, h: 0.46 });
    s.addText(e, {
      x: M, y, w: 1.85, h: 0.46, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 11, color: C.muted, bold: true,
      align: 'center', valign: 'middle',
    });
    s.addShape(pres.ShapeType.line, {
      x: M + 1.9, y: y + 0.23, w: 0.85, h: 0,
      line: { color: C.rule, width: 1, endArrowType: 'triangle' },
    });
  });

  card(s, { x: 3.7, y: 2.22, w: 2.5, h: 2.62, hi: true });
  s.addText('VCO', {
    x: 3.7, y: 2.4, w: 2.5, h: 0.48, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 25, bold: true, color: C.text, align: 'center',
  });
  s.addText('applyPatch()', {
    x: 3.7, y: 2.86, w: 2.5, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 10.5, color: C.crimson, align: 'center',
  });
  s.addText(
    [
      { text: 'the only writer', options: { bullet: true, breakLine: true } },
      { text: 'transactional — all or nothing', options: { bullet: true, breakLine: true } },
      { text: 'rejects unlawful patches whole', options: { bullet: true } },
    ],
    {
      x: 3.88, y: 3.24, w: 2.14, h: 1.45, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 11, color: C.muted, paraSpaceAfter: 5,
    },
  );

  s.addShape(pres.ShapeType.line, {
    x: 6.3, y: 3.53, w: 0.85, h: 0,
    line: { color: C.gold, width: 1.25, endArrowType: 'triangle' },
  });

  card(s, { x: 7.25, y: 2.22, w: 2.2, h: 2.62 });
  s.addText('Append-only\nevents', {
    x: 7.25, y: 2.42, w: 2.2, h: 0.72, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 16, bold: true, color: C.gold,
    align: 'center', lineSpacingMultiple: 1.05,
  });
  s.addText(
    'Never edited. Never deleted. The record of how canon became canon — and engines ' +
    'may propose it, but only a human locks it.',
    {
      x: 7.43, y: 3.22, w: 1.84, h: 1.5, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10.5, color: C.muted, lineSpacingMultiple: 1.18,
    },
  );

  s.addNotes(
    'Enforced in suite/vco/applyPatch.ts. A patch that would break a structural ' +
    'invariant is rejected whole and the input graph is left untouched — proven by ' +
    'two of the self-check cases.',
  );
}

// ──────────────────────────────── 3. WHY — FIVE COMPETING SCHEMAS
{
  const s = slide();
  header(s, 'AUDIT', C.crimson, 'Why the rule exists',
    'Five prototypes audited this session, graded by evidence strength');

  const rows = [
    ['vcostudiofinal.html', 'cartridge { meta, world, characters, scenes, render_manifest }', 'A'],
    ['VCSContinuityEngine1.jsx', 'EMPTY_PROJECT { world_lock, shot_timeline, style_lock, … }', 'A'],
    ['CINEFLOW Director', 'CF-FORGE { world_lock, characters, shots, generation_prompts }', 'A'],
    ['This repo', '{ styleSeed, scenes, characters, script, worldBible }', 'A'],
    ['vcs15 (Firestore)', 'its own database — firebase.ts, firestore.rules', 'B'],
  ];

  rows.forEach(([name, shape, grade], i) => {
    const y = TOP_SUB + i * 0.56;
    card(s, { x: M, y, w: CW, h: 0.48 });
    s.addText(name, {
      x: M + 0.16, y, w: 2.2, h: 0.48, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 9.5, color: C.text, bold: true, valign: 'middle',
    });
    s.addText(shape, {
      x: M + 2.45, y, w: 5.5, h: 0.48, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10.5, color: C.muted, valign: 'middle',
    });
    chip(s, grade, M + CW - 0.6, y + 0.11, grade === 'A' ? C.gold : C.muted, 0.44);
  });

  s.addText(
    `${FACTS.competingSchemas} mutually incompatible project shapes. They disagree on whether ` +
    'characters are an array or a keyed object, and on whether shots exist at all. None of them has takes.',
    {
      x: M, y: 4.68, w: CW, h: 0.5, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 12, color: C.crimson, lineSpacingMultiple: 1.18,
    },
  );

  s.addNotes(
    'Grade A means read directly from the file; B means inferred from file inventory. ' +
    'Full audit in suite/CONFORMANCE.md, including three code defects.',
  );
}

// ─────────────────────────────── 4. LAW 02 — FOUR OBJECTS STAY SEPARATE
{
  const s = slide();
  header(s, 'LAW 02', C.crimson, 'Four objects, kept apart',
    'Shot, slot, plate and take — enforced by omission, not by convention');

  const quad = [
    ['SHOT', 'what you photographed', 'cast, props, intent, motion — and its takes', 'time, sequence order'],
    ['SLOT', 'a moment in the cut', 'start, duration, transitions, the selected take', 'cast, props, a plate'],
    ['PLATE', 'the frame', 'background, layers, lens, blocking, master', 'duration, audio, takes'],
    ['TAKE', 'one attempt', 'video, key frames, verdict, usable ranges', 'its place in the cut'],
  ];

  quad.forEach(([name, gloss, owns, never], i) => {
    const x = M + (i % 2) * 4.55;
    const y = TOP_SUB + Math.floor(i / 2) * 1.73;
    card(s, { x, y, w: 4.35, h: 1.55 });
    s.addText(name, {
      x: x + 0.18, y: y + 0.12, w: 1.3, h: 0.28, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 12.5, bold: true, color: C.gold,
    });
    s.addText(gloss, {
      x: x + 1.5, y: y + 0.12, w: 2.67, h: 0.28, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10.5, color: C.muted, italic: true, align: 'right',
    });
    s.addText([
      { text: 'owns  ', options: { fontFace: F.mono, fontSize: 8.5, color: C.gold, bold: true } },
      { text: owns, options: { fontFace: F.body, fontSize: 11, color: C.text } },
    ], {
      x: x + 0.18, y: y + 0.48, w: 3.99, h: 0.52, isTextBox: true, margin: 0,
      lineSpacingMultiple: 1.12, valign: 'top',
    });
    s.addText([
      { text: 'never ', options: { fontFace: F.mono, fontSize: 8.5, color: C.crimson, bold: true } },
      { text: never, options: { fontFace: F.body, fontSize: 11, color: C.muted } },
    ], {
      x: x + 0.18, y: y + 1.05, w: 3.99, h: 0.4, isTextBox: true, margin: 0,
      lineSpacingMultiple: 1.12, valign: 'top',
    });
  });

  s.addNotes(
    'This is the split the absorbed prototypes kept collapsing, which is how ' +
    'FrameForge and FrameLayer both became sequence products. Plate has no duration ' +
    'field; BoardSlot has no cast field.',
  );
}

// ────────────────────────────── 5. PROOF — SHOT REUSE
{
  const s = slide();
  header(s, 'PROOF', C.gold, 'One shot, two moments',
    'Scene 06, computed from the canonical graph');

  const stats = [
    [FACTS.slots, 'slots in the cut'],
    [FACTS.distinctShots, 'distinct shots'],
    [FACTS.takes, 'takes'],
  ];
  stats.forEach(([n, label], i) => {
    const x = M + i * 3.03;
    card(s, { x, y: TOP_SUB, w: 2.83, h: 1.22 });
    s.addText(String(n), {
      x, y: TOP_SUB + 0.08, w: 2.83, h: 0.68, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 42, bold: true, color: C.gold,
      align: 'center', valign: 'middle',
    });
    s.addText(label, {
      x, y: TOP_SUB + 0.78, w: 2.83, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 11.5, color: C.muted, align: 'center',
    });
  });

  s.addText(
    `Six slots resolve to five shots because ${FACTS.reusedShot} appears twice. ` +
    'Reuse adds a moment to the cut; it does not fork the take history.',
    {
      x: M, y: 3.14, w: CW, h: 0.48, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 13.5, color: C.text, lineSpacingMultiple: 1.18,
    },
  );

  card(s, { x: M, y: 3.74, w: CW, h: 1.34 });
  s.addText('A slot may only select a take belonging to its own shot.', {
    x: M + 0.2, y: 3.88, w: CW - 0.4, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 13, color: C.text, bold: true,
  });
  s.addText('slot.take_matches_shot', {
    x: M + 0.2, y: 4.22, w: 2.6, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 9.5, color: C.crimson,
  });
  s.addText(
    'Cross-wiring is a compile error before it is a runtime one: object IDs are branded, ' +
    `so a ShotId cannot be passed where a SlotId belongs. ${FACTS.selfcheckChecks} checks hold this shut.`,
    {
      x: M + 0.2, y: 4.5, w: CW - 0.4, h: 0.48, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10.5, color: C.muted, lineSpacingMultiple: 1.12,
    },
  );

  s.addNotes('Run `npm run suite:scene06` to reproduce these three figures.');
}

// ──────────────────────────── 6. LAW 03 — THERE IS NO GENERATE
{
  const s = slide();
  header(s, 'LAW 03', C.crimson, 'The slot is already the request',
    'There is no Generate button');

  s.addText(
    'By the time a slot is filled in, every input a vendor needs is already recorded. ' +
    'Compiling is a projection of state, not a new authoring step.',
    {
      x: M, y: TOP_SUB, w: 5.1, h: 0.95, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 13, color: C.text, lineSpacingMultiple: 1.22,
    },
  );

  const inputs = [
    ['SLOT', 'duration, beat, fx cues, audio cues'],
    ['SHOT', 'cast, props, camera, motion intent'],
    ['PLATE', 'approved master frame'],
    ['WORLD', 'style locks, forbidden drift'],
    ['EDNA', 'approved reference packages'],
    ['VCS-15', 'entering continuity constraints'],
  ];
  inputs.forEach(([k, v], i) => {
    const y = 2.92 + i * 0.36;
    s.addText(k, {
      x: M, y, w: 0.85, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 9.5, color: C.gold, bold: true, valign: 'middle',
    });
    s.addText(v, {
      x: M + 0.9, y, w: 4.2, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 11, color: C.muted, valign: 'middle',
    });
  });

  card(s, { x: 6.05, y: TOP_SUB, w: 3.4, h: 3.3, hi: true });
  s.addText('GenerationRequest', {
    x: 6.05, y: 2.0, w: 3.4, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 12.5, bold: true, color: C.text, align: 'center',
  });
  s.addText('provider-neutral', {
    x: 6.05, y: 2.34, w: 3.4, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 11, color: C.gold, italic: true, align: 'center',
  });
  s.addShape(pres.ShapeType.line, {
    x: 6.35, y: 2.76, w: 2.8, h: 0, line: { color: C.rule, width: 0.75 },
  });
  s.addText(
    [
      { text: 'Adapters translate syntax. They never invent story or canon.', options: { bullet: true, breakLine: true } },
      { text: 'Every request carries a hash, so a take traces to its inputs.', options: { bullet: true, breakLine: true } },
      { text: 'Models are replaceable vendors, never the system of record.', options: { bullet: true } },
    ],
    {
      x: 6.28, y: 2.94, w: 2.94, h: 2.0, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 11, color: C.text, paraSpaceAfter: 8,
      lineSpacingMultiple: 1.12,
    },
  );

  s.addNotes(
    'Practical consequence: swapping Veo for Kling is an adapter change, not a ' +
    'project migration, because nothing vendor-shaped was ever stored as truth.',
  );
}

// ──────────────────────────── 7. LAW 04 — THREE DIFFERENT LOCKS
{
  const s = slide();
  header(s, 'LAW 04', C.crimson, 'Three locks, not one',
    'Blocking, master and canon. Passing one says nothing about the others');

  const locks = [
    ['BLOCKING', 'Plate.approval', 'A human approved where the figures stand. That is a composition decision.', 'approved', C.gold],
    ['MASTER', 'Plate.masterFrame', 'EDNA rendered a production frame from that blocking. Separate act, separate lock.', 'missing', C.crimson],
    ['CANON', 'VisualPackage.approval', 'The reference set is approved as what the subject looks like, permanently.', 'candidate', C.crimson],
  ];

  locks.forEach(([name, field, body, state, color], i) => {
    const x = M + i * 3.03;
    card(s, { x, y: TOP_SUB, w: 2.83, h: 2.5, hi: color === C.crimson });
    s.addText(name, {
      x: x + 0.18, y: TOP_SUB + 0.14, w: 2.5, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 16, bold: true, color: C.text,
    });
    s.addText(field, {
      x: x + 0.18, y: TOP_SUB + 0.46, w: 2.5, h: 0.24, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 8.5, color: C.muted,
    });
    s.addText(body, {
      x: x + 0.18, y: TOP_SUB + 0.8, w: 2.5, h: 1.05, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 11, color: C.text, lineSpacingMultiple: 1.18,
    });
    chip(s, state.toUpperCase(), x + 0.18, TOP_SUB + 1.95, color);
  });

  card(s, { x: M, y: 4.42, w: CW, h: 0.7 });
  s.addText([
    { text: `${FACTS.noMaster}  `, options: { fontFace: F.mono, fontSize: 10.5, color: C.gold, bold: true } },
    { text: 'has approved blocking and no master frame. ', options: { fontFace: F.body, fontSize: 11.5, color: C.text } },
    { text: `${FACTS.unapprovedCanon}  `, options: { fontFace: F.mono, fontSize: 10.5, color: C.gold, bold: true } },
    { text: 'is still a candidate. Renders exist; canon does not.', options: { fontFace: F.body, fontSize: 11.5, color: C.text } },
  ], {
    x: M + 0.2, y: 4.54, w: CW - 0.4, h: 0.46, isTextBox: true, margin: 0,
    lineSpacingMultiple: 1.18, valign: 'middle',
  });

  s.addNotes(
    'The invariant plate.master_derives_from_blocking rejects a master frame that has ' +
    'no blocking composite behind it — a master cannot appear from nowhere.',
  );
}

// ──────────────────────────── 8. LAW 05 — SCENE 06 AND THE GATE
{
  const s = slide();
  header(s, 'LAW 05', C.crimson, 'Nineteen seconds is not a master',
    'Scene 06 against the delivery gate');

  card(s, { x: M, y: TOP_SUB, w: 2.6, h: 1.55, hi: true });
  s.addText(`${FACTS.runtimeS}s`, {
    x: M, y: TOP_SUB + 0.1, w: 2.6, h: 0.68, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 40, bold: true, color: C.crimson,
    align: 'center', valign: 'middle',
  });
  s.addText(`of a ${FACTS.targetS}s target`, {
    x: M, y: TOP_SUB + 0.8, w: 2.6, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F.body, fontSize: 11.5, color: C.text, align: 'center',
  });
  s.addText(`short by ${FACTS.shortByS}s · tolerance ${FACTS.toleranceS}s`, {
    x: M, y: TOP_SUB + 1.08, w: 2.6, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 8.5, color: C.muted, align: 'center',
  });

  s.addText('deliverable: false\nblockers: ' + FACTS.blockers, {
    x: M, y: 3.46, w: 2.6, h: 0.5, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 10, color: C.crimson, bold: true,
    align: 'center', lineSpacingMultiple: 1.25,
  });
  s.addText(
    'A check that cannot be computed is a blocker, never a pass. Unspecified codec ' +
    'and loudness stay warnings until someone decides them.',
    {
      x: M, y: 4.08, w: 2.6, h: 1.0, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10.5, color: C.muted, lineSpacingMultiple: 1.18,
    },
  );

  s.addText(
    'Close is not finished. Four independent gates fail, and any one of them is enough ' +
    'to stop a final master. The gate is deterministic — a human can re-derive every verdict.',
    {
      x: 3.4, y: TOP_SUB, w: 6.05, h: 0.8, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 12.5, color: C.text, lineSpacingMultiple: 1.2,
    },
  );

  const checks = [
    ['BLOCK', 'Target runtime', `${FACTS.runtimeS}s vs ${FACTS.targetS}s`],
    ['BLOCK', 'Every slot has a selected take', '4 of 6'],
    ['BLOCK', 'Every shot has a master frame', '5 of 6'],
    ['BLOCK', 'Visual canon approved', '1 unapproved'],
    ['warn', 'Continuity analysed through the cut', '0 of 6'],
  ];
  checks.forEach(([state, label, actual], i) => {
    const y = 2.72 + i * 0.44;
    const isBlock = state === 'BLOCK';
    s.addShape(pres.ShapeType.roundRect, {
      x: 3.4, y, w: 6.05, h: 0.36, rectRadius: 0.03,
      fill: { color: C.card }, line: { color: isBlock ? C.crimson : C.rule, width: 0.75 },
    });
    s.addText(state, {
      x: 3.52, y, w: 0.72, h: 0.36, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 8.5, bold: true,
      color: isBlock ? C.crimson : C.gold, valign: 'middle',
    });
    s.addText(label, {
      x: 4.3, y, w: 3.5, h: 0.36, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 11, color: C.text, valign: 'middle',
    });
    s.addText(actual, {
      x: 7.85, y, w: 1.48, h: 0.36, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 9, color: C.muted, valign: 'middle', align: 'right',
    });
  });

  s.addNotes(
    'All figures from `npm run suite:scene06`. The fixture is deliberately built one ' +
    'second short with three further failures, so "nearly done" and "deliverable" are ' +
    'visibly different states.',
  );
}

// ─────────────────────────────────────────────────── 9. THE LAW, RECAPPED
{
  const s = slide();
  header(s, 'THE LAW', C.gold, 'Five laws');

  const laws = [
    ['01', 'Nothing is true until VCO records it.', 'Engines return patches. One writer applies them.'],
    ['02', 'Shot, slot, plate and take stay separate.', 'Enforced by omission, not by convention.'],
    ['03', 'The slot is already the request.', 'There is no Generate. Compiling is a projection.'],
    ['04', 'Blocking, master and canon are three locks.', 'Passing one says nothing about the others.'],
    ['05', 'Close is not finished.', 'A blocker stops a master. Uncomputable is a blocker.'],
  ];

  laws.forEach(([n, law, gloss], i) => {
    const y = TOP_NOSUB + i * 0.6;
    s.addText(n, {
      x: M, y, w: 0.52, h: 0.52, isTextBox: true, margin: 0,
      fontFace: F.mono, fontSize: 14, bold: true, color: C.crimson, valign: 'middle',
    });
    // Width stops short of the Verify card at x=7.05 so neither the text nor
    // the divider runs underneath it.
    s.addText(law, {
      x: M + 0.6, y, w: 5.8, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F.head, fontSize: 14, bold: true, color: C.text, valign: 'middle',
    });
    s.addText(gloss, {
      x: M + 0.6, y: y + 0.28, w: 5.8, h: 0.26, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 10.5, color: C.muted, valign: 'middle',
    });
    if (i < laws.length - 1) {
      s.addShape(pres.ShapeType.line, {
        x: M + 0.6, y: y + 0.56, w: 5.8, h: 0, line: { color: C.rule, width: 0.5 },
      });
    }
  });

  card(s, { x: 7.05, y: TOP_NOSUB, w: 2.4, h: 1.32 });
  s.addText('Verify it', {
    x: 7.22, y: TOP_NOSUB + 0.12, w: 2.1, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F.head, fontSize: 13.5, bold: true, color: C.gold,
  });
  s.addText('npm run suite:selfcheck\nnpm run suite:scene06', {
    x: 7.22, y: TOP_NOSUB + 0.46, w: 2.1, h: 0.62, isTextBox: true, margin: 0,
    fontFace: F.mono, fontSize: 8.5, color: C.text, lineSpacingMultiple: 1.3,
  });

  s.addText(
    `${FACTS.selfcheckChecks} conformance checks. The law is executable, not aspirational.`,
    {
      x: M, y: 4.74, w: CW, h: 0.32, isTextBox: true, margin: 0,
      fontFace: F.body, fontSize: 12, color: C.gold, italic: true,
    },
  );

  s.addNotes(
    'Close on the point that none of this is documentation-only: applyPatch rejects ' +
    'unlawful patches, the invariants are tested, and the delivery gate computes.',
  );
}

const out = join(dirname(fileURLToPath(import.meta.url)), 'Hollywood-by-HG.pptx');
await pres.writeFile({ fileName: out });
console.log(`wrote ${out}`);
