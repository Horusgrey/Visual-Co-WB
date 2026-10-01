import { mintId } from '../schema/ids.js';
import type {
  AssetId, ContinuityReportId, ContinuityStateId, PlaceId, ProjectId, ShotId, TakeId,
} from '../schema/ids.js';
import type {
  ContinuityReport, ContinuityState, ProjectGraph, RiskFlag, Shot, Take,
} from '../schema/projectGraph.js';
import type { Engine } from '../schema/engine.js';
import type { EnginePatch, Evidence, Provenance } from '../schema/provenance.js';

/**
 * VCS-15 — reverse ingestion of existing footage into evidence.
 *
 * "VCS may also analyze an existing video and propose temporal beats for
 * Board ingestion... video → observed beat boundaries → candidate Board
 * Slots." (suite map, slide 07/09). This engine covers the VCS half —
 * turning a beat-marked clip into a Shot, one Take, and a chain of
 * ContinuityStates + a ContinuityReport. Handing those to Board as candidate
 * BoardSlots is a *Board* decision, not this engine's: see
 * `boardReverseIngest.ts`, which reads this engine's output rather than
 * duplicating the analysis.
 *
 * The worked example is real: `VCS_Frameboard_1000068454-3.html`, 8 beats
 * from an actual SUPERZ clip — rooftop reality → a vortex/title concealment
 * zone → a superhero identity, with the source file's own `.note` div
 * already marking beat 8 as "the canonical next-shot handoff." That
 * human-authored boundary is carried through as `continuityBoundary` on the
 * beat, not re-derived by keyword-guessing prose — VCS-15's own rule is
 * "NEVER fake confidence," and inferring a continuity break from adjectives
 * would be exactly that.
 */

export interface VcsBeatInput {
  n: number;
  /** e.g. 'START' | 'SEQUENCE' | 'END' — free text, not a closed enum; the
   * source data uses exactly these three but nothing here depends on it. */
  label: string;
  atMs: number;
  title: string;
  description: string;
  fx?: string;
  /** The extracted frame for this beat, if one was captured. */
  frame?: AssetId;
  /** True when this beat is an authored continuity break, not inferred. */
  continuityBoundary?: boolean;
}

export interface VcsBeatIngestRequest {
  projectId: ProjectId;
  sourceVideo: AssetId;
  placeId?: PlaceId;
  /** Ordered by `n`. At least 2 beats are required (entering + ending). */
  beats: VcsBeatInput[];
  /** Reuse an existing Shot instead of minting one, e.g. on re-analysis. */
  shotId?: ShotId;
  actor?: string;
  at: string; // ISO 8601, caller-supplied
}

const toEvidence = (beat: VcsBeatInput): Evidence => ({
  grade: 'B', // automated/observational — a human has not verified this beat
  frameRefs: beat.frame ? [beat.frame] : undefined,
  source: `beat ${beat.n} (${beat.label}) @ ${beat.atMs}ms`,
  note: beat.fx,
});

export const VCS15BeatIngest: Engine<VcsBeatIngestRequest> = {
  name: 'VCS15',

  async run(graph: Readonly<ProjectGraph>, request: VcsBeatIngestRequest): Promise<EnginePatch> {
    const warnings: string[] = [];
    if (request.beats.length < 2) {
      return {
        engine: 'VCS15', ops: [], events: [], locksCanon: false,
        warnings: ['At least 2 beats are required to form an entering/ending pair'],
      };
    }
    const beats = [...request.beats].sort((a, b) => a.n - b.n);
    const first = beats[0];
    const last = beats[beats.length - 1];

    // Slugs are derived from the source video and beat count rather than the
    // wall clock, so the same request ingested twice against a fresh graph
    // produces the same IDs — the engine stays a pure function of its inputs.
    const videoSlug = request.sourceVideo.split('/')[1] ?? 'CLIP';
    const shotId = request.shotId ?? mintId<ShotId>('Shot', `INGEST_${videoSlug}`);
    const existingShot = request.shotId ? graph.shots[request.shotId] : undefined;
    const shotExists = !!existingShot;
    const takeSlug = `INGEST_${videoSlug}_${existingShot?.takes.length ?? 0}`;
    const takeId = mintId<TakeId>('Take', takeSlug);

    const provenance: Provenance = {
      engine: 'VCS15', sourceRefs: [request.sourceVideo], createdAt: request.at, actor: request.actor,
    };

    const ops: EnginePatch['ops'] = [];

    if (!shotExists) {
      const shot: Shot = {
        id: shotId, projectId: request.projectId,
        intent: `Ingested clip: ${first.title} → ${last.title}`,
        cast: [], props: [], placeId: request.placeId, takes: [takeId],
      };
      ops.push({ op: 'create', kind: 'Shot', id: shotId, value: shot });
    } else {
      ops.push({ op: 'update', kind: 'Shot', id: shotId, fields: { takes: [...existingShot!.takes, takeId] } });
    }

    const take: Take = {
      id: takeId, shotId, video: request.sourceVideo,
      keyFrame: first.frame, endFrame: last.frame,
      verdict: 'unreviewed', provenance,
    };
    ops.push({ op: 'create', kind: 'Take', id: takeId, value: take });

    // One ContinuityState per beat — never fake identity/costume/prop
    // observations a pure frame+description pass can't actually support.
    const stateIds: ContinuityStateId[] = [];
    for (const beat of beats) {
      const stateId = mintId<ContinuityStateId>('ContinuityState', `${shotId.split('/')[1]}_B${beat.n}`);
      stateIds.push(stateId);
      const state: ContinuityState = {
        id: stateId,
        subject: { shotId, takeId },
        atMs: beat.atMs,
        visibleCast: [], costumes: [], visibleProps: [],
        environment: beat.title,
        performanceState: beat.description,
        evidence: [toEvidence(beat)],
        confidence: { status: 'inferred', value: 0.6 },
      };
      ops.push({ op: 'create', kind: 'ContinuityState', id: stateId, value: state });
    }

    // Observed changes and risks come only from beats the source data itself
    // flagged as boundaries — see the module doc on why this isn't guessed.
    const observedChanges: string[] = [];
    const risks: RiskFlag[] = [];
    beats.forEach((beat, i) => {
      if (i === 0 || !beat.continuityBoundary) return;
      observedChanges.push(`Beat ${beat.n} (${beat.title}): ${beat.description}`);
      risks.push({
        title: beat.title,
        description: beat.description,
        severity: 'high',
        mitigation: 'Confirm before compiling any request that spans this boundary.',
        evidence: toEvidence(beat),
      });
    });
    if (risks.length === 0) {
      warnings.push('No beat was marked continuityBoundary — risks list is empty by construction, not by absence of drift');
    }

    const reportId = mintId<ContinuityReportId>('ContinuityReport', `${shotId.split('/')[1]}_INGEST`);
    const report: ContinuityReport = {
      id: reportId,
      subject: { shotId, takeId },
      entering: stateIds[0],
      ending: stateIds[stateIds.length - 1],
      observedChanges,
      risks,
      // The next shot must respect whatever was true — and locked — at the
      // very last beat, per VCS-15's own definition of the question it answers.
      nextShotConstraints: last.fx ? [last.fx] : [],
      openQuestions: [
        'Speaker attribution not analyzed — beats carry visual/FX notes only, no audio pass.',
        ...(request.placeId ? [] : ['No placeId supplied — environment is known only as beat text, not a canonical Place.']),
      ],
      provenance,
    };
    ops.push({ op: 'create', kind: 'ContinuityReport', id: reportId, value: report });

    return {
      engine: 'VCS15',
      locksCanon: false, // VCS-15 proposes continuity findings; it never locks canon.
      ops,
      events: [{
        at: request.at, engine: 'VCS15', type: 'continuity.ingested',
        targetKind: 'ContinuityReport', targetId: reportId,
        summary: `Ingested ${beats.length} beats into ${shotId}/${takeId}; ${risks.length} boundary risk(s) found`,
        invalidates: [shotId, takeId],
        provenance,
      }],
      warnings: warnings.length ? warnings : undefined,
    };
  },
};
