# HOLLYWOOD BY HG — THE SUITE MAP (v1.1)

**Source**: Google Slides, `HOLLYWOOD_BY_HG_SUITE_MAP_v1-1`
**Fetched**: 2026-09-29
**Status**: Source of truth. Verbatim below, reformatted from a raw slide-text
export into slide-numbered sections; no wording changed. `suite/ARCHITECTURE.md`
and `suite/schema/` are built against this — see `suite/CONFORMANCE.md`
Finding 10 for the conformance audit against it.

---

## Slide 01 · ARCHITECTURE

**Title**: HOLLYWOOD BY HG — THE SUITE MAP
**Tagline**: A nonlinear digital film studio where every department owns one
clear truth.

- EDNA = VISUAL CANON
- PLATE = FRAME
- BOARD = TIME
- VCO = TRUTH
- SHOT = CONTENT
- TAKE = ATTEMPT

*From scratch build prompts for each product + service*

Three canon pillars named on this slide: **SET / LOCATION CANON**,
**CHARACTER**, **ENSEMBLE / REFERENCE**.

---

## Slide 02 · ARCHITECTURE — One studio. One project truth.

*The arrows are routes, not a mandatory order.*

CINEMA · VCO · STORY · EDNA · BOARD · PLATE · COMPILER · TAKE / VCS / FRAMEFORGE

**BUILD LAW**
- VCO owns project truth
- EDNA owns image generation + visual canon
- Plate owns the frame
- Shot owns content + Takes
- Slot owns time
- Board owns sequence + timing
- Models are replaceable vendors

---

## Slide 02 · FRONT DOOR — CINEMA

**PURPOSE**: The conversational producer / director / showrunner interface.
Cinema understands natural filmmaking language, diagnoses what the production
needs, and routes work to the correct department. It should feel like talking
to a producer, not operating modules.

*CINEMA — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build CINEMA as a thin orchestration layer over the shared ProjectGraph.
Translate natural filmmaking requests into explicit studio actions: inspect
status, riff, revise scene, create Board, request EDNA generation, open Plate,
approve Plate, attach audio, generate/inspect/select Takes, run continuity and
QC. Never maintain a parallel database or silently lock canon. All mutations
go through canonical graph actions/patches and emit provenance/events.
Optimize for nonlinear entry from story, script, image, character, video,
audio, Shot or Slot.

---

## Slide 03 · PRODUCTION OFFICE — VCO STUDIO

**PURPOSE**: The canonical system of record. Where the movie actually lives.
Stable IDs, canon, relationships, assets, Shots, Slots, Takes, events,
provenance, continuity and delivery state. The glamorous work happens
elsewhere; VCO keeps reality from splitting into five versions.

*VCO — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build VCO Studio around one shared ProjectGraph schema. Own stable IDs,
load/save, canon state, relationships, dependencies, provenance, event
history, invalidation warnings, asset references, project status and delivery
status. Engines submit patches. Canon-changing actions emit append-only
events. Provide a clean project-home UI, but do not turn VCO into an image
editor, compositor, timeline or generative playground. Reliable
infrastructure wins over feature sprawl.

---

## Slide 04 · ART DEPARTMENT — EDNA

**PURPOSE**: Visual Canon + Image Generation Engine. EDNA creates,
understands, expands and protects what the movie looks like. It manufactures
the exact visual pieces Plate needs, including transparent/keyed character
avatars.

**PROMPT TO CODE FROM SCRATCH**
Build EDNA for image ingestion, visual canon construction, reference-
conditioned image generation, consistency review and production handoff.
Support canonical packages for characters, costumes, places, sets, props,
vehicles, creatures and style. Character packs should include portrait,
front, 3/4, profiles, full body, rear, expressions, costume variants and
Plate-ready transparent/keyed avatars. Generation is reference-first, not
prose-first; human approval determines canon. Plate can request approved
packages or missing avatar poses; preserve provider/model/settings/sourceRefs
provenance.

---

## Slide 05 · VIRTUAL CAMERA STAGE — PLATE

**PURPOSE**: A Samsung-sticker-simple shot blocking and master-frame stage.
Plate owns the frame: camera, composition, blocking, scale, orientation and
lens. It does not own time, audio, Takes or final motion prompts.

**PROMPT TO CODE FROM SCRATCH**
Build PLATE as the shot-construction stage. When opened from Board, preload
required cast, costumes, props and location from Scene requirements and EDNA
IDs. Provide draggable avatars, prop layers, x/y, scale, rotation, flip,
z-order, crop, lens, angle, camera position and composition guides. Preserve
two outputs: blockingComposite = literal directed sticker layout; masterFrame
= polished EDNA-rendered production frame. Workflow: Board Slot → Open in
Plate → arrange → approve blocking → render masterFrame → return to same
Shot/Slot.

---

## Slide 06 · BREAKDOWN SERVICE — SCRIPT → BOARD

**PURPOSE**: Turn screenplay/story material into an editable production
skeleton. This proposes structure, not final directing. Its acid test is
simple: Open in Plate must already know who, what and where belongs in the
scene.

*SCRIPT — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build Script → Board as the screenplay breakdown service. Input: canonical
Script + ProjectGraph. Output: Scene records, Scene requirements, BoardScenes,
BoardSlots and Shots. Resolve cast, costumes, props and places to canonical
IDs whenever possible. Default Shot:Slot to 1:1, but keep them permanently
separate. Create zero Plates during breakdown. Users can split, merge,
reorder and retime. If Open in Plate requires manual repicking, the breakdown
is incomplete.

---

## Slide 07 · TEMPORAL PRODUCTION SPINE — BOARD

**PURPOSE**: The place where the movie becomes sequence, timing, performance,
audio and selects. Board absorbs the best parts of GIFFY, Frameboard,
FrameLayer and the sequencing side of FrameForge. Think storyboard +
production cards + mini timeline, not Premiere.

**PROMPT TO CODE FROM SCRATCH**
Build BOARD around Board, BoardScene, BoardSlot and Shot. BoardSlot owns
sequence position, start/duration, script excerpt, beat, Shot reference,
selected Take, FX, audio, transition, continuity and production status. Shot
owns photographic intent, cast, props, Plate, motion spec and Takes. UI:
large visual cards + lightweight time ruler. Support reorder, split/merge,
blank Slot, still/video import, audio, FX, Open in Plate, Generate/Inspect/
Select Take, Run Continuity. Also support reverse ingestion: existing video
→ VCS beats → candidate Board Slots. Board is the one canonical sequence
system and cut.json writer.

---

## Slide 08 · TAKE INSPECTION — FRAMEFORGE MODE

**PURPOSE**: Deep source and Take inspection without becoming another
sequence editor. The old FrameForge prototype discovered Board features
early. Keep the microscope: precise scrubbing, range selection and evidence
extraction.

*FRAMEFORGE — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build FrameForge as a specialist Take-inspection mode launched from Board.
Input: Take or imported video Asset. Provide frame-accurate scrub, frame
stepping, timestamps, range marking, key/start/end frame capture, audio
extraction and notes. Allow rejected, candidate and selected usable ranges.
Return structured evidence to Board. Never own movie sequence order or become
another Board.

---

## Slide 09 · SCRIPT SUPERVISOR — VCS-15

**PURPOSE**: Continuity analysis grounded in evidence from the actual
footage. VCS answers: what entered true, what changed, what left true, and
what the next shot must respect. It can also propose candidate beats from
existing video.

*VCS-15 — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build VCS-15 as a continuity-analysis service. Input: Shot, Take, BoardSlot
and canonical project context. Analyze cast, costume, props, positions,
screen direction, camera, lighting, environment, performance and audio
continuity. Return entering/ending ContinuityState, observed changes,
evidence frames, RiskFlags and next-shot constraints. No separate project
database, no style canon, no final provider prompts. Treat VCS as an
evidence-backed script supervisor.

---

## Slide 10 · PERFORMANCE SERVICE — FX ORCHESTRATOR

**PURPOSE**: Portable physical and nonverbal performance direction. FX is a
service feeding Board, not a destination app. Cues bind to character IDs and
remain provider-neutral until compilation.

*FX — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build FX Orchestrator as a provider-neutral performance-direction service.
Input: BoardSlot, Shot intent, characters, relationships and dramatic beat.
Output per-character cues such as look_break, half_step_stop, shoulders_drop,
eyes_to_bolt, interrupt_after_300ms, no_comic_mug. Every cue binds to a
Character ID; Board stores them. The Model Compiler translates them later. No
standalone project database or major destination UI.

---

## Slide 11 · VOICE / ACOUSTIC SERVICE — FX ACOUSTICS

**PURPOSE**: Provider-neutral voice and acoustic performance direction. This
controls how lines sound in time: cadence, breath, overlap, distance and room
behavior. Speaker identity always comes from Character IDs.

*FX — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build FX Acoustics as a shared voice/acoustic direction service. Input:
DialogueLine, Character voice profile, BoardSlot timing and dramatic intent.
Describe cadence, pace, pauses, overlap, breath, volume, line attack,
distance and room interaction. Bind dialogue using Character IDs; never
create a floating voice canon. Attach output to Board/audio structures and
compile it only when rendering or generating audio.

---

## Slide 12 · VENDOR TRANSLATION — MODEL COMPILER

**PURPOSE**: Translate studio-native filmmaking intent into whatever the
current AI vendor needs. The canonical project should never become
Grok-shaped, Veo-shaped or Runway-shaped. Providers are contractors.

*MODEL — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build the Model Compiler around a provider-neutral GenerationRequest. Input:
Shot, approved Plate/masterFrame, BoardSlot, EDNA refs, FX, acoustic/audio
direction and continuity constraints. Then apply provider adapters such as
Generic, Grok, Veo, Kling and Runway. Adapters may translate syntax but may
not invent story or visual canon. Preserve provider, model, settings,
sourceRefs and request hash. Provider outputs become candidate Assets/Takes.

---

## Slide 13 · PERFORMANCE HISTORY — TAKE REGISTRY

**PURPOSE**: Keep every generated or imported attempt attached to its Shot.
A Take belongs to the Shot, not the Slot. That keeps reuse/intercutting sane
and preserves the full attempt history.

*TAKE — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build Take management as part of Shot/VCO. Every generated or imported video
attempt becomes a Take with Take ID, Shot ID, video Asset, key/end frames,
generation provenance, request, verdict, risks and discovery events.
Suggested states: unreviewed, rejected, maybe, approved. BoardSlot references
which Take is selected for that occurrence in the cut. Reusing a Shot in
multiple Slots must never duplicate Take history.

---

## Slide 14 · OPTIONAL SPATIAL SOURCE — SCOUT

**PURPOSE**: Real-world location and camera exploration when geography
actually matters. Scout can feed EDNA and Plate with captures, Place
references and candidate backgrounds. It is never a mandatory dependency for
fictional/generated spaces.

**PROMPT TO CODE FROM SCRATCH**
Build Scout as an optional location/camera exploration tool. Input: Place
requirement. Support map/geographic exploration, viewpoint, heading,
elevation, tilt, lens and camera reference capture. Return ScoutCapture,
Place references and candidate Plate backgrounds bound to canonical IDs.
Generated and fictional environments must work perfectly without Scout.

---

## Slide 15 · FINISH GATE — DELIVERY / QC

**PURPOSE**: Determine whether the movie is actually deliverable, not merely
improvable. Delivery is the hard stop that prevents AI production from
becoming an infinite polish loop.

*DELIVERY — one clear filmmaking responsibility → one canonical handoff*

**PROMPT TO CODE FROM SCRATCH**
Build Delivery & QC as a deterministic project-level gate. Validate
runtime/tolerance, aspect ratio, resolution, fps, loudness, true peak, color
space, codec, audio layout, required stems, captions, titles and slate.
Prefer deterministic checks over LLM judgment whenever possible. Distinguish
warnings from blockers. Final Master cannot be reached while blocker checks
fail. Delivery state belongs to VCO/ProjectGraph.

---

## Slide 16 · OPERATING MODEL — What each department owns

*The simplest mental model for the entire suite.*

| Department | One question it answers |
|---|---|
| EDNA | What does it look like? |
| PLATE | Where is everything? |
| BOARD | When does it happen? |
| SHOT | What are we photographing? |
| I2V | Make it perform |
| VCS | What ended true? |
| VCO | What is project truth? |
| CINEMA | What do we do next? |

**THE PRODUCT TEST**
The user should feel like they are making a movie. The schema, providers,
continuity services and generation adapters should feel like crew working
behind the walls. As the suite becomes more capable, it should become
smaller and clearer, not larger.

**STUDIO > TOOLBOX**
