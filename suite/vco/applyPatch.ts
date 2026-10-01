import { mintId, type EventId } from '../schema/ids.js';
import type { ProjectGraph } from '../schema/projectGraph.js';
import { CANNOT_LOCK_CANON } from '../schema/engine.js';
import type { CanonEvent, EnginePatch, GraphOp } from '../schema/provenance.js';
import { checkInvariants, type Violation } from './invariants.js';

/**
 * VCO is the only writer.
 *
 * Every engine returns an EnginePatch; this is the single funnel through which
 * a patch becomes truth. It is transactional: if the resulting graph violates
 * a structural invariant, nothing is applied and the caller gets the reasons.
 */

export interface ApplyResult {
  graph: ProjectGraph;
  applied: boolean;
  events: CanonEvent[];
  violations: Violation[];
  rejections: string[];
}

const COLLECTION: Record<string, keyof ProjectGraph> = {
  World: 'worlds', Lens: 'lenses', Character: 'characters',
  Relationship: 'relationships', Costume: 'costumes', Prop: 'props',
  Place: 'places', VisualPackage: 'visualPackages', Script: 'scripts',
  Scene: 'scenes', Plate: 'plates', Shot: 'shots', Take: 'takes',
  Board: 'boards', BoardScene: 'boardScenes', BoardSlot: 'boardSlots',
  ContinuityState: 'continuityStates', ContinuityReport: 'continuityReports',
  ScoutCapture: 'scoutCaptures', DeliverySpec: 'deliverySpecs', Asset: 'assets',
};

/** Fields that must go through the 'approve'/'lock' ops, never a raw 'update'. */
const CANON_GATED_FIELDS = ['approval', 'canonStatus'];

const clone = <T>(v: T): T => structuredClone(v);

/**
 * Typed accessor for a keyed collection. ProjectGraph also holds `project`,
 * `schemaVersion` and the `events` array, so the lookup is narrowed here once
 * rather than cast at each call site.
 */
const collectionFor = (
  g: ProjectGraph,
  kind: string,
): Record<string, Record<string, unknown>> | null => {
  const key = COLLECTION[kind];
  if (!key) return null;
  return g[key] as unknown as Record<string, Record<string, unknown>>;
};

export const applyPatch = (graph: ProjectGraph, patch: EnginePatch): ApplyResult => {
  const rejections: string[] = [];

  // Engines may propose canon; only a human actor locks it. Gated on either
  // the patch's own declared intent (locksCanon) OR an actual approve/lock
  // op appearing in it. The second half closes a real gap: `locksCanon` is
  // self-reported by the engine, so a patch could carry out an approval via
  // ops while simply leaving the flag false. The `update` guard below makes
  // approve/lock the ONLY way to set those fields, so checking for the op
  // itself — not the flag — is what actually enforces the rule.
  const opRequiresApproval = patch.ops.some(op => op.op === 'approve' || op.op === 'lock');
  if ((patch.locksCanon || opRequiresApproval) && CANNOT_LOCK_CANON.includes(patch.engine)) {
    const humanBacked = patch.events.some(e => !!e.provenance?.actor);
    if (!humanBacked) {
      rejections.push(
        `${patch.engine} attempted to lock canon with no human actor in provenance`,
      );
    }
  }

  if (rejections.length) {
    return { graph, applied: false, events: [], violations: [], rejections };
  }

  const next = clone(graph);

  for (const op of patch.ops) {
    const err = applyOp(next, op);
    if (err) rejections.push(err);
  }

  if (rejections.length) {
    return { graph, applied: false, events: [], violations: [], rejections };
  }

  // Append events before validating, so the audit trail is part of what is checked.
  let seq = next.events.length ? next.events[next.events.length - 1].seq : 0;
  const minted: CanonEvent[] = patch.events.map(e => ({
    ...e,
    id: mintId<EventId>('Project', `EVT_${++seq}`),
    seq,
  }));
  next.events = [...next.events, ...minted];

  const violations = checkInvariants(next);
  if (violations.length) {
    // Transactional: reject the whole patch rather than persist a graph that
    // breaks an ownership boundary.
    return { graph, applied: false, events: [], violations, rejections };
  }

  return { graph: next, applied: true, events: minted, violations: [], rejections: [] };
};

const applyOp = (g: ProjectGraph, op: GraphOp): string | null => {
  switch (op.op) {
    case 'create': {
      const coll = collectionFor(g, op.kind);
      if (!coll) return `create: unsupported kind ${op.kind}`;
      if (op.id in coll) return `create: ${op.id} already exists`;
      coll[op.id] = op.value as Record<string, unknown>;
      return null;
    }
    case 'update': {
      const touched = CANON_GATED_FIELDS.filter(f => f in op.fields);
      if (touched.length) {
        return `update: ${op.id} attempted to set ${touched.join(', ')} directly — use the 'approve' or 'lock' op`;
      }
      if (op.kind === 'Project') {
        Object.assign(g.project, op.fields);
        return null;
      }
      const coll = collectionFor(g, op.kind);
      if (!coll) return `update: unsupported kind ${op.kind}`;
      if (!(op.id in coll)) return `update: ${op.id} does not exist`;
      Object.assign(coll[op.id], op.fields);
      return null;
    }
    case 'approve': {
      const coll = collectionFor(g, op.kind);
      if (!coll) return `approve: unsupported kind ${op.kind}`;
      if (!(op.id in coll)) return `approve: ${op.id} does not exist`;
      Object.assign(coll[op.id], {
        approval: 'approved', approvedBy: op.approvedBy, approvedAt: op.approvedAt,
      });
      return null;
    }
    case 'lock': {
      const coll = collectionFor(g, op.kind);
      if (!coll) return `lock: unsupported kind ${op.kind}`;
      if (!(op.id in coll)) return `lock: ${op.id} does not exist`;
      Object.assign(coll[op.id], {
        canonStatus: 'locked', lockedBy: op.lockedBy, lockedAt: op.lockedAt,
      });
      return null;
    }
    case 'delete': {
      const coll = collectionFor(g, op.kind);
      if (!coll) return `delete: unsupported kind ${op.kind}`;
      if (!(op.id in coll)) return `delete: ${op.id} does not exist`;
      delete coll[op.id];
      return null;
    }
    // Link ops express membership that is stored as an array on the parent.
    case 'link':
    case 'unlink': {
      const parent = findAny(g, op.from);
      if (!parent) return `${op.op}: ${op.from} does not exist`;
      const arr = (parent as Record<string, unknown>)[op.as];
      if (!Array.isArray(arr)) return `${op.op}: ${op.from}.${op.as} is not a list`;
      if (op.op === 'link') {
        if (!arr.includes(op.to)) arr.push(op.to);
      } else {
        const i = arr.indexOf(op.to);
        if (i >= 0) arr.splice(i, 1);
      }
      return null;
    }
  }
};

const findAny = (g: ProjectGraph, id: string): unknown => {
  for (const kind of Object.keys(COLLECTION)) {
    const coll = collectionFor(g, kind);
    if (coll && id in coll) return coll[id];
  }
  return g.project.id === id ? g.project : null;
};
