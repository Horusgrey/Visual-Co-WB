import { mintId } from '../schema/ids.js';
import type {
  AssetId, BoardId, BoardSceneId, BoardSlotId, CharacterId, CostumeId,
  PlateId, ProjectId, ShotId, TakeId,
} from '../schema/ids.js';
import type { ProjectGraph } from '../schema/projectGraph.js';
import type { EnginePatch, Provenance } from '../schema/provenance.js';
import { applyPatch } from './applyPatch.js';
import { checkInvariants } from './invariants.js';

/**
 * Conformance harness for the canonical graph.
 *
 * Proves that the ownership boundaries in the BUILD LAW are actually enforced
 * rather than merely documented. Run with: npm run suite:selfcheck
 */

const prov = (engine: Provenance['engine'], actor?: string): Provenance => ({
  engine, sourceRefs: [], createdAt: new Date().toISOString(), actor,
});

const PRJ = mintId<ProjectId>('Project', 'HG_SELFCHECK');
const CHAR = mintId<CharacterId>('Character', 'THORNE');
const BG = mintId<AssetId>('Asset', 'BG_CHAMBER');
const VID_A = mintId<AssetId>('Asset', 'VID_A');
const SHOT_A = mintId<ShotId>('Shot', 'A');
const SHOT_B = mintId<ShotId>('Shot', 'B');
const TAKE_A1 = mintId<TakeId>('Take', 'A1');
const PLATE_A = mintId<PlateId>('Plate', 'A');
const BOARD = mintId<BoardId>('Board', 'MAIN');
const BSCN = mintId<BoardSceneId>('BoardScene', 'S1');
const SLOT_1 = mintId<BoardSlotId>('BoardSlot', '1');
const SLOT_2 = mintId<BoardSlotId>('BoardSlot', '2');
const COST_A = mintId<CostumeId>('Costume', 'THORNE_MAIN');

/** A minimal graph where one Shot is reused by two Slots. */
const baseGraph = (): ProjectGraph => ({
  schemaVersion: '1.0',
  project: { id: PRJ, title: 'Selfcheck', stage: 'production' },
  worlds: {}, lenses: {}, relationships: {}, props: {}, places: {},
  visualPackages: {}, scripts: {}, scenes: {}, continuityStates: {},
  continuityReports: {}, scoutCaptures: {}, deliverySpecs: {},
  characters: {
    [CHAR]: { id: CHAR, projectId: PRJ, name: 'Thorne', visualPackages: [], canonStatus: 'candidate' },
  },
  costumes: {
    [COST_A]: { id: COST_A, characterId: CHAR, name: 'Thorne main', version: 'v1', costumeLocks: [], visualPackages: [] },
  },
  assets: {
    [BG]: { id: BG, kind: 'image', uri: 'mem://bg', mimeType: 'image/jpeg', provenance: prov('EDNA') },
    [VID_A]: { id: VID_A, kind: 'video', uri: 'mem://a', mimeType: 'video/mp4', provenance: prov('MODEL_COMPILER') },
  },
  plates: {
    [PLATE_A]: {
      id: PLATE_A, shotId: SHOT_A, background: BG, layers: [], camera: {},
      approval: 'approved', approvedBy: 'human', provenance: prov('PLATE', 'human'),
    },
  },
  shots: {
    [SHOT_A]: { id: SHOT_A, projectId: PRJ, intent: 'Thorne alone', cast: [CHAR], props: [], plateId: PLATE_A, takes: [TAKE_A1] },
    [SHOT_B]: { id: SHOT_B, projectId: PRJ, intent: 'Lin enters', cast: [CHAR], props: [], takes: [] },
  },
  takes: {
    [TAKE_A1]: { id: TAKE_A1, shotId: SHOT_A, video: VID_A, verdict: 'approved', provenance: prov('MODEL_COMPILER') },
  },
  boards: { [BOARD]: { id: BOARD, projectId: PRJ, name: 'Main', fps: 24, scenes: [BSCN], cutSchema: 'cut.json.v1' } },
  boardScenes: { [BSCN]: { id: BSCN, boardId: BOARD, index: 0, title: 'Scene 1', slots: [SLOT_1, SLOT_2] } },
  boardSlots: {
    // Both slots point at SHOT_A: one Shot, two occurrences in the cut,
    // one shared Take history.
    [SLOT_1]: { id: SLOT_1, boardSceneId: BSCN, index: 0, startMs: 0, durationMs: 4000, shotId: SHOT_A, selectedTakeId: TAKE_A1, fxCues: [], audioCues: [], status: 'take_selected' },
    [SLOT_2]: { id: SLOT_2, boardSceneId: BSCN, index: 1, startMs: 4000, durationMs: 3000, shotId: SHOT_A, selectedTakeId: TAKE_A1, fxCues: [], audioCues: [], status: 'take_selected' },
  },
  events: [],
});

interface CaseResult { name: string; pass: boolean; detail: string }

const results: CaseResult[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

export const runSelfCheck = (): { pass: boolean; results: CaseResult[] } => {
  // 1. The base graph — including one Shot reused across two Slots — is valid.
  const g0 = baseGraph();
  const v0 = checkInvariants(g0);
  check('shot reused across two slots shares one take history', v0.length === 0,
    v0.map(v => v.rule).join(', '));
  check('reuse did not duplicate takes', Object.keys(g0.takes).length === 1);

  // 2. A Slot must not select a Take belonging to a different Shot.
  const gBad = baseGraph();
  gBad.boardSlots[SLOT_2].shotId = SHOT_B;
  const vBad = checkInvariants(gBad);
  check('slot selecting another shot\'s take is caught',
    vBad.some(v => v.rule === 'slot.take_matches_shot'),
    vBad.map(v => v.rule).join(', '));

  // 3. Overlapping slots are caught — Board owns time, exclusively.
  const gOverlap = baseGraph();
  gOverlap.boardSlots[SLOT_2].startMs = 2000;
  check('overlapping slots are caught',
    checkInvariants(gOverlap).some(v => v.rule === 'slot.no_overlap'));

  // 4. A master frame with no blocking composite is caught: the master must
  //    derive from the user's directed blocking, not appear from nowhere.
  const gPlate = baseGraph();
  gPlate.plates[PLATE_A].masterFrame = BG;
  check('master frame without blocking composite is caught',
    checkInvariants(gPlate).some(v => v.rule === 'plate.master_derives_from_blocking'));

  // 5. An FX cue bound to a non-existent character is caught.
  const gFx = baseGraph();
  gFx.boardSlots[SLOT_1].fxCues = [{ characterId: 'CHAR/GHOST' as CharacterId, cue: 'look_break' }];
  check('fx cue on unknown character is caught',
    checkInvariants(gFx).some(v => v.rule === 'fx.bound_to_character'));

  // 6. An engine cannot lock canon without a human actor.
  const enginePatch: EnginePatch = {
    engine: 'EDNA', locksCanon: true, ops: [],
    events: [{ at: new Date().toISOString(), engine: 'EDNA', type: 'canon.locked', targetKind: 'Character', targetId: CHAR, summary: 'lock attempt', provenance: prov('EDNA') }],
  };
  const rEngine = applyPatch(baseGraph(), enginePatch);
  check('engine cannot lock canon unilaterally', !rEngine.applied && rEngine.rejections.length > 0,
    rEngine.rejections.join('; '));

  // 7. The same patch succeeds when a human actor backs it.
  const humanPatch: EnginePatch = {
    ...enginePatch,
    events: [{ ...enginePatch.events[0], provenance: prov('EDNA', 'zhorton') }],
  };
  const rHuman = applyPatch(baseGraph(), humanPatch);
  check('human-backed canon lock is accepted', rHuman.applied, rHuman.rejections.join('; '));
  check('accepted patch appended exactly one event', rHuman.events.length === 1);

  // 8. Patch application is transactional: a patch that would break an
  //    invariant leaves the original graph untouched.
  const before = baseGraph();
  const snapshot = JSON.stringify(before);
  const breaking: EnginePatch = {
    engine: 'BOARD', locksCanon: false, ops: [
      { op: 'update', kind: 'BoardSlot', id: SLOT_2, fields: { startMs: 1000 } },
    ],
    events: [{ at: new Date().toISOString(), engine: 'BOARD', type: 'slot.retimed', targetKind: 'BoardSlot', targetId: SLOT_2, summary: 'overlap' }],
  };
  const rBreak = applyPatch(before, breaking);
  check('invariant-breaking patch is rejected', !rBreak.applied && rBreak.violations.length > 0);
  check('rejected patch left the graph untouched', JSON.stringify(before) === snapshot);

  // 9. A legal retime is accepted and does mutate the returned graph only.
  const legal: EnginePatch = {
    engine: 'BOARD', locksCanon: false, ops: [
      { op: 'update', kind: 'BoardSlot', id: SLOT_2, fields: { durationMs: 5000 } },
    ],
    events: [{ at: new Date().toISOString(), engine: 'BOARD', type: 'slot.retimed', targetKind: 'BoardSlot', targetId: SLOT_2, summary: 'extend to 5s' }],
  };
  const gLegalBefore = baseGraph();
  const rLegal = applyPatch(gLegalBefore, legal);
  check('legal retime is accepted', rLegal.applied, rLegal.rejections.concat(rLegal.violations.map(v => v.rule)).join('; '));
  check('accepted patch did not mutate the input graph',
    gLegalBefore.boardSlots[SLOT_2].durationMs === 3000 &&
    rLegal.graph.boardSlots[SLOT_2].durationMs === 5000);

  // 10. Events are append-only and monotonic across successive patches.
  const r2 = applyPatch(rLegal.graph, legal);
  check('events stay monotonic across patches',
    r2.applied && r2.graph.events.length === 2 && r2.graph.events[1].seq > r2.graph.events[0].seq);

  // 11. A costume belonging to one character must not be placed on another's
  //     layer — two people in the same suit are not interchangeable.
  const gCostume = baseGraph();
  gCostume.plates[PLATE_A].layers = [{
    subject: { kind: 'character', id: mintId<CharacterId>('Character', 'GHOST'), costume: COST_A },
    asset: BG, x: 0.5, y: 0.5, scale: 1, rotation: 0, flipH: false, z: 1,
  }];
  check('costume placed on the wrong character is caught',
    checkInvariants(gCostume).some(v => v.rule === 'plate.costume_matches_character'));

  // 12. A 'baked' plate is exempt from the blocking-composite requirement —
  //     it arrived pre-finished and never went through Plate's own pipeline —
  //     while the default ('composited') origin still enforces it (case 4).
  const gBaked = baseGraph();
  gBaked.plates[PLATE_A].origin = 'baked';
  gBaked.plates[PLATE_A].masterFrame = BG;
  check('a baked plate does not require a blocking composite',
    !checkInvariants(gBaked).some(v => v.rule === 'plate.master_derives_from_blocking'));

  // 13. The approve/lock split closes a real gap: an engine could otherwise
  //     set `approval` through a plain 'update' while leaving `locksCanon`
  //     false, since that flag is self-reported. A raw update must be
  //     refused regardless of what the patch claims about itself.
  const sneakyPatch: EnginePatch = {
    engine: 'EDNA', locksCanon: false, ops: [
      { op: 'update', kind: 'Plate', id: PLATE_A, fields: { approval: 'approved' } },
    ],
    events: [{ at: new Date().toISOString(), engine: 'EDNA', type: 'plate.approved', targetKind: 'Plate', targetId: PLATE_A, summary: 'sneaky approval' }],
  };
  const rSneaky = applyPatch(baseGraph(), sneakyPatch);
  check('a raw update cannot set approval directly, regardless of locksCanon',
    !rSneaky.applied && rSneaky.rejections.length > 0, rSneaky.rejections.join('; '));

  // 14. The proper 'approve' op is gated the same way 'locksCanon' always
  //     was: refused with no human actor, accepted with one — but now the
  //     gate triggers on the op itself, not on a flag the engine could omit.
  const approveNoHuman: EnginePatch = {
    engine: 'EDNA', locksCanon: false, ops: [
      { op: 'approve', kind: 'Plate', id: PLATE_A, approvedBy: 'EDNA', approvedAt: new Date().toISOString() },
    ],
    events: [{ at: new Date().toISOString(), engine: 'EDNA', type: 'plate.approved', targetKind: 'Plate', targetId: PLATE_A, summary: 'approve attempt' }],
  };
  const rApproveNoHuman = applyPatch(baseGraph(), approveNoHuman);
  check('approve op with no human actor is rejected even though locksCanon is false',
    !rApproveNoHuman.applied && rApproveNoHuman.rejections.length > 0);

  const approveWithHuman: EnginePatch = {
    ...approveNoHuman,
    events: [{ ...approveNoHuman.events[0], provenance: prov('EDNA', 'zhorton') }],
  };
  const rApproveWithHuman = applyPatch(baseGraph(), approveWithHuman);
  check('approve op with a human actor is accepted', rApproveWithHuman.applied,
    rApproveWithHuman.rejections.join('; '));

  return { pass: results.every(r => r.pass), results };
};
