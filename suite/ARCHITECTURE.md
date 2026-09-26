# Hollywood by HG — Suite Architecture

**Project ID**: HG-SUITE-SCRATCH-MAP-0926

This directory holds the canonical schema and the mechanism that enforces the
GLOBAL BUILD LAW. It is deliberately boring: no UI, no generation, no vendor
calls. Engines are built against it, not inside it.

## Global Build Law

| Law | Where it is enforced |
|---|---|
| VCO owns project truth | `vco/applyPatch.ts` is the only writer |
| EDNA owns image generation + visual canon | `VisualPackage`, `VisualInvariant` |
| Plate owns the frame | `Plate` has no duration/audio/sequence/Take fields |
| Shot owns photographed content + Takes | `Take.shotId`; `invariants.ts: take.belongs_to_shot` |
| Slot owns time in the sequence | `BoardSlot.startMs/durationMs`; `slot.no_overlap` |
| Board owns sequence, timing, FX, audio, selects, motion launch | `Board*` objects; `cut.json` has one writer |
| Models are replaceable vendors | `GenerationRequest` is provider-neutral; adapters translate only |
| No engine creates a second project database | `Engine.run()` takes `Readonly<ProjectGraph>` and returns a patch |
| Engines return patches/events, never silent mutations | `EnginePatch`; append-only `CanonEvent` |

Engines may **propose** canon. Only humans **lock** it: `applyPatch` rejects a
`locksCanon` patch from any engine in `CANNOT_LOCK_CANON` unless the patch
carries a human actor in its provenance. This is check 7 in the self-check.

## Ownership matrix

The recurring failure mode in the absorbed prototypes was two components both
believing they owned the same field. This table is the arbiter.

| Concern | Owner | Explicitly NOT owned by |
|---|---|---|
| Object identity, canon, events | VCO | everyone else |
| World rules, forbidden drift | VCO (`World`) | EDNA, Plate |
| Visual canon, reference sets, drift review | EDNA | Plate, VCS |
| Background, layer x/y/scale/rotation/flip/z, lens, angle, crop | Plate | Board, Shot |
| `blockingComposite`, `masterFrame` | Plate | Board |
| Cast, props, photographic intent, motion spec | Shot | Slot, Plate |
| Takes and their review verdicts | Shot | Slot, FrameForge |
| Sequence index, start time, duration, transitions | BoardSlot | Plate, Shot, FrameForge |
| Selected Take *for one occurrence in the cut* | BoardSlot | Shot |
| FX cues, audio cues | BoardSlot | FX engines (they propose only) |
| Continuity states, risk flags, next-shot constraints | VCS-15 (proposes) → VCO (stores) | Board |
| Provider payload syntax | Model Compiler adapters | every other engine |
| Delivery pass/fail | Delivery QC (deterministic) | Cinema, Board |

### The Shot / Slot split, concretely

This is the distinction the absorbed prototypes kept collapsing, and the reason
FrameForge and FrameLayer became competing sequence products.

- A **Shot** is a thing you photographed. It holds the Takes.
- A **Slot** is a moment in the cut. It points at a Shot and picks one Take.

So reusing a Shot in three Slots gives you three moments in the cut and **one**
Take history. `invariants.ts` enforces this two ways: a Slot may only select a
Take belonging to its own Shot (`slot.take_matches_shot`), and Takes must be
listed on their Shot (`take.listed_on_shot`). Self-check cases 1–3 cover it.

## Dataflow

```
CINEMA  (natural language in, studio operations out — no database of its own)
   │
   ▼
VCO  ProjectGraph + append-only events  ◄── every patch funnels through here
   │
   ├── SCRIPT → BOARD   Script ──► Scenes, BoardScenes, BoardSlots, Shots
   ├── EDNA             references ──► VisualPackage (candidate → approved)
   ├── SCOUT            optional ──► ScoutCapture ──► Place, plate backgrounds
   │
   ▼
PLATE   background + keyed avatars ──► blockingComposite
   │                                        │
   │                                        ▼
   │                                      EDNA ──► masterFrame
   ▼
BOARD   + FX cues + audio cues + continuity in/out
   │
   ▼
MODEL COMPILER   GenerationRequest (neutral) ──► adapter payload
   │
   ▼
I2V VENDOR ──► Take (candidate, carries requestHash + provenance)
   │
   ├── FRAMEFORGE MODE   frame-accurate inspection ──► selected/rejected ranges
   └── VCS-15            entering/ending ContinuityState, RiskFlags, evidence
   │
   ▼
BOARD   select Take, resolve risks
   │
   ▼
DELIVERY / QC   deterministic checks; blockers gate Final Master
   │
   ▼
MASTER
```

## Confidence and evidence

Two rules borrowed from the prototypes that got this right:

1. **Confidence may be absent.** `Confidence` is a discriminated union where
   `underdetermined` is a distinct case carrying a note — not a low number.
   VCS-15's "NEVER fake confidence" becomes a type constraint.
2. **Claims carry evidence grades.** `Evidence` uses the A/B/C grade + named
   source pattern from the GROKMAPz rollout-anchor KML, where every placemark
   states an Evidence Grade and the press release behind it. Applied to
   continuity findings and scout captures, it lets a reviewer separate a
   documented fact from an inference.

## Running the conformance harness

```
npm run suite:selfcheck
```

14 checks covering Take ownership, Shot reuse, Slot timing exclusivity, the
Plate master/blocking derivation rule, Character-bound FX cues, the human
canon-lock gate, patch transactionality and event monotonicity.

## What is deliberately not here yet

The schema and the writer are built. The 13 engines are not. Each engine is a
separate build against `Engine<Request>`; none of them needs to change this
directory to exist. Start with whichever engine unblocks the user's next shot —
the schema does not impose an order.

The current Visual Co-Pilot app still uses its own local `WorldBible` in
`types.ts` rather than `World` from this schema. That shim is intentional and
documented in `CONFORMANCE.md`; migrating it is a discrete follow-up, not a
prerequisite for building engines.
