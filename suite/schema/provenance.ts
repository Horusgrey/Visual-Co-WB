import type { AnyId, AssetId, EventId, ObjectKind } from './ids.js';

/**
 * Provenance and events.
 *
 * BUILD LAW: "All engines read/write the same canonical schema and return
 * patches/events rather than silently mutating truth." Nothing in the suite
 * writes the graph directly — an engine returns an EnginePatch, VCO applies
 * it and appends the resulting events.
 */

export type EngineName =
  | 'CINEMA' | 'VCO' | 'EDNA' | 'PLATE' | 'SCRIPT_TO_BOARD' | 'BOARD'
  | 'FRAMEFORGE' | 'VCS15' | 'FX_ORCHESTRATOR' | 'FX_ACOUSTICS'
  | 'MODEL_COMPILER' | 'SCOUT' | 'DELIVERY_QC' | 'HUMAN';

/** Who or what produced an artifact, and from exactly what inputs. */
export interface Provenance {
  engine: EngineName;
  /** Vendor identity. Models are replaceable vendors, never the record. */
  provider?: string;
  model?: string;
  settings?: Record<string, unknown>;
  /** Canonical objects this artifact was derived from. */
  sourceRefs: AnyId[];
  /** Hash of the compiled request, so an output can be traced to its input. */
  requestHash?: string;
  createdAt: string; // ISO 8601
  /** Set when a human made or confirmed the call. */
  actor?: string;
}

/**
 * Confidence is always explicit and may be absent.
 * VCS-15's rule — "NEVER fake confidence" — is enforced by making
 * `underdetermined` a first-class value rather than a low number.
 */
export type Confidence =
  | { status: 'confirmed'; value: number }
  | { status: 'inferred'; value: number }
  | { status: 'underdetermined'; note: string };

/**
 * Evidence grading, lifted from the GROKMAPz rollout-anchor pattern
 * (Evidence Grade A/B + named source). Applied here to continuity claims and
 * scout captures so a reviewer can tell a documented fact from a guess.
 */
export type EvidenceGrade = 'A' | 'B' | 'C';

export interface Evidence {
  grade: EvidenceGrade;
  /** Frame or asset that backs the claim. */
  frameRefs?: AssetId[];
  source: string;
  note?: string;
}

/** Append-only canon event. Never edited, never deleted. */
export interface CanonEvent {
  id: EventId;
  seq: number;
  at: string; // ISO 8601
  engine: EngineName;
  /** Verb phrase, e.g. 'take.selected', 'plate.approved', 'canon.locked'. */
  type: string;
  targetKind: ObjectKind;
  targetId: AnyId;
  summary: string;
  /** Objects whose derived state may now be stale. */
  invalidates?: AnyId[];
  provenance?: Provenance;
}

/** A single proposed mutation. */
export type GraphOp =
  | { op: 'create'; kind: ObjectKind; id: AnyId; value: unknown }
  | { op: 'update'; kind: ObjectKind; id: AnyId; fields: Record<string, unknown> }
  | { op: 'delete'; kind: ObjectKind; id: AnyId }
  | { op: 'link'; from: AnyId; to: AnyId; as: string }
  | { op: 'unlink'; from: AnyId; to: AnyId; as: string };

/**
 * What every engine returns instead of writing the graph.
 *
 * `locksCanon: true` is only ever honoured when the patch also carries a human
 * actor in its provenance — engines may propose canon, only humans lock it.
 */
export interface EnginePatch {
  engine: EngineName;
  ops: GraphOp[];
  events: Omit<CanonEvent, 'id' | 'seq'>[];
  locksCanon: boolean;
  /** Surfaced to the user rather than silently swallowed. */
  warnings?: string[];
  /** Things the engine genuinely could not determine. */
  openQuestions?: string[];
}
