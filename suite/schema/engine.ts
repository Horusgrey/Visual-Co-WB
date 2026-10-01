import type { ProjectGraph } from './projectGraph.js';
import type { EnginePatch, EngineName } from './provenance.js';

/**
 * The contract every engine in the suite implements.
 *
 * An engine receives a read-only view of the graph and returns a patch.
 * It has no write access. This is the mechanical form of the BUILD LAW:
 * "No engine creates a second project database."
 */
export interface Engine<Request> {
  readonly name: EngineName;
  /**
   * `graph` is deeply readonly by contract. Returning a patch is the only way
   * to affect truth; mutating the argument is a bug, not a shortcut.
   */
  run(graph: Readonly<ProjectGraph>, request: Request): Promise<EnginePatch>;
}

/** Engines that may propose canon but never lock it. */
export const CANNOT_LOCK_CANON: EngineName[] = [
  'CINEMA', 'EDNA', 'PLATE', 'SCRIPT_TO_BOARD', 'BOARD', 'FRAMEFORGE',
  'VCS15', 'FX_ORCHESTRATOR', 'FX_ACOUSTICS', 'MODEL_COMPILER', 'SCOUT',
  'DELIVERY_QC',
];
