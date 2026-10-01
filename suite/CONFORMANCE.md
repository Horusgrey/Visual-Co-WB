# Conformance Audit — absorbed prototypes vs. the Global Build Law

**Project ID**: HG-SUITE-SCRATCH-MAP-0926
**Audited**: 2026-09-26

Findings from the artifacts supplied across this session. Each is graded with
the same evidence convention the schema uses: **A** = read directly from the
file, **B** = inferred from file inventory or configuration.

## Finding 1 — Five competing project schemas (BLOCKER)

The law says *"No engine creates a second project database"* and *"All engines
read/write the same canonical schema."* Five distinct, mutually incompatible
project shapes were found. This is the single largest source of the drift the
suite is meant to eliminate.

| # | Artifact | Root shape | Grade |
|---|---|---|---|
| 1 | `vcostudiofinal.html` | `cartridge { meta, world, characters, scenes, render_manifest, script }` | A |
| 2 | `VCSContinuityEngine1.jsx` | `EMPTY_PROJECT { project_id, clip_id, world_lock, characters, props_and_devices, shot_timeline, style_lock, camera_continuity, speaker_attribution, reconstruction_confidence, continuity_handoff, recreation_prompt, next_segment_prompt }` | A |
| 3 | `CINEFLOW_Director_Instructions.md` | CF-FORGE `{ project_id, scene_id, world_lock, characters, shots, continuity_handoff, generation_prompts }` | A |
| 4 | This repo (`types.ts` + cartridge) | `{ styleSeed, styleSeedHistory, scenes, characters, script, worldBible }` | A |
| 5 | `vcs15videocontinuitysystem.zip` | Firestore collections (see Finding 2) | B |

They disagree on fundamentals, not cosmetics:

- **Characters** are an array (1, 2, 3), a keyed object (1's runtime), or a flat
  list with `id`/`name`/`role`/`lookPrompt` (4).
- **Shots** are `render_manifest` (1), `shot_timeline` (2), `shots` (3), or do
  not exist at all (4).
- **World rules** are `world.notes` free text (1), `world_lock` + `style_lock`
  (2, 3), or `worldBible` (4).
- **Takes** exist in none of them. Every prototype treats a generated video as
  a terminal artifact rather than one attempt attached to a Shot.

**Reconciliation** is in `schema/projectGraph.ts`. The mapping:

| Prototype concept | Canonical home |
|---|---|
| `world_lock`, `style_lock`, `worldBible`, `world.notes` | `World` |
| `characters[]`, `soul_json_*` | `Character` + `VoiceProfile` |
| `app_json_*`, costume sets, portrait prompts | `Costume`, `VisualPackage` |
| `render_manifest[]`, `shots[]` | `Shot` (content) + `BoardSlot` (time) — split |
| `shot_timeline[]` with `time: [start, end]` | `BoardSlot.startMs/durationMs` |
| `camera_continuity`, `lens_mm` | `CameraSetup` + `ContinuityState` |
| `speaker_attribution` | `Confidence` (the `underdetermined` case) |
| `reconstruction_confidence` | `Confidence` per `ContinuityState` |
| `continuity_handoff` | `ContinuityReport.ending` + `nextShotConstraints` |
| `continuity_risks[]` | `RiskFlag[]` |
| `recreation_prompt`, `next_segment_prompt`, `generation_prompts` | `GenerationRequest` + Model Compiler adapters |
| `props_and_devices[]` | `Prop` |

## Finding 2 — VCS-15 provisions its own database (BLOCKER)

The `vcs15videocontinuitysystem` build ships `src/firebase.ts`,
`firestore.rules`, `firebase-applet-config.json` and `firebase-blueprint.json`
(grade A on inventory; grade B on what they persist, since the upload directory
was recycled before the contents could be read).

A continuity service with its own Firestore is exactly the prohibited shape:
*"Do not allow VCS to maintain a separate authoritative project database."*

**Required change**: VCS-15 becomes `Engine<VcsRequest>` returning an
`EnginePatch` containing `ContinuityState` creates and `RiskFlag`s. If Firestore
is wanted as VCO's storage backend that is a fine choice — but then it is *VCO's*
database and VCS reaches it only through patches, never directly.

## Finding 3 — VCS Continuity Engine cannot authenticate (defect, grade A)

`VCSContinuityEngine1.jsx:801-810` POSTs to `https://api.anthropic.com/v1/messages`
with `headers: { "Content-Type": "application/json" }` — no `x-api-key`, no
`anthropic-version`. Every call fails; the catch block reports "Make sure your
API key is configured," which misdirects, because there is no code path that
would send one.

Two problems, one fix: calls must go through a server-side proxy. Adding the key
client-side would ship a usable credential to every viewer.

Note the same class of issue in `vcostudiofinal.html:392-420`, which stores a
Gemini key in `localStorage` and calls the API from the browser. Acceptable for
a local prototype, not for anything hosted.

## Finding 4 — `getApiKey()` returns stale on first use (defect, grade A)

`vcostudiofinal.html:392-403`: when no key is stored, `getApiKey` fires an async
prompt but returns the already-`null` `key` synchronously. The first AI action
after entering a key still fails; the second works. The `.then()` that sets
localStorage returns into nothing.

## Finding 5 — VCS-15 mock output presented as analysis (grade A)

`VCOLivingEngine.html:204-214` fills `currentVCSResults` with a hardcoded object
and the UI then reports "ANALYSIS COMPLETE". The comment says *"real Gemini call
can be added later,"* but nothing in the interface distinguishes a mock verdict
from a real one. Any continuity decision made from that screen is unfounded.

Under the canonical schema this cannot happen silently: a `ContinuityState`
requires a `Confidence`, and a mock would have to declare
`{ status: 'underdetermined' }` or carry a fabricated `Evidence` record whose
`source` field would name itself.

## Finding 6 — Board/sequence ownership was genuinely contested (resolved)

Confirmed from the session's own framing: FrameForge had frame rows with
description, audio, FX and duration; FrameLayer behaved as a "Sequence Desk";
Frameboard and GIFFY also carried timestamped beats. Four components, four
sequence models, no single `cut.json` writer.

The schema resolves this structurally rather than by convention: only
`BoardSlot` has `startMs`/`durationMs`/`index`, and `invariants.ts` rejects
overlapping or duplicate-index slots. FrameForge's surviving role is inspection
— `Take.selectedRanges` / `rejectedRanges` — which is source evidence, not
sequence.

## Finding 7 — CINEMA's output contract is well-specified (no action)

`CINEFLOW_Director_Instructions.md` is the strongest artifact of the set. Its
CF-INTENT / CF-WORLD / CF-SCENE / CF-CPAS / CF-FORGE / CF-GENERATE structure maps
cleanly onto CINEMA, and its mode taxonomy matches the suite's engine routing.
Two adjustments:

- CF-FORGE must emit canonical `EnginePatch` ops, not its own cartridge JSON
  (Finding 1).
- Its versioning instinct — `version` + `previous_handoff_id` on every output —
  is already better served by `CanonEvent.seq` and
  `ContinuityReport.ending`. Drop the parallel scheme rather than maintain both.

## Finding 8 — SCOUT has a working data precedent (no action)

`GROKMAPz — Verified Rollout Anchors.kml` (grade A) is not film data, but its
placemark shape is precisely what `ScoutCapture` needs: coordinates, a named
carrier/source, an activation date, and an explicit **Evidence Grade** of A or B
per anchor. That grading convention is adopted verbatim in
`schema/provenance.ts` as `EvidenceGrade`, and it is the right pattern for
continuity claims too.

## Finding 9 — App world-lock shim is not yet canonical (accepted, tracked)

The app's `WorldBible` (`types.ts`) duplicates `World` from the canonical schema
in snake_case. This was deliberate: it matches the cartridge wire format so
ingested canvases need no translation, and it let the forbidden-drift fix ship
without a full migration.

It is nonetheless a sixth shape. Migration path:

1. `World` gains a `fromWorldBible()` adapter in `suite/vco/`.
2. The app reads `World` through that adapter; `WorldBible` becomes the wire
   DTO only, never state.
3. `applyWorldLock` moves to `suite/` and takes `World`.

Not urgent — the app is the only reader today — but it must land before a second
engine reads world rules, or the divergence becomes load-bearing.

## Finding 10 — Conformance against the v1.1 suite map (grade A)

**Audited**: 2026-09-29, against `reference/HOLLYWOOD_BY_HG_SUITE_MAP_v1-1.md`
(the 16-slide source deck, fetched verbatim). This is the authoritative
statement of what each department is for; everything below is `schema/`
measured against it.

**Already conformant, no change needed:**

- The BUILD LAW bullets on slide 02 match `ARCHITECTURE.md`'s law table
  exactly (VCO owns truth, EDNA owns visual canon, Plate owns the frame,
  Shot owns content+Takes, Slot owns time, Board owns sequence+timing,
  models are replaceable vendors).
- Script → Board's acid test ("Open in Plate must already know who, what and
  where") is the same claim as `ARCHITECTURE.md`'s Shot/Slot section, and the
  1:1 default with permanent separation is exactly what `Shot` and
  `BoardSlot` already enforce by having disjoint fields.
- Take Registry's rule — "A Take belongs to the Shot, not the Slot... Reusing
  a Shot in multiple Slots must never duplicate Take history" — is
  `slot.take_matches_shot`, proven by self-check cases 1–3.
- Delivery/QC's list (runtime/tolerance, aspect ratio, resolution, fps,
  loudness, true peak, color space, codec, audio layout, stems, captions,
  titles, slate) matches `DeliverySpec` field-for-field; "prefer deterministic
  checks... distinguish warnings from blockers" is `runDeliveryChecks()`.
- FrameForge's "never own movie sequence order or become another Board" is
  the same law that produced the `slot.no_overlap` invariant in the first
  place — the deck restates the reason for a rule already enforced.

**Gaps closed this pass (additive, backward-compatible):**

1. **Ensemble/reference canon had no home.** The title slide names three canon
   pillars — SET/LOCATION CANON, CHARACTER, ENSEMBLE/REFERENCE — but
   `VisualPackage.subject` only had `character | place | prop | style`.
   Added `{ kind: 'ensemble'; characterIds; costumeIds? }`: a multi-subject
   staging reference that checks what a solo portrait can't (relative scale,
   color harmony, silhouette separation across characters in one frame). It
   proposes cross-subject invariants only — it is not a substitute for any
   subject's own canon package.
2. **EDNA's category list was wider than the schema's.** Slide 04 lists
   "characters, costumes, places, sets, props, vehicles, creatures and
   style" — `vehicle` and `creature` had no home. Rather than add two more
   near-identical entities (the exact failure mode in Finding 1), `Prop`
   gained an optional `category: 'prop' | 'vehicle' | 'creature' |
   'set_dressing'` tag. Same fields, same invariants, no new shape.
3. **FrameForge's named outputs weren't all represented.** Slide 08 lists
   "audio extraction and notes" alongside range marking. `Take` had
   `selectedRanges`/`rejectedRanges` but no top-level audio output or note
   field. Added `Take.extractedAudio?: AssetId[]` and `Take.notes?: string`.

**Open question, deliberately not decided here:**

- Slide 04 separates **"places, sets"** as distinct EDNA categories, but
  never defines the relationship. The likely real-production meaning — a
  Place is the location, a Set is a specific dressed/lit instance of it for
  one scene, so dressing can legitimately change between scenes at the same
  Place — is a materially different modeling choice (it implies a new
  parent/child relationship, not just a tag) from the Prop-category fix
  above. Guessing it into the schema risked exactly the kind of
  under-specified shape this audit exists to catch. Left as `Place` only;
  flag it if set-dressing continuity across scenes at one location becomes
  a real requirement.

## Finding 11 — Conformance against the wire schema and Plate.pptx (grade A)

**Audited**: 2026-09-30, against `reference/VCO_ProjectGraph_schema_v1.json`
(a formal `hg.vco.projectgraph.v1` wire schema) and `reference/Plate_deep_dive_v1.md`
(a 9-slide Plate-specific deep dive using a real "SUPERZ · Optics" proof
cartridge).

**A genuine enforcement gap, found by comparing the two patch-shape designs.**
The JSON schema lists `op: [..., "approve", "lock"]` as operations distinct
from `"update"`. My `applyPatch` previously trusted `EnginePatch.locksCanon`
— a flag the *engine itself* sets — to decide whether to demand a human
actor. Nothing stopped an engine from setting `approval: 'approved'` through
an ordinary `update` op while simply leaving that flag `false`. `GraphOp`
now has real `'approve'`/`'lock'` variants; a raw `'update'` touching
`approval` or `canonStatus` is refused outright (`applyPatch.ts`'s
`CANON_GATED_FIELDS` guard); and the human-actor gate fires on the op itself
appearing in a patch, not on the engine's say-so. Self-check cases 13–14
exercise exactly this: a sneaky `update` is rejected, and a correct
`approve` op is gated the same way `locksCanon` always was.

**Normalization gaps, same shape as Finding 9's `WorldBible` migration.**
`DeliverySpec` was embedded on `Project`; the wire schema makes it its own
object with an id, referenced by `delivery_spec_id`. Normalized to match —
`DeliverySpec` now lives in `ProjectGraph.deliverySpecs`, referenced via
`Project.deliverySpecId`. While doing this, the same evaporating-output
problem turned up a second time: `ContinuityReport` (risks, next-shot
constraints, open questions) had no id and no home in `ProjectGraph` at
all — it only ever existed as a function's return value. Promoted to a
stored, ID'd object (`continuityReports`), referenced from `BoardSlot` via
`continuityReportId`. Neither fix was visible from reading the schema in
isolation; both only surfaced from trying to build something against it
(see Finding 12).

**Three gaps closed from Plate.pptx's own vocabulary:**

1. **"World → Lens → Script..." names Lens as its own pipeline step**,
   distinct from World (story/behavior rules) and from a single shot's
   camera setup. Added `Lens` as a first-class, normalized object
   (`focalConvention`, `heightRange`, `distanceRange`, `lineDiscipline`,
   `palette`, `forbiddenTechniques`), referenced via `Project.lensId`.
2. **"Baked stills stay baked"** exposed an actual bug in
   `plate.master_derives_from_blocking`: that invariant unconditionally
   rejected any Plate with a `masterFrame` and no `blockingComposite`, which
   is correct for the normal pipeline but wrong for an imported, already-
   finished still that never went through blocking at all — exactly the
   case the deck names ("A finished still is a plate, not an avatar").
   Added `Plate.origin: 'composited' | 'baked'`; the invariant now only
   applies to the `'composited'` default.
3. **"Two people in the same suit are not interchangeable"** named a check
   that didn't exist: nothing stopped a `PlateLayer` from placing Character
   B's costume on Character A's layer. Added the
   `plate.costume_matches_character` invariant.

Also added, more generally: `Approvable.rejectionNote` ("call the leak, do
not install it as lock" — a rejection should state why, not just flip a
flag) and `Scene.requirements.costumeMap` (which character wears which
costume *in this scene specifically*, since the wire schema's `Scene`
carries this and my `SceneRequirements` didn't).

## Finding 12 — Two prototypes, audited and then actually built against (grade A)

**Audited**: 2026-09-30, against `VCS_Frameboard_1000068454.html` (a real
8-beat continuity analysis of an actual SUPERZ clip — rooftop reality →
vortex/title concealment → superhero identity) and `frame-forge-4.html` (a
working "post-production sequencer" prototype).

**`frame-forge-4.html` is a live specimen of the FrameForge/Board drift the
suite map warns about.** Its own top comment says "a row = one frame in the
sequence: image, description, audio, fx, duration" and it exports a
`cut.json`-shaped bundle with sequence position baked in — i.e. it *is* "the
old FrameForge prototype [that] discovered Board features early," named
directly in the suite map's own FrameForge slide. No schema change follows
from this beyond what Finding 1 already drew: FrameForge gets exactly the
inspection-specific fields (ranges, key/end frames, extracted audio, notes)
and nothing resembling sequence position.

**Both engines named in the suite map were built, not just specified**,
and verified against real data rather than synthetic fixtures:

- `engines/frameforge.ts` — `Engine<FrameForgeRequest>`. Validates
  selected/rejected range marks for self-contradiction and for exceeding
  the source video's known duration before proposing a patch; never emits
  an `approve`/`lock` op.
- `engines/vcs15BeatIngest.ts` — `Engine<VcsBeatIngestRequest>`. Turns an
  ordered beat list into one Shot, one Take, one `ContinuityState` per beat,
  and a `ContinuityReport`. Deliberately does **not** guess continuity
  breaks from adjectives in the beat text — `continuityBoundary` is read
  verbatim from the input, because the Frameboard HTML's own `.note` div
  already states its boundary ("rooftop reality → vortex/title concealment
  zone → superhero state") in the source data itself. Re-deriving it from
  prose would be exactly the fabricated confidence VCS-15's own rule
  forbids.
- `engines/boardReverseIngest.ts` — the one named Board capability
  ("existing video → VCS beats → candidate Board Slots"), deliberately a
  plain function rather than a full `Engine`, since the rest of Board's
  responsibilities don't exist yet (same scoping as `vco/delivery.ts`).

`fixtures/superzRooftop.ts` runs all three against the real 8 beats
(`npm run suite:superz`): the two beats the source data names as breaks
("Vortex Takeover," "Hero Reveal") surface as the report's two `high`-
severity risks and nothing else does; 7 candidate slots are proposed, all
referencing the one ingested Take — the Shot/Slot split holding up under a
genuinely different scenario (splitting one continuous piece of existing
footage) from the one it was designed for (reusing a freshly generated
Shot across multiple cut points).

## Summary

| Finding | Severity | Status |
|---|---|---|
| 1. Five competing project schemas | Blocker | Reconciled in `projectGraph.ts` |
| 2. VCS-15 owns a Firestore database | Blocker | Change required in VCS-15 |
| 3. Anthropic calls unauthenticated + key exposure risk | Blocker | Change required |
| 4. `getApiKey()` stale-return bug | Defect | Change required |
| 5. Mock continuity output shown as real | Defect | Structurally prevented |
| 6. Contested sequence ownership | Blocker | Resolved by schema + invariants |
| 7. CINEMA output contract | — | Adopt, minus its own cartridge |
| 8. Scout evidence grading | — | Adopted as `EvidenceGrade` |
| 9. App `WorldBible` shim | Accepted | Migration path documented |
| 10. v1.1 suite map conformance | — | Mostly conformant; 3 gaps closed additively; 1 open question flagged |
| 11. Wire schema + Plate.pptx conformance | Blocker (approve/lock gap) | Closed; see also open Place/Set question (Finding 10) |
| 12. FrameForge/VCS-15 prototypes | — | FrameForge and VCS-15 beat-ingest built and proven against real data |
