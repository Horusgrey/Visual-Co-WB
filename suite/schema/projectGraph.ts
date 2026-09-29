import type {
  AssetId, BoardId, BoardSceneId, BoardSlotId, CharacterId, ContinuityStateId,
  CostumeId, PlaceId, PlateId, ProjectId, PropId, RelationshipId, SceneId,
  ScoutCaptureId, ScriptId, ShotId, TakeId, VisualPackageId, WorldId,
} from './ids.js';
import type {
  CanonEvent, Confidence, Evidence, Provenance,
} from './provenance.js';

/**
 * THE canonical ProjectGraph for Hollywood by HG.
 *
 * One schema, one writer (VCO). Every engine reads this and returns patches.
 * If you are tempted to add a second shape for "your" engine's data, that is
 * the BUILD LAW violation this file exists to prevent.
 */

// ─── SHARED ──────────────────────────────────────────────────────────────────

/** Anything approvable moves candidate → approved. Only humans approve. */
export type ApprovalState = 'candidate' | 'approved' | 'rejected' | 'superseded';

export interface Approvable {
  approval: ApprovalState;
  approvedBy?: string;
  approvedAt?: string;
  provenance: Provenance;
}

export type AssetKind = 'image' | 'video' | 'audio' | 'document' | 'keyframe';

export interface Asset {
  id: AssetId;
  kind: AssetKind;
  /** Storage locator. The graph stores references, never bytes. */
  uri: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationMs?: number;
  /** Set for keyframes extracted from a video asset. */
  extractedFrom?: AssetId;
  timecodeMs?: number;
  provenance: Provenance;
}

// ─── WORLD & CANON ───────────────────────────────────────────────────────────

/**
 * The production bible. Supersedes the app-local `WorldBible` in types.ts,
 * which remains as the runtime shim until the migration in MIGRATION.md lands.
 */
export interface World {
  id: WorldId;
  projectId: ProjectId;
  tone?: string;
  visualStyle?: string;
  locationRules?: string;
  timePeriod?: string;
  context?: string;
  aestheticLocks?: string;
  /** Forbidden drift. Enforcement is per-provider and never guaranteed. */
  forbiddenDrift: string[];
  /** When false, locks are retained but not injected into generations. */
  locked: boolean;
}

export interface Relationship {
  id: RelationshipId;
  from: CharacterId;
  to: CharacterId;
  /** e.g. 'outranks', 'owes', 'benchmarks'. Directional. */
  kind: string;
  /** Inverted-power dynamics live here, not in prose. */
  powerDelta?: number;
  notes?: string;
}

export interface VoiceProfile {
  register?: string;
  volumeRule?: string;
  tactic?: string;
  /** Synthesis hints; provider-neutral. */
  pitch?: number;
  rate?: number;
}

export interface Character {
  id: CharacterId;
  projectId: ProjectId;
  name: string;
  role?: string;
  bio?: string;
  coreDrive?: string;
  emotionalPosture?: string;
  voice?: VoiceProfile;
  /** EDNA-owned approved visual packages for this character. */
  visualPackages: VisualPackageId[];
  defaultCostume?: CostumeId;
  /** Canon rules that must not change, e.g. 'no character growth'. */
  canonRules?: string[];
}

export interface Costume {
  id: CostumeId;
  characterId: CharacterId;
  name: string;
  version: string;
  costumeLocks: string[];
  appearanceLogic?: string;
  visualPackages: VisualPackageId[];
}

/**
 * `category` covers the deck's full EDNA canon list — "props, vehicles,
 * creatures" — as one generic subject rather than three near-duplicate
 * entities. That restraint is deliberate: CONFORMANCE.md Finding 1 is about
 * exactly this failure mode (near-identical shapes multiplying because a
 * new noun showed up in a spec). Vehicles and creatures need the same
 * fields as a Prop — a name, a description, continuity locks, a visual
 * package — so they get the same object with a tag, not a new one.
 */
export type PropCategory = 'prop' | 'vehicle' | 'creature' | 'set_dressing';

export interface Prop {
  id: PropId;
  projectId: ProjectId;
  name: string;
  category?: PropCategory; // defaults to 'prop' when absent
  description?: string;
  continuityLocks: string[];
  visualPackages: VisualPackageId[];
}

export interface Place {
  id: PlaceId;
  projectId: ProjectId;
  name: string;
  description?: string;
  /** Optional Scout evidence. Fictional places work with none. */
  scoutCaptures: ScoutCaptureId[];
  visualPackages: VisualPackageId[];
  /** Backgrounds Plate may load for this place. */
  plateBackgrounds: AssetId[];
}

// ─── EDNA: VISUAL CANON ──────────────────────────────────────────────────────

export type VisualView =
  | 'portrait' | 'front' | 'three_quarter_left' | 'three_quarter_right'
  | 'profile_left' | 'profile_right' | 'full_body' | 'rear'
  | 'expression' | 'costume_variant' | 'blocking_avatar';

/** Named invariants EDNA proposes and a human approves. */
export interface VisualInvariant {
  key: 'facial_identity' | 'hair' | 'proportions' | 'silhouette' | 'palette'
     | 'materials' | 'emblems' | 'wardrobe_detail';
  description: string;
}

/**
 * A reference set for one subject. EDNA generates reference-first, not
 * prose-first: a request names references, EDNA resolves them.
 */
export interface VisualPackage extends Approvable {
  id: VisualPackageId;
  subject:
    | { kind: 'character'; id: CharacterId; costume?: CostumeId }
    | { kind: 'place'; id: PlaceId }
    | { kind: 'prop'; id: PropId }
    | { kind: 'style' }
    /**
     * Multi-subject staging reference — the title slide's "ENSEMBLE /
     * REFERENCE" pillar, distinct from any single character's own canon.
     * Verifies things a solo portrait can't: relative scale, color harmony
     * and silhouette separation when two or more subjects share a frame.
     * It never substitutes for a subject's own VisualPackage — it only
     * proposes cross-subject invariants (e.g. "Lin's crimson must not read
     * as Thorne's obsidian pin under the same key light").
     */
    | { kind: 'ensemble'; characterIds: CharacterId[]; costumeIds?: CostumeId[] };
  views: Partial<Record<VisualView, AssetId[]>>;
  invariants: VisualInvariant[];
  /** Transparent/keyed avatar Plate can place directly as a sticker. */
  keyedAvatar?: AssetId;
  version: string;
}

/** EDNA drift review. Reports likelihood, never certainty. */
export interface DriftFinding {
  invariant: VisualInvariant['key'];
  observed: string;
  confidence: Confidence;
  evidence?: Evidence;
}

// ─── SCRIPT & SCENE ──────────────────────────────────────────────────────────

export interface DialogueLine {
  id: string;
  characterId: CharacterId;
  text: string;
  parenthetical?: string;
  /** FX Acoustics direction. Provider-neutral. */
  acoustics?: AcousticDirection;
  audioAsset?: AssetId;
}

export interface Script {
  id: ScriptId;
  projectId: ProjectId;
  /** Source text, Fountain or plain. The breakdown reads ranges from this. */
  body: string;
  version: string;
}

export interface SceneRequirements {
  cast: CharacterId[];
  costumes: CostumeId[];
  props: PropId[];
  place?: PlaceId;
}

export interface Scene {
  id: SceneId;
  projectId: ProjectId;
  scriptId?: ScriptId;
  slug: string; // e.g. 'INT. COUNCIL CHAMBER - NIGHT'
  synopsis?: string;
  /** Character offsets into Script.body this scene was derived from. */
  scriptRange?: [number, number];
  requirements: SceneRequirements;
  dialogue: DialogueLine[];
}

// ─── PLATE: THE FRAME ────────────────────────────────────────────────────────

export interface PlateLayer {
  /** What this layer depicts, resolved to canon. */
  subject:
    | { kind: 'character'; id: CharacterId; costume?: CostumeId }
    | { kind: 'prop'; id: PropId };
  /** The keyed avatar actually placed. */
  asset: AssetId;
  x: number; // 0..1 of frame width
  y: number; // 0..1 of frame height
  scale: number;
  rotation: number; // degrees
  flipH: boolean;
  z: number;
}

export interface CameraSetup {
  lensMm?: number;
  angle?: string; // e.g. 'low', 'eye', 'top-down'
  position?: string;
  crop?: { x: number; y: number; w: number; h: number };
}

/**
 * Plate owns the frame and nothing else.
 *
 * Deliberately absent: duration, audio, sequence order, Takes, motion prompts.
 * Those belong to BoardSlot / Shot / Model Compiler respectively.
 */
export interface Plate extends Approvable {
  id: PlateId;
  shotId: ShotId;
  placeId?: PlaceId;
  background: AssetId;
  layers: PlateLayer[];
  camera: CameraSetup;
  /** Literal user-directed sticker composition. */
  blockingComposite?: AssetId;
  /** Polished production frame rendered by EDNA from the blocking composite. */
  masterFrame?: AssetId;
}

// ─── FX & ACOUSTICS ──────────────────────────────────────────────────────────

/** Physical/nonverbal cue. Always bound to a Character ID. */
export interface FxCue {
  characterId: CharacterId;
  /** e.g. 'look_break', 'half_step_stop', 'shoulders_drop', 'no_comic_mug'. */
  cue: string;
  atMs?: number;
  note?: string;
}

/** Voice and acoustic direction. Provider-neutral by contract. */
export interface AcousticDirection {
  cadence?: string;
  pace?: string;
  pause?: string;
  overlap?: string;
  breath?: string;
  volume?: string;
  lineAttack?: string;
  distance?: string;
  roomInteraction?: string;
}

export interface AudioCue {
  kind: 'dialogue' | 'sfx' | 'music' | 'room';
  atMs: number;
  durationMs?: number;
  asset?: AssetId;
  /** Set for dialogue cues. */
  lineId?: string;
  description?: string;
}

// ─── SHOT & TAKES ────────────────────────────────────────────────────────────

/** Provider-neutral request. Adapters translate; they never invent canon. */
export interface GenerationRequest {
  intent: string;
  startFrame?: AssetId;
  endFrame?: AssetId;
  referenceAssets: AssetId[];
  durationMs?: number;
  camera?: CameraSetup;
  fxCues: FxCue[];
  continuityConstraints: string[];
  forbiddenDrift: string[];
  /** Stable hash of the above, carried onto every resulting Take. */
  requestHash: string;
}

export interface MotionSpec {
  description?: string;
  cameraMove?: string;
  subjectMotion?: string;
  /** Compiled lazily; the Model Compiler owns provider syntax. */
  lastRequest?: GenerationRequest;
}

export type TakeVerdict = 'unreviewed' | 'rejected' | 'maybe' | 'approved';

/**
 * A Take belongs to its Shot, never to a Slot. Reusing a Shot across several
 * Slots therefore shares one Take history instead of duplicating it.
 */
export interface Take {
  id: TakeId;
  shotId: ShotId;
  video: AssetId;
  keyFrame?: AssetId;
  endFrame?: AssetId;
  verdict: TakeVerdict;
  /** Ranges FrameForge marked usable, in ms from take start. */
  selectedRanges?: { startMs: number; endMs: number; note?: string }[];
  rejectedRanges?: { startMs: number; endMs: number; reason?: string }[];
  /** FrameForge's audio-extraction output — a separate Asset per stem/pass. */
  extractedAudio?: AssetId[];
  /** Free-form inspection notes, not tied to a specific range. */
  notes?: string;
  risks?: string[];
  request?: GenerationRequest;
  provenance: Provenance;
}

/** Shot owns photographed content. Slot owns when it happens. */
export interface Shot {
  id: ShotId;
  projectId: ProjectId;
  sceneId?: SceneId;
  intent: string;
  cast: CharacterId[];
  props: PropId[];
  placeId?: PlaceId;
  plateId?: PlateId;
  motion?: MotionSpec;
  takes: TakeId[];
}

// ─── BOARD: TIME ─────────────────────────────────────────────────────────────

export type SlotStatus =
  | 'blank' | 'plated' | 'audio_attached' | 'take_generated'
  | 'take_selected' | 'continuity_passed' | 'locked';

export type TransitionKind = 'cut' | 'dissolve' | 'fade_in' | 'fade_out' | 'wipe';

/**
 * BoardSlot owns time in the sequence.
 *
 * Deliberately absent: cast, props, Plate, Takes. Those are Shot's. A Slot
 * points at a Shot and selects one of that Shot's Takes.
 */
export interface BoardSlot {
  id: BoardSlotId;
  boardSceneId: BoardSceneId;
  index: number;
  startMs: number;
  durationMs: number;
  scriptExcerpt?: string;
  beat?: string;
  shotId?: ShotId;
  /** Which of the Shot's Takes appears at this point in the cut. */
  selectedTakeId?: TakeId;
  fxCues: FxCue[];
  audioCues: AudioCue[];
  transitionIn?: TransitionKind;
  transitionOut?: TransitionKind;
  continuityIn?: ContinuityStateId;
  continuityOut?: ContinuityStateId;
  status: SlotStatus;
}

export interface BoardScene {
  id: BoardSceneId;
  boardId: BoardId;
  sceneId?: SceneId;
  index: number;
  title: string;
  slots: BoardSlotId[];
}

/** The one canonical sequence system. cut.json has one writer and one schema. */
export interface Board {
  id: BoardId;
  projectId: ProjectId;
  name: string;
  fps: number;
  scenes: BoardSceneId[];
}

// ─── VCS-15: CONTINUITY ──────────────────────────────────────────────────────

export interface ContinuityState {
  id: ContinuityStateId;
  /** What the analysis was performed against. */
  subject: { shotId?: ShotId; takeId?: TakeId; slotId?: BoardSlotId };
  visibleCast: CharacterId[];
  costumes: CostumeId[];
  visibleProps: PropId[];
  positions?: Record<string, string>;
  screenDirection?: string;
  camera?: CameraSetup;
  lighting?: string;
  environment?: string;
  performanceState?: string;
  audioContinuity?: string;
  evidence: Evidence[];
  confidence: Confidence;
}

export type RiskSeverity = 'high' | 'medium' | 'low';

export interface RiskFlag {
  title: string;
  description: string;
  severity: RiskSeverity;
  /** What would fix it. */
  mitigation?: string;
  evidence?: Evidence;
}

export interface ContinuityReport {
  entering: ContinuityStateId;
  observedChanges: string[];
  ending: ContinuityStateId;
  risks: RiskFlag[];
  nextShotConstraints: string[];
  openQuestions: string[];
}

// ─── SCOUT ───────────────────────────────────────────────────────────────────

export interface ScoutCapture {
  id: ScoutCaptureId;
  placeId?: PlaceId;
  lat?: number;
  lon?: number;
  heading?: number;
  elevation?: number;
  tilt?: number;
  lensMm?: number;
  reference?: AssetId;
  evidence?: Evidence;
  provenance: Provenance;
}

// ─── DELIVERY / QC ───────────────────────────────────────────────────────────

export interface DeliverySpec {
  targetRuntimeMs?: number;
  runtimeToleranceMs?: number;
  aspectRatio?: string;
  resolution?: [number, number];
  fps?: number;
  loudnessLufs?: number;
  truePeakDb?: number;
  colorSpace?: string;
  codec?: string;
  audioLayout?: string;
  requiredStems?: string[];
  captions?: boolean;
  titles?: boolean;
  slate?: boolean;
}

export type CheckOutcome = 'pass' | 'warn' | 'block' | 'not_applicable';

export interface DeliveryCheck {
  id: string;
  label: string;
  outcome: CheckOutcome;
  /** Deterministic checks state expected vs actual; no LLM judgement. */
  expected?: string;
  actual?: string;
  detail?: string;
}

export interface DeliveryReport {
  checks: DeliveryCheck[];
  /** A project cannot reach Final Master while any blocker fails. */
  deliverable: boolean;
  evaluatedAt: string;
}

// ─── PROJECT ─────────────────────────────────────────────────────────────────

export type ProjectStage =
  | 'concept' | 'script' | 'breakdown' | 'visual_dev'
  | 'production' | 'assembly' | 'qc' | 'final_master';

export interface Project {
  id: ProjectId;
  title: string;
  logline?: string;
  stage: ProjectStage;
  worldId?: WorldId;
  /**
   * The Board that constitutes the cut. Delivery QC sums this Board's slot
   * durations to get runtime — without it the runtime check cannot be
   * computed, so a project with a DeliverySpec and no Board is not gradeable.
   */
  boardId?: BoardId;
  deliverySpec?: DeliverySpec;
  deliveryReport?: DeliveryReport;
}

/**
 * The whole graph. Normalised by ID: relationships are references, so an
 * object exists exactly once and no engine can fork a private copy.
 */
export interface ProjectGraph {
  schemaVersion: '1.0';
  project: Project;
  worlds: Record<string, World>;
  characters: Record<string, Character>;
  relationships: Record<string, Relationship>;
  costumes: Record<string, Costume>;
  props: Record<string, Prop>;
  places: Record<string, Place>;
  visualPackages: Record<string, VisualPackage>;
  scripts: Record<string, Script>;
  scenes: Record<string, Scene>;
  plates: Record<string, Plate>;
  shots: Record<string, Shot>;
  takes: Record<string, Take>;
  boards: Record<string, Board>;
  boardScenes: Record<string, BoardScene>;
  boardSlots: Record<string, BoardSlot>;
  continuityStates: Record<string, ContinuityState>;
  scoutCaptures: Record<string, ScoutCapture>;
  assets: Record<string, Asset>;
  /** Append-only. The audit trail of how canon became canon. */
  events: CanonEvent[];
}
