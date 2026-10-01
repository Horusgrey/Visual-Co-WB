/**
 * Branded ID types for the canonical ProjectGraph.
 *
 * BUILD LAW: engines reference canonical objects by ID, never by embedding
 * copies of them. Branding makes an accidental cross-wiring (passing a ShotId
 * where a SlotId belongs) a compile error rather than a silent data corruption
 * that only surfaces as continuity drift three stages downstream.
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type ProjectId = Brand<string, 'ProjectId'>;
export type WorldId = Brand<string, 'WorldId'>;
export type CharacterId = Brand<string, 'CharacterId'>;
export type RelationshipId = Brand<string, 'RelationshipId'>;
export type ScriptId = Brand<string, 'ScriptId'>;
export type SceneId = Brand<string, 'SceneId'>;
export type PlaceId = Brand<string, 'PlaceId'>;
export type PropId = Brand<string, 'PropId'>;
export type CostumeId = Brand<string, 'CostumeId'>;
export type AssetId = Brand<string, 'AssetId'>;
export type ShotId = Brand<string, 'ShotId'>;
export type PlateId = Brand<string, 'PlateId'>;
export type BoardId = Brand<string, 'BoardId'>;
export type BoardSceneId = Brand<string, 'BoardSceneId'>;
export type BoardSlotId = Brand<string, 'BoardSlotId'>;
export type TakeId = Brand<string, 'TakeId'>;
export type ContinuityStateId = Brand<string, 'ContinuityStateId'>;
export type VisualPackageId = Brand<string, 'VisualPackageId'>;
export type EventId = Brand<string, 'EventId'>;
export type ScoutCaptureId = Brand<string, 'ScoutCaptureId'>;
/** Project-wide camera-grammar lock. See projectGraph.ts's `Lens`. */
export type LensId = Brand<string, 'LensId'>;
export type DeliverySpecId = Brand<string, 'DeliverySpecId'>;
/**
 * The stored analysis artifact (risks, next-shot constraints, open
 * questions), as distinct from `ContinuityStateId`, which points at one
 * before/after snapshot. A Report references two States, not the other way
 * around.
 */
export type ContinuityReportId = Brand<string, 'ContinuityReportId'>;

/** Any canonical object id, for provenance and event targeting. */
export type AnyId =
  | ProjectId | WorldId | CharacterId | RelationshipId | ScriptId | SceneId
  | PlaceId | PropId | CostumeId | AssetId | ShotId | PlateId | BoardId
  | BoardSceneId | BoardSlotId | TakeId | ContinuityStateId | VisualPackageId
  | EventId | ScoutCaptureId | LensId | DeliverySpecId | ContinuityReportId;

export type ObjectKind =
  | 'Project' | 'World' | 'Character' | 'Relationship' | 'Script' | 'Scene'
  | 'Place' | 'Prop' | 'Costume' | 'Asset' | 'Shot' | 'Plate' | 'Board'
  | 'BoardScene' | 'BoardSlot' | 'Take' | 'ContinuityState' | 'VisualPackage'
  | 'ScoutCapture' | 'DeliverySpec' | 'Lens' | 'ContinuityReport';

/** Prefix convention keeps raw IDs human-readable in logs and diffs. */
export const ID_PREFIX: Record<ObjectKind, string> = {
  Project: 'PRJ', World: 'WLD', Character: 'CHAR', Relationship: 'REL',
  Script: 'SCRPT', Scene: 'SCN', Place: 'PLACE', Prop: 'PROP',
  Costume: 'COST', Asset: 'AST', Shot: 'SHOT', Plate: 'PLATE',
  Board: 'BOARD', BoardScene: 'BSCN', BoardSlot: 'SLOT', Take: 'TAKE',
  ContinuityState: 'CONT', VisualPackage: 'VPKG', ScoutCapture: 'SCOUT',
  DeliverySpec: 'DLV', Lens: 'LENS', ContinuityReport: 'CRPT',
};

export const mintId = <T extends string>(kind: ObjectKind, slug?: string): T => {
  const suffix = slug
    ? slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${ID_PREFIX[kind]}/${suffix}` as T;
};

export const idKind = (id: string): ObjectKind | null => {
  const prefix = id.split('/')[0];
  const hit = Object.entries(ID_PREFIX).find(([, p]) => p === prefix);
  return hit ? (hit[0] as ObjectKind) : null;
};
