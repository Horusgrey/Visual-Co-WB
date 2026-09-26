import type { ProjectGraph } from '../schema/projectGraph.js';

/**
 * Structural invariants of the canonical graph.
 *
 * These encode the ownership boundaries from the BUILD LAW as executable
 * checks, so a boundary violation fails loudly here instead of surfacing
 * later as unexplained drift. Run on every patch application.
 */

export interface Violation {
  rule: string;
  detail: string;
}

export const checkInvariants = (g: ProjectGraph): Violation[] => {
  const v: Violation[] = [];
  const has = (rec: Record<string, unknown>, id?: string) => !!id && id in rec;

  // ── Take ownership: Takes belong to Shots, never to Slots ──
  for (const take of Object.values(g.takes)) {
    if (!has(g.shots, take.shotId)) {
      v.push({ rule: 'take.belongs_to_shot', detail: `${take.id} references missing shot ${take.shotId}` });
      continue;
    }
    if (!g.shots[take.shotId].takes.includes(take.id)) {
      v.push({ rule: 'take.listed_on_shot', detail: `${take.id} not listed on ${take.shotId}` });
    }
  }

  // ── A Slot may only select a Take that belongs to the Slot's own Shot.
  //    This is what lets one Shot appear in several Slots without forking
  //    its Take history. ──
  for (const slot of Object.values(g.boardSlots)) {
    if (!slot.selectedTakeId) continue;
    const take = g.takes[slot.selectedTakeId];
    if (!take) {
      v.push({ rule: 'slot.take_exists', detail: `${slot.id} selects missing take ${slot.selectedTakeId}` });
    } else if (!slot.shotId) {
      v.push({ rule: 'slot.take_requires_shot', detail: `${slot.id} selects a take but has no shot` });
    } else if (take.shotId !== slot.shotId) {
      v.push({
        rule: 'slot.take_matches_shot',
        detail: `${slot.id} (shot ${slot.shotId}) selects ${take.id} which belongs to ${take.shotId}`,
      });
    }
  }

  // ── Board owns time; Plate and Shot must not. Slots within a scene must be
  //    contiguous and non-overlapping, since Board is the one sequence system. ──
  for (const bs of Object.values(g.boardScenes)) {
    const slots = bs.slots.map(id => g.boardSlots[id]).filter(Boolean);
    const ordered = [...slots].sort((a, b) => a.index - b.index);
    ordered.forEach((slot, i) => {
      if (slot.durationMs <= 0) {
        v.push({ rule: 'slot.positive_duration', detail: `${slot.id} has duration ${slot.durationMs}` });
      }
      const prev = ordered[i - 1];
      if (prev && slot.startMs < prev.startMs + prev.durationMs) {
        v.push({
          rule: 'slot.no_overlap',
          detail: `${slot.id} starts at ${slot.startMs}ms, inside ${prev.id} which ends at ${prev.startMs + prev.durationMs}ms`,
        });
      }
    });
    const indices = ordered.map(s => s.index);
    if (new Set(indices).size !== indices.length) {
      v.push({ rule: 'slot.unique_index', detail: `${bs.id} has duplicate slot indices` });
    }
  }

  // ── Plate owns the frame only. A Plate is bound to exactly one Shot. ──
  for (const plate of Object.values(g.plates)) {
    if (!has(g.shots, plate.shotId)) {
      v.push({ rule: 'plate.belongs_to_shot', detail: `${plate.id} references missing shot ${plate.shotId}` });
    }
    if (!has(g.assets, plate.background)) {
      v.push({ rule: 'plate.background_exists', detail: `${plate.id} references missing background` });
    }
    if (plate.masterFrame && !plate.blockingComposite) {
      v.push({
        rule: 'plate.master_derives_from_blocking',
        detail: `${plate.id} has a master frame with no blocking composite to derive it from`,
      });
    }
  }

  // ── EDNA: only approved visual packages may be treated as canon. ──
  for (const pkg of Object.values(g.visualPackages)) {
    if (pkg.approval === 'approved' && !pkg.approvedBy) {
      v.push({
        rule: 'canon.human_approval',
        detail: `${pkg.id} is approved with no approver — engines may propose canon, only humans lock it`,
      });
    }
  }

  // ── FX and acoustic cues must bind to a real Character. ──
  for (const slot of Object.values(g.boardSlots)) {
    for (const cue of slot.fxCues) {
      if (!has(g.characters, cue.characterId)) {
        v.push({ rule: 'fx.bound_to_character', detail: `${slot.id} cue '${cue.cue}' references missing ${cue.characterId}` });
      }
    }
  }
  for (const scene of Object.values(g.scenes)) {
    for (const line of scene.dialogue) {
      if (!has(g.characters, line.characterId)) {
        v.push({ rule: 'dialogue.bound_to_character', detail: `${scene.id} line ${line.id} references missing ${line.characterId}` });
      }
    }
  }

  // ── Events are append-only and strictly ordered. ──
  g.events.forEach((e, i) => {
    if (i > 0 && e.seq <= g.events[i - 1].seq) {
      v.push({ rule: 'events.monotonic_seq', detail: `event ${e.id} seq ${e.seq} does not follow ${g.events[i - 1].seq}` });
    }
  });

  return v;
};

/**
 * Delivery gate. Blockers are absolute: a project cannot reach Final Master
 * while any blocker fails, and structural violations count as blockers.
 */
export const canReachFinalMaster = (g: ProjectGraph): { ok: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  for (const viol of checkInvariants(g)) reasons.push(`invariant: ${viol.rule} — ${viol.detail}`);
  const report = g.project.deliveryReport;
  if (!report) {
    reasons.push('delivery: no QC report has been run');
  } else {
    for (const c of report.checks) {
      if (c.outcome === 'block') reasons.push(`delivery blocker: ${c.label}`);
    }
  }
  return { ok: reasons.length === 0, reasons };
};
