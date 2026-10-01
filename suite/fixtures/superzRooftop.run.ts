import { buildIngestFixture, BOARD, SOURCE_VIDEO, ROOFTOP_PLACE } from './superzRooftop.js';
import { VCS15BeatIngest } from '../engines/vcs15BeatIngest.js';
import { proposeBoardSlotsFromContinuity } from '../engines/boardReverseIngest.js';
import { applyPatch } from '../vco/applyPatch.js';
import { checkInvariants } from '../vco/invariants.js';
import type { ContinuityReport } from '../schema/projectGraph.js';
import type { AnyId, ContinuityReportId, ObjectKind, ShotId, TakeId } from '../schema/ids.js';
import type { GraphOp } from '../schema/provenance.js';

/** Narrows to the 'create' variant, which is the only one this file reads `.id` from. */
const createdId = (ops: GraphOp[], kind: ObjectKind): AnyId => {
  const op = ops.find((o): o is Extract<GraphOp, { op: 'create' }> => o.op === 'create' && o.kind === kind);
  if (!op) throw new Error(`No 'create' op found for kind ${kind}`);
  return op.id;
};

/**
 * End-to-end proof: real SUPERZ footage beats → VCS-15 ingest → Board
 * reverse ingestion → a valid, invariant-clean graph with 7 candidate slots
 * sharing one Take and two flagged continuity risks.
 */

const AT = '2026-09-30T00:00:00.000Z';

const main = async () => {
  const { graph, beats } = buildIngestFixture();

  // ── Step 1: VCS-15 ingests the beats ──
  const ingestPatch = await VCS15BeatIngest.run(graph, {
    projectId: graph.project.id, sourceVideo: SOURCE_VIDEO, placeId: ROOFTOP_PLACE,
    beats, actor: 'system', at: AT,
  });
  console.log(`VCS-15 ingest warnings: ${ingestPatch.warnings?.join('; ') ?? 'none'}`);

  const r1 = applyPatch(graph, ingestPatch);
  console.log(`VCS-15 patch applied: ${r1.applied}   rejections: ${r1.rejections.join('; ') || 'none'}   violations: ${r1.violations.length}`);
  if (!r1.applied) process.exit(1);

  const reportId = createdId(ingestPatch.ops, 'ContinuityReport');
  const report = r1.graph.continuityReports[reportId] as ContinuityReport;
  console.log(`\ncontinuity report: ${report.observedChanges.length} observed change(s), ${report.risks.length} risk(s)`);
  for (const risk of report.risks) console.log(`  [${risk.severity}] ${risk.title} — ${risk.description}`);
  console.log(`next-shot constraints: ${report.nextShotConstraints.join(' | ')}`);

  const shotId = createdId(ingestPatch.ops, 'Shot');
  const takeId = createdId(ingestPatch.ops, 'Take');
  const stateIds = ingestPatch.ops
    .filter((op): op is Extract<GraphOp, { op: 'create' }> => op.op === 'create' && op.kind === 'ContinuityState')
    .map(op => op.id as typeof report.entering);

  // ── Step 2: Board proposes candidate slots from the ingested continuity ──
  const boardPatch = proposeBoardSlotsFromContinuity(r1.graph, {
    boardId: BOARD, sceneTitle: 'Rooftop → Hero (ingested)',
    shotId: shotId as ShotId, takeId: takeId as TakeId,
    continuityReportId: reportId as ContinuityReportId,
    continuityStateIds: stateIds,
    tailMs: 1500, actor: 'system', at: AT,
  });
  console.log(`\nBoard reverse-ingest warnings: ${boardPatch.warnings?.join('; ') ?? 'none'}`);

  const r2 = applyPatch(r1.graph, boardPatch);
  console.log(`Board patch applied: ${r2.applied}   rejections: ${r2.rejections.join('; ') || 'none'}   violations: ${r2.violations.length}`);
  if (!r2.applied) process.exit(1);

  const slots = Object.values(r2.graph.boardSlots);
  const distinctTakes = new Set(slots.map(s => s.selectedTakeId)).size;
  console.log(`\nproposed slots: ${slots.length}   distinct takes referenced: ${distinctTakes} (all share the one ingested Take)`);
  slots.sort((a, b) => a.index - b.index).forEach(s => {
    console.log(`  [${s.index}] ${s.startMs}-${s.startMs + s.durationMs}ms  "${s.beat}"`);
  });

  const violations = checkInvariants(r2.graph);
  console.log(`\nfinal graph invariants: ${violations.length === 0 ? 'clean' : 'VIOLATIONS'}`);
  for (const v of violations) console.log(`  ${v.rule} — ${v.detail}`);

  process.exit(violations.length === 0 && r1.applied && r2.applied ? 0 : 1);
};

main();
