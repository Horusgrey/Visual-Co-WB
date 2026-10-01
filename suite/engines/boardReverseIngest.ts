import { mintId } from '../schema/ids.js';
import type {
  BoardId, BoardSceneId, BoardSlotId, ContinuityReportId, ContinuityStateId,
  ShotId, TakeId,
} from '../schema/ids.js';
import type { BoardScene, BoardSlot, ProjectGraph } from '../schema/projectGraph.js';
import type { EnginePatch, Provenance } from '../schema/provenance.js';

/**
 * Board's reverse-ingestion capability: "existing video → VCS beats →
 * candidate Board Slots" (suite map, slide 07). Deliberately a plain
 * function, not a full `Engine<Request>` — Board's other responsibilities
 * (FX, audio, transitions, cut.json export) don't exist yet, so this covers
 * exactly the one named capability rather than standing in for the whole
 * engine. Same pattern as `vco/delivery.ts`.
 *
 * This reads a VCS-15 ingest's output; it does not re-run any analysis. The
 * `ContinuityState`s it slices into candidate Slots must already carry
 * `atMs` (set by `vcs15BeatIngest.ts`) — without it there is no time axis to
 * cut on, and this function refuses rather than guessing one.
 *
 * One Take, many Slots: the ingested clip is a single piece of footage, so
 * every proposed Slot selects the same Take. This is the ordinary Shot/Slot
 * split doing its job in a new setting — `slot.take_matches_shot` holds here
 * exactly as it does for freshly generated coverage.
 */

export interface BoardReverseIngestRequest {
  boardId: BoardId;
  sceneTitle: string;
  shotId: ShotId;
  takeId: TakeId;
  continuityReportId: ContinuityReportId;
  /** Ordered chronologically; each must have `atMs` set. */
  continuityStateIds: ContinuityStateId[];
  /** Duration proposed for the final Slot, which has no "next" boundary. */
  tailMs: number;
  actor?: string;
  at: string;
}

export const proposeBoardSlotsFromContinuity = (
  graph: Readonly<ProjectGraph>,
  request: BoardReverseIngestRequest,
): EnginePatch => {
  const board = graph.boards[request.boardId];
  if (!board) {
    return { engine: 'BOARD', ops: [], events: [], locksCanon: false, warnings: [`Board ${request.boardId} does not exist`] };
  }

  const states = request.continuityStateIds.map(id => graph.continuityStates[id]);
  const missing = request.continuityStateIds.filter((id, i) => !states[i]);
  if (missing.length) {
    return { engine: 'BOARD', ops: [], events: [], locksCanon: false, warnings: [`Missing continuity states: ${missing.join(', ')}`] };
  }
  const untimed = states.filter(s => s!.atMs == null);
  if (untimed.length) {
    return {
      engine: 'BOARD', ops: [], events: [], locksCanon: false,
      warnings: [`${untimed.length} continuity state(s) have no atMs — cannot derive candidate slot boundaries without a time axis`],
    };
  }
  if (states.length < 2) {
    return { engine: 'BOARD', ops: [], events: [], locksCanon: false, warnings: ['Need at least 2 timed continuity states to propose a slot'] };
  }

  const sceneId = mintId<BoardSceneId>('BoardScene', `${request.shotId.split('/')[1]}_INGEST`);
  const slotIds: BoardSlotId[] = [];
  const ops: EnginePatch['ops'] = [];

  for (let i = 0; i < states.length - 1; i++) {
    const entering = states[i]!;
    const ending = states[i + 1]!;
    const isLast = i === states.length - 2;
    const startMs = entering.atMs!;
    const endMs = isLast ? ending.atMs! + request.tailMs : ending.atMs!;
    const slotId = mintId<BoardSlotId>('BoardSlot', `${request.shotId.split('/')[1]}_S${i}`);
    slotIds.push(slotId);

    const slot: BoardSlot = {
      id: slotId, boardSceneId: sceneId, index: i,
      startMs, durationMs: Math.max(0, endMs - startMs),
      beat: entering.environment ?? entering.performanceState,
      shotId: request.shotId,
      selectedTakeId: request.takeId,
      fxCues: [], audioCues: [],
      continuityIn: entering.id, continuityOut: ending.id,
      continuityReportId: request.continuityReportId,
      // Shot and Take are both real and already selected — this slot is a
      // candidate cut point on existing footage, not an empty placeholder.
      status: 'take_selected',
    };
    ops.push({ op: 'create', kind: 'BoardSlot', id: slotId, value: slot });
  }

  const scene: BoardScene = {
    id: sceneId, boardId: request.boardId,
    index: board.scenes.length, title: request.sceneTitle, slots: slotIds,
  };
  ops.push({ op: 'create', kind: 'BoardScene', id: sceneId, value: scene });
  ops.push({ op: 'link', from: request.boardId, to: sceneId, as: 'scenes' });

  const provenance: Provenance = {
    engine: 'BOARD', sourceRefs: [request.continuityReportId], createdAt: request.at, actor: request.actor,
  };

  return {
    engine: 'BOARD',
    locksCanon: false, // Candidate slots — the sequence itself isn't reviewed until a human does.
    ops,
    events: [{
      at: request.at, engine: 'BOARD', type: 'boardScene.proposed_from_ingest',
      targetKind: 'BoardScene', targetId: sceneId,
      summary: `Proposed ${slotIds.length} candidate slot(s) from ingested continuity for ${request.shotId}`,
      provenance,
    }],
  };
};
