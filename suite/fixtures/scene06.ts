import { mintId } from '../schema/ids.js';
import type {
  AssetId, BoardId, BoardSceneId, BoardSlotId, CharacterId, CostumeId,
  DeliverySpecId, LensId, PlaceId, PlateId, ProjectId, ShotId, TakeId,
  VisualPackageId, WorldId,
} from '../schema/ids.js';
import type { Plate, ProjectGraph, Shot, Take } from '../schema/projectGraph.js';
import type { Provenance } from '../schema/provenance.js';

/**
 * Scene 06 — the worked example behind the studio-law deck.
 *
 * Deliberately constructed to sit one second short of a twenty-second target
 * while failing three further independent gates, so that "nearly done" and
 * "deliverable" are visibly not the same state. Nothing here is decorative:
 * the deck quotes numbers this fixture computes.
 *
 * It also exercises Shot reuse — SHOT_A appears in two slots and keeps one
 * Take history — and the three-locks distinction: approved blocking is not a
 * master frame, and neither is EDNA canon.
 */

const prov = (engine: Provenance['engine'], actor?: string): Provenance => ({
  engine, sourceRefs: [], createdAt: '2026-09-26T00:00:00.000Z', actor,
});

const PRJ = mintId<ProjectId>('Project', 'OBSIDIAN_MANDATE');
const WLD = mintId<WorldId>('World', 'OBSIDIAN');
const LENS = mintId<LensId>('Lens', 'OBSIDIAN');
const DELIVERY = mintId<DeliverySpecId>('DeliverySpec', 'MAIN');
const THORNE = mintId<CharacterId>('Character', 'THORNE');
const LIN = mintId<CharacterId>('Character', 'LIN');
const COST_THORNE = mintId<CostumeId>('Costume', 'THORNE_GREATCOAT');
const COST_LIN = mintId<CostumeId>('Costume', 'LIN_CRIMSON');
const VPKG_THORNE = mintId<VisualPackageId>('VisualPackage', 'THORNE_V1');
const VPKG_LIN = mintId<VisualPackageId>('VisualPackage', 'LIN_V1');
const CHAMBER = mintId<PlaceId>('Place', 'COUNCIL_CHAMBER');
const BOARD = mintId<BoardId>('Board', 'MAIN');
const BSCN6 = mintId<BoardSceneId>('BoardScene', 'SCENE_06');

const asset = (slug: string, kind: 'image' | 'video'): AssetId =>
  mintId<AssetId>('Asset', slug);

const BG = asset('BG_CHAMBER', 'image');

/** Six slots, contiguous, summing to 19.0s against a 20.0s target. */
const SLOT_PLAN: {
  slot: BoardSlotId; shot: ShotId; durationMs: number; beat: string;
  hasMaster: boolean; hasTake: boolean;
}[] = [
  { slot: mintId<BoardSlotId>('BoardSlot', 'S06_01'), shot: mintId<ShotId>('Shot', 'S06_A'), durationMs: 3500, beat: 'Thorne alone, chin forced up by the collar', hasMaster: true, hasTake: true },
  { slot: mintId<BoardSlotId>('BoardSlot', 'S06_02'), shot: mintId<ShotId>('Shot', 'S06_B'), durationMs: 2500, beat: 'Lin enters without waiting to be received', hasMaster: true, hasTake: true },
  { slot: mintId<BoardSlotId>('BoardSlot', 'S06_03'), shot: mintId<ShotId>('Shot', 'S06_C'), durationMs: 4000, beat: 'Lin states the vote count; Thorne does not answer', hasMaster: false, hasTake: false },
  { slot: mintId<BoardSlotId>('BoardSlot', 'S06_04'), shot: mintId<ShotId>('Shot', 'S06_D'), durationMs: 3000, beat: 'The silence Thorne uses as a weapon fails him', hasMaster: true, hasTake: true },
  // Reuse of S06_A: a second moment in the cut, one shared Take history.
  { slot: mintId<BoardSlotId>('BoardSlot', 'S06_05'), shot: mintId<ShotId>('Shot', 'S06_A'), durationMs: 3500, beat: 'Return to Thorne, unmoved and finished', hasMaster: true, hasTake: true },
  { slot: mintId<BoardSlotId>('BoardSlot', 'S06_06'), shot: mintId<ShotId>('Shot', 'S06_E'), durationMs: 2500, beat: 'Lin leaves; the obsidian pin catches the light', hasMaster: true, hasTake: false },
];

export const TARGET_RUNTIME_MS = 20_000;
export const RUNTIME_TOLERANCE_MS = 500;

export const buildScene06Graph = (): ProjectGraph => {
  const shots: Record<string, Shot> = {};
  const plates: Record<string, Plate> = {};
  const takes: Record<string, Take> = {};
  const assets: ProjectGraph['assets'] = {
    [BG]: { id: BG, kind: 'image', uri: 'vault://bg/chamber', mimeType: 'image/jpeg', provenance: prov('EDNA') },
  };

  // Distinct shots, deduplicated across slots that reuse one.
  const seen = new Set<string>();
  for (const plan of SLOT_PLAN) {
    if (seen.has(plan.shot)) continue;
    seen.add(plan.shot);

    const shotSlug = plan.shot.split('/')[1];
    const plateId = mintId<PlateId>('Plate', shotSlug);
    const blocking = asset(`BLOCK_${shotSlug}`, 'image');
    assets[blocking] = { id: blocking, kind: 'image', uri: `vault://blocking/${shotSlug}`, mimeType: 'image/png', provenance: prov('PLATE', 'zhorton') };

    let master: AssetId | undefined;
    if (plan.hasMaster) {
      master = asset(`MASTER_${shotSlug}`, 'image');
      assets[master] = { id: master, kind: 'image', uri: `vault://master/${shotSlug}`, mimeType: 'image/jpeg', provenance: prov('EDNA') };
    }

    plates[plateId] = {
      id: plateId, shotId: plan.shot, placeId: CHAMBER, background: BG,
      layers: [{
        subject: { kind: 'character', id: THORNE, costume: COST_THORNE },
        asset: blocking, x: 0.5, y: 0.55, scale: 1, rotation: 0, flipH: false, z: 1,
      }],
      camera: { lensMm: 40, angle: 'eye' },
      blockingComposite: blocking,
      masterFrame: master,
      // Blocking is approved by a human; that approval says nothing about the
      // master frame, which is a separate lock.
      approval: 'approved', approvedBy: 'zhorton', approvedAt: '2026-09-26T00:00:00.000Z',
      provenance: prov('PLATE', 'zhorton'),
    };

    const takeIds: TakeId[] = [];
    if (plan.hasTake) {
      const takeId = mintId<TakeId>('Take', `${shotSlug}_T1`);
      const vid = asset(`VID_${shotSlug}_T1`, 'video');
      assets[vid] = { id: vid, kind: 'video', uri: `vault://take/${shotSlug}/1`, mimeType: 'video/mp4', durationMs: plan.durationMs, provenance: prov('MODEL_COMPILER') };
      takes[takeId] = { id: takeId, shotId: plan.shot, video: vid, verdict: 'approved', provenance: prov('MODEL_COMPILER') };
      takeIds.push(takeId);
    }

    shots[plan.shot] = {
      id: plan.shot, projectId: PRJ, intent: plan.beat,
      cast: [THORNE, LIN], props: [], placeId: CHAMBER,
      plateId, takes: takeIds,
    };
  }

  // Slots: contiguous timing, each selecting a Take from its own Shot.
  let cursor = 0;
  const boardSlots: ProjectGraph['boardSlots'] = {};
  SLOT_PLAN.forEach((plan, i) => {
    const shot = shots[plan.shot];
    boardSlots[plan.slot] = {
      id: plan.slot, boardSceneId: BSCN6, index: i,
      startMs: cursor, durationMs: plan.durationMs,
      beat: plan.beat,
      shotId: plan.shot,
      selectedTakeId: plan.hasTake ? shot.takes[0] : undefined,
      fxCues: [{ characterId: THORNE, cue: 'no_comic_mug' }],
      audioCues: [],
      transitionIn: i === 0 ? 'fade_in' : 'cut',
      status: plan.hasTake ? 'take_selected' : 'plated',
    };
    cursor += plan.durationMs;
  });

  return {
    schemaVersion: '1.0',
    project: {
      id: PRJ, title: 'The Obsidian Mandate', stage: 'assembly',
      worldId: WLD, lensId: LENS, boardId: BOARD, deliverySpecId: DELIVERY,
    },
    worlds: {
      [WLD]: {
        id: WLD, projectId: PRJ,
        tone: 'Tense, whispered paranoia, claustrophobic despite vast spaces.',
        visualStyle: 'Monumental, doctrinal, militarized elegance.',
        locationRules: 'Vaulted ceilings, polished stone, zero natural light.',
        timePeriod: 'Unspecified Neo-Authoritarian present.',
        aestheticLocks: 'Brutalist, stark monochrome with crimson or gold accent.',
        forbiddenDrift: ['cyberpunk neon', 'dirt', 'casual wear', 'shaky cam', 'daylight'],
        locked: true,
      },
    },
    lenses: {
      [LENS]: {
        id: LENS, projectId: PRJ,
        focalConvention: '40mm', heightRange: 'ground to eye', distanceRange: 'MCU to wide',
        lineDiscipline: '180, held', palette: 'monochrome, crimson/gold accent',
        forbiddenTechniques: ['whip pan', 'handheld shake', 'drone shot'],
        locked: true,
      },
    },
    deliverySpecs: {
      [DELIVERY]: {
        id: DELIVERY, projectId: PRJ,
        targetRuntimeMs: TARGET_RUNTIME_MS, runtimeToleranceMs: RUNTIME_TOLERANCE_MS,
        aspectRatio: '2.39:1', fps: 24,
      },
    },
    characters: {
      // Identity canon (canonStatus) and visual canon (VisualPackage.approval)
      // are independent axes: Thorne's bio is locked and his portrait is
      // approved; Lin's bio is approved-but-not-locked while her portrait is
      // still a candidate — the two locks can and do move independently.
      [THORNE]: { id: THORNE, projectId: PRJ, name: 'Chancellor Elias Thorne', role: 'The Cornered Incumbent', visualPackages: [VPKG_THORNE], defaultCostume: COST_THORNE, canonStatus: 'locked', lockedBy: 'zhorton', lockedAt: '2026-09-26T00:00:00.000Z' },
      [LIN]: { id: LIN, projectId: PRJ, name: 'Minister Vespera Lin', role: 'The Cold Reformist', visualPackages: [VPKG_LIN], defaultCostume: COST_LIN, canonStatus: 'approved' },
    },
    costumes: {
      [COST_THORNE]: { id: COST_THORNE, characterId: THORNE, name: 'Charcoal greatcoat', version: 'v1', costumeLocks: ['high stiff collar', 'obsidian lapel pin'], visualPackages: [VPKG_THORNE] },
      [COST_LIN]: { id: COST_LIN, characterId: LIN, name: 'Crimson civic drape', version: 'v1', costumeLocks: ['asymmetrical drape', 'silver cuffs'], visualPackages: [VPKG_LIN] },
    },
    visualPackages: {
      [VPKG_THORNE]: {
        id: VPKG_THORNE, subject: { kind: 'character', id: THORNE, costume: COST_THORNE },
        views: {}, invariants: [{ key: 'silhouette', description: 'Imposing verticality; collar forces chin up' }],
        version: 'v1', approval: 'approved', approvedBy: 'zhorton', provenance: prov('EDNA', 'zhorton'),
      },
      // Lin's canon is still a candidate. Renders exist; canon does not.
      [VPKG_LIN]: {
        id: VPKG_LIN, subject: { kind: 'character', id: LIN, costume: COST_LIN },
        views: {}, invariants: [{ key: 'palette', description: 'Muted crimson over matte black, never saturated' }],
        version: 'v1', approval: 'candidate', provenance: prov('EDNA'),
      },
    },
    places: {
      [CHAMBER]: { id: CHAMBER, projectId: PRJ, name: 'Council Chamber', scoutCaptures: [], visualPackages: [], plateBackgrounds: [BG] },
    },
    relationships: {}, props: {}, scripts: {}, scenes: {},
    continuityStates: {}, continuityReports: {}, scoutCaptures: {},
    plates, shots, takes, assets,
    boards: { [BOARD]: { id: BOARD, projectId: PRJ, name: 'Main cut', fps: 24, scenes: [BSCN6], cutSchema: 'cut.json.v1' } },
    boardScenes: { [BSCN6]: { id: BSCN6, boardId: BOARD, index: 5, title: 'Scene 06 — The Vote Count', slots: SLOT_PLAN.map(p => p.slot) } },
    boardSlots,
    events: [],
  };
};
