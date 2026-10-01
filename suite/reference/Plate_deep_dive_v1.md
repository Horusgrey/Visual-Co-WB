# PLATE — SCENE STUDIO (deep-dive deck, v1)

**Source**: `Plate.pptx`, 9 slides, proof cartridge "SUPERZ · Optics"
**Fetched**: 2026-09-30
**Status**: Source of truth for Plate-specific vocabulary. Verbatim below,
reformatted from its slide-text export. See `CONFORMANCE.md` Finding 11 for
what this drove in the schema.

---

## Slide 1 — Definition

**Plate**: *"A locked still that can be animated."*

Pipeline order (non-reorderable): **World → Lens → Script → Cast → Places →
Plates → i2v**

*Notes: Open on the definition. Do not pitch features. Plate is a still you
can trust, then move.*

## Slide 2 — Three objects. Nothing else.

1. **Avatar** — The body. Keyed on chroma green. One name, one face, one
   wardrobe. Identity lives here.
2. **Place** — The room, empty. No people, no faces. Architecture is locked
   before anyone walks in.
3. **Plate** — Avatar set into the place. A beat, a camera, a duration. This
   is the frame video starts from.

*Notes: Identity, place, then the composite. Do not generate a scene in one
prompt and call it continuity.*

## Slide 3 — Generation invents. A plate holds.

| What drifts | What locks |
|---|---|
| Faces swap between frames | Script names, not nicknames |
| Names get aliases | One body per speaker |
| The emblem changes | Empty place, then composite |
| A still of the future plays as this episode | Baked stills stay baked |
| Caption copy gets treated as the draft | The next clip starts on this frame |

*Notes: The product exists because image models forget. Plate is the memory
between frames.*

## Slide 4 — Do not reorder.

1. **World** — Premise, factions, the moves that cannot move.
2. **Lens** — Focal, height, line, palette, what is forbidden.
3. **Script** — Headings, speakers, coverage. Moves, not lines.
4. **Cast** — Every speaker. Keyed body. No missing names.
5. **Places** — Empty rooms for every heading that needs one.
6. **Plates** — Blocking. Beat. Camera. Duration. Audio.
7. **Board** — Shot order. Runtime. What is ready to move.
8. **i2v** — Start on this exact frame. Then hold.

*Notes: Ingest can fill several at once. Identify first. Install second. Do
not rename on the way in.*

## Slide 5 — The page names them.

- **Faces**: If they speak, they are Cast. Two people in the same suit are
  not interchangeable.
- **Emblem**: The chest mark is locked. A stolen mark is a leak. A
  look-sheet nickname is not a name. A mapping table is not a correction.
  Install the right name.
- **Baked**: A finished still is a plate, not an avatar.
- **Future**: The plan is not this episode unless the page says so.

*Notes: Mom is Mom. Cozart is Cozart. TJ is TJ. Kreitman is Kreitman. Do not
alias.*

## Slide 6 — The prompt is a lock.

- **Focal** (mm) — Cast remain in place.
- **Height** (ground to crane) — Living stillness. No teleport.
- **Distance** (ECU to extreme wide) — Camera: the locked move.
- **Line** (180, held) — Duration. Then stop.
- Location: the scene heading.
- Beat: one sentence from the page.
- Audio: what the room is doing.
- Lens: focal, height, line, palette.
- Do not change face, wardrobe, or architecture.
- **Forbidden**: named, not vibes.

*Notes: Every i2v prompt starts on the plate. Continuity is the instruction,
not a hope.*

## Slide 7 — Proof cartridge: SUPERZ · Optics

Cast: BROMAN, BOLT, BIRDGIRL, MOM, COZART, TJ, KIKI, KREITMAN, SELLERS

- **Chest is a Z. Broman is not Bolt.** An S on that chest is a leak, even
  with a Z on the belt. Same suit. Different face. The lock is the hair and
  the age.
- **Kreitman is the napkin. Freeze the moves.** Crate armor. Not a Z. Not
  the last scene of this episode.
- **Kiki**: Catnip. The meow. Lead. Six, seven, eight. The arrow.

*Notes: Optics is the loaded show, not the only world Plate can hold. Swap
the cartridge. Keep the rules.*

## Slide 8 — "What's this?" is ingest.

| Input | Resolves to | Rule |
|---|---|---|
| Script / PDF | Page (roster and headings) | — |
| Portrait | Cast (keyed body, script name) | — |
| Empty still | Places (location plate) | — |
| Finished frame | Board (baked plate) | Do not key it. |
| Clip | VCS-15 | Facts only. Unknown stays unknown. |
| Wrong emblem | Reject | Call the leak. Do not install it as lock. |

*Notes: Identify against the script. Table it. Then install. Chat is not
the product.*

## Slide 9 — Close

*"Start on this exact frame."*

- **Cartridge** (`cut.json`-adjacent): the world, whole — bible, lens, cast,
  places, plates.
- **cut.json**: shot order, hold, and the i2v line for each frame.
- **VCS-15**: what was visible, what is next, what can break.

Pipeline: **World → Lens → Page → Avatars → Plates → Picture that moves**

*Notes: Close on the instruction the model has to obey. Not a thank-you
slide.*
