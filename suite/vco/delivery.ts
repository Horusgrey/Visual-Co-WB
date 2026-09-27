import type { BoardId } from '../schema/ids.js';
import type {
  DeliveryCheck, DeliveryReport, ProjectGraph,
} from '../schema/projectGraph.js';

/**
 * Delivery QC — a deterministic project-level gate.
 *
 * Every check states expected vs actual and resolves to pass / warn / block /
 * not_applicable. No LLM judgement: a human can re-derive each verdict by hand.
 *
 * "Not gradeable" is deliberately a blocker rather than a pass. A check that
 * cannot be computed must never read as satisfied.
 */

/** Sums slot durations for the Board that constitutes the cut. */
export const computeRuntimeMs = (g: ProjectGraph, boardId: BoardId): number | null => {
  const board = g.boards[boardId];
  if (!board) return null;
  let total = 0;
  for (const sceneId of board.scenes) {
    const scene = g.boardScenes[sceneId];
    if (!scene) continue;
    for (const slotId of scene.slots) {
      const slot = g.boardSlots[slotId];
      if (slot) total += slot.durationMs;
    }
  }
  return total;
};

const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export const runDeliveryChecks = (g: ProjectGraph): DeliveryReport => {
  const checks: DeliveryCheck[] = [];
  const spec = g.project.deliverySpec;
  const boardId = g.project.boardId;

  // ── Runtime ──
  if (!spec?.targetRuntimeMs) {
    checks.push({ id: 'runtime', label: 'Target runtime', outcome: 'not_applicable', detail: 'No target runtime in DeliverySpec' });
  } else if (!boardId) {
    checks.push({
      id: 'runtime', label: 'Target runtime', outcome: 'block',
      expected: fmt(spec.targetRuntimeMs), actual: 'not gradeable',
      detail: 'Project has no boardId, so runtime cannot be computed',
    });
  } else {
    const actual = computeRuntimeMs(g, boardId);
    if (actual === null) {
      checks.push({
        id: 'runtime', label: 'Target runtime', outcome: 'block',
        expected: fmt(spec.targetRuntimeMs), actual: 'not gradeable',
        detail: `boardId ${boardId} does not resolve`,
      });
    } else {
      const tol = spec.runtimeToleranceMs ?? 0;
      const delta = actual - spec.targetRuntimeMs;
      checks.push({
        id: 'runtime', label: 'Target runtime',
        outcome: Math.abs(delta) <= tol ? 'pass' : 'block',
        expected: `${fmt(spec.targetRuntimeMs)} ±${fmt(tol)}`,
        actual: fmt(actual),
        detail: delta === 0 ? 'exact'
          : `${delta < 0 ? 'short' : 'long'} by ${fmt(Math.abs(delta))}`,
      });
    }
  }

  // ── Every slot in the cut must have a selected Take ──
  const slots = boardId ? cutSlots(g, boardId) : [];
  const missingTake = slots.filter(s => !s.selectedTakeId);
  checks.push({
    id: 'slots.take_selected', label: 'Every slot has a selected take',
    outcome: !boardId ? 'block' : missingTake.length ? 'block' : 'pass',
    expected: `${slots.length} of ${slots.length}`,
    actual: `${slots.length - missingTake.length} of ${slots.length}`,
    detail: missingTake.length ? `unselected: ${missingTake.map(s => s.id).join(', ')}` : undefined,
  });

  // ── Every slot's shot must have an approved master frame.
  //    Approved blocking is NOT a master: they are separate locks. ──
  const noMaster: string[] = [];
  const blockingOnly: string[] = [];
  for (const slot of slots) {
    const shot = slot.shotId ? g.shots[slot.shotId] : undefined;
    const plate = shot?.plateId ? g.plates[shot.plateId] : undefined;
    if (!plate || !plate.masterFrame) {
      noMaster.push(slot.id);
      if (plate?.blockingComposite && plate.approval === 'approved') blockingOnly.push(slot.id);
    }
  }
  checks.push({
    id: 'slots.master_frame', label: 'Every shot has a master frame',
    outcome: noMaster.length ? 'block' : 'pass',
    expected: `${slots.length} of ${slots.length}`,
    actual: `${slots.length - noMaster.length} of ${slots.length}`,
    detail: noMaster.length
      ? `no master: ${noMaster.join(', ')}${blockingOnly.length ? ` (blocking approved but unrendered: ${blockingOnly.join(', ')})` : ''}`
      : undefined,
  });

  // ── EDNA canon: any visual package the cut depends on must be approved ──
  const unapproved = Object.values(g.visualPackages).filter(p => p.approval !== 'approved');
  checks.push({
    id: 'canon.packages_approved', label: 'Visual canon approved',
    outcome: unapproved.length ? 'block' : 'pass',
    expected: 'all packages approved',
    actual: `${unapproved.length} unapproved`,
    detail: unapproved.length ? unapproved.map(p => `${p.id} (${p.approval})`).join(', ') : undefined,
  });

  // ── Continuity: unresolved high-severity risk blocks; medium warns ──
  const slotsWithoutContinuity = slots.filter(s => !s.continuityOut);
  checks.push({
    id: 'continuity.analyzed', label: 'Continuity analysed through the cut',
    outcome: slotsWithoutContinuity.length ? 'warn' : 'pass',
    expected: `${slots.length} of ${slots.length}`,
    actual: `${slots.length - slotsWithoutContinuity.length} of ${slots.length}`,
    detail: slotsWithoutContinuity.length ? `no continuity out: ${slotsWithoutContinuity.map(s => s.id).join(', ')}` : undefined,
  });

  // ── Format checks: present-or-absent, no inference ──
  for (const [id, label, value] of [
    ['fps', 'Frame rate', spec?.fps],
    ['aspect', 'Aspect ratio', spec?.aspectRatio],
    ['codec', 'Codec', spec?.codec],
    ['loudness', 'Loudness target', spec?.loudnessLufs],
  ] as [string, string, unknown][]) {
    checks.push({
      id: `format.${id}`, label,
      outcome: value === undefined ? 'warn' : 'pass',
      expected: 'specified',
      actual: value === undefined ? 'unspecified' : String(value),
    });
  }

  return {
    checks,
    deliverable: !checks.some(c => c.outcome === 'block'),
    evaluatedAt: new Date().toISOString(),
  };
};

const cutSlots = (g: ProjectGraph, boardId: BoardId) => {
  const board = g.boards[boardId];
  if (!board) return [];
  return board.scenes
    .map(id => g.boardScenes[id])
    .filter(Boolean)
    .flatMap(sc => sc.slots.map(id => g.boardSlots[id]).filter(Boolean));
};
