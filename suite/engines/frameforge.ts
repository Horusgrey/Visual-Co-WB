import type { AssetId, TakeId } from '../schema/ids.js';
import type { ProjectGraph, Take } from '../schema/projectGraph.js';
import type { Engine } from '../schema/engine.js';
import type { EnginePatch, Provenance } from '../schema/provenance.js';

/**
 * FrameForge — deep Take inspection.
 *
 * Scope, per the suite map (slide 08) and Plate.pptx: frame-accurate range
 * marking, key/end-frame capture, audio extraction, notes. It returns
 * structured evidence to Board and never touches sequence order — no Board,
 * BoardScene, BoardSlot or Shot object appears anywhere in this file.
 *
 * The uploaded `frame-forge-4.html` prototype is the tool this schema-level
 * engine has to feed: it edits per-frame rows (image, description, audio, fx,
 * duration) and exports a `cut.json`-shaped handoff bundle. That prototype is
 * also a case study in the exact drift the suite map warns about — "the old
 * FrameForge prototype discovered Board features early" — since its rows
 * carry duration and sequence position, which belong to BoardSlot, not here.
 * This engine only accepts the inspection-specific fields (ranges, key/end
 * frames, extracted audio, notes) and refuses the rest by construction: the
 * request type below has no field for sequence order or duration-in-the-cut.
 */

export interface RangeMark {
  startMs: number;
  endMs: number;
  note?: string;
}

export interface RejectedRangeMark {
  startMs: number;
  endMs: number;
  reason?: string;
}

export interface FrameForgeRequest {
  takeId: TakeId;
  selectedRanges?: RangeMark[];
  rejectedRanges?: RejectedRangeMark[];
  keyFrame?: AssetId;
  endFrame?: AssetId;
  extractedAudio?: AssetId[];
  notes?: string;
  /** Who did the inspection — carried into provenance, not into the Take. */
  actor: string;
  at: string; // ISO 8601, caller-supplied so the engine stays deterministic
}

const overlaps = (a: { startMs: number; endMs: number }, b: { startMs: number; endMs: number }) =>
  a.startMs < b.endMs && b.startMs < a.endMs;

export const FrameForge: Engine<FrameForgeRequest> = {
  name: 'FRAMEFORGE',

  async run(graph: Readonly<ProjectGraph>, request: FrameForgeRequest): Promise<EnginePatch> {
    const warnings: string[] = [];
    const take: Take | undefined = graph.takes[request.takeId];

    if (!take) {
      return {
        engine: 'FRAMEFORGE',
        ops: [],
        events: [],
        locksCanon: false,
        warnings: [`Take ${request.takeId} does not exist — nothing to inspect`],
      };
    }

    // A range marked both selected and rejected is a contradiction FrameForge
    // should surface, not silently resolve one way.
    const selected = request.selectedRanges ?? [];
    const rejected = request.rejectedRanges ?? [];
    for (const s of selected) {
      for (const r of rejected) {
        if (overlaps(s, r)) {
          warnings.push(
            `Selected range ${s.startMs}-${s.endMs}ms overlaps rejected range ${r.startMs}-${r.endMs}ms`,
          );
        }
      }
    }

    // Bounds-check against the video asset's own duration, when known — a
    // range past the end of the footage is evidence of a mis-entered timestamp.
    const video = graph.assets[take.video];
    const durationMs = video?.durationMs;
    if (durationMs != null) {
      for (const r of [...selected, ...rejected]) {
        if (r.endMs > durationMs) {
          warnings.push(`Range ${r.startMs}-${r.endMs}ms exceeds the take's known duration (${durationMs}ms)`);
        }
      }
    }

    const fields: Record<string, unknown> = {};
    if (request.selectedRanges) fields.selectedRanges = mergeRanges(take.selectedRanges, request.selectedRanges);
    if (request.rejectedRanges) fields.rejectedRanges = mergeRanges(take.rejectedRanges, request.rejectedRanges);
    if (request.keyFrame) fields.keyFrame = request.keyFrame;
    if (request.endFrame) fields.endFrame = request.endFrame;
    if (request.extractedAudio) fields.extractedAudio = mergeAssetIds(take.extractedAudio, request.extractedAudio);
    if (request.notes) fields.notes = take.notes ? `${take.notes}\n${request.notes}` : request.notes;

    if (Object.keys(fields).length === 0) {
      return { engine: 'FRAMEFORGE', ops: [], events: [], locksCanon: false, warnings: ['Empty request — nothing to record'] };
    }

    const provenance: Provenance = {
      engine: 'FRAMEFORGE', sourceRefs: [request.takeId], createdAt: request.at, actor: request.actor,
    };

    return {
      engine: 'FRAMEFORGE',
      locksCanon: false, // FrameForge returns evidence; it never approves or locks anything.
      ops: [{ op: 'update', kind: 'Take', id: request.takeId, fields }],
      events: [{
        at: request.at,
        engine: 'FRAMEFORGE',
        type: 'take.inspected',
        targetKind: 'Take',
        targetId: request.takeId,
        summary: `Inspection recorded: ${selected.length} selected, ${rejected.length} rejected range(s)`,
        provenance,
      }],
      warnings: warnings.length ? warnings : undefined,
    };
  },
};

const mergeRanges = <T extends { startMs: number; endMs: number }>(existing: T[] | undefined, incoming: T[]): T[] =>
  [...(existing ?? []), ...incoming];

const mergeAssetIds = (existing: AssetId[] | undefined, incoming: AssetId[]): AssetId[] =>
  Array.from(new Set([...(existing ?? []), ...incoming]));
