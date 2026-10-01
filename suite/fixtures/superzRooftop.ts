import { mintId } from '../schema/ids.js';
import type { AssetId, BoardId, PlaceId, ProjectId } from '../schema/ids.js';
import type { ProjectGraph } from '../schema/projectGraph.js';
import type { VcsBeatInput } from '../engines/vcs15BeatIngest.js';

/**
 * The 8 beats from `VCS_Frameboard_1000068454-3.html`, verbatim — an actual
 * SUPERZ clip analysis, not synthetic data. Used to exercise the VCS-15
 * ingest engine and the Board reverse-ingestion step end to end.
 *
 * `continuityBoundary` is set only where the source's own descriptions state
 * a real break — beat 4 ("Rooftop is effectively replaced by the radial
 * vortex") and beat 7 ("identity/costume state changes from rooftop man").
 * Beat 8 is the stable ending state the source file itself calls "the
 * canonical next-shot handoff," not a boundary in the same sense.
 */
export const SUPERZ_BEATS: Omit<VcsBeatInput, 'frame'>[] = [
  { n: 1, label: 'START', atMs: 0, title: 'Rooftop Establish',
    description: 'Long-haired bearded male established on rooftop at dusk; city skyline and cool urban palette locked.',
    fx: 'Stillness before movement; controlled expression; ambient rooftop motion only.' },
  { n: 2, label: 'SEQUENCE', atMs: 1590, title: 'Prop / Performance Beat',
    description: 'Right-hand packaged object is clearly visible while left hand opens into the performance gesture.',
    fx: 'Small hand articulation; object remains in right hand; shoulders stay forward.' },
  { n: 3, label: 'SEQUENCE', atMs: 3170, title: 'Reality Break',
    description: 'Camera closes on subject as the first strong horizontal energy streak and background deformation enter.',
    fx: 'Forward urgency increases; background motion begins to outrun the rooftop reality.' },
  { n: 4, label: 'SEQUENCE', atMs: 4760, title: 'Vortex Takeover',
    description: 'Rooftop is effectively replaced by the radial red/green/blue vortex; subject shifts laterally across frame.',
    fx: 'Warped background velocity; hair and coat retain motion while environment becomes graphic.',
    continuityBoundary: true },
  { n: 5, label: 'SEQUENCE', atMs: 5810, title: 'Title Entry',
    description: 'Large distressed red SUPERZ typography begins taking control of the composition over the vortex.',
    fx: 'White horizontal energy band remains the primary motion anchor behind the title.' },
  { n: 6, label: 'SEQUENCE', atMs: 6870, title: 'Title Lock',
    description: 'SUPERZ title is fully readable and dominant; original rooftop character is no longer the visual anchor.',
    fx: 'Graphic hold; vortex continues radial motion behind the locked wordmark.' },
  { n: 7, label: 'SEQUENCE', atMs: 8460, title: 'Hero Reveal',
    description: 'Blue-suited red-caped superhero emerges into the radial space; identity/costume state changes from rooftop man.',
    fx: 'Cape spreads behind body; forward reveal energy; chest emblem and belt become continuity-critical.',
    continuityBoundary: true },
  { n: 8, label: 'END', atMs: 9510, title: 'Canonical Ending State',
    description: 'Short-haired superhero stands centered and frontal against dark radial background, establishing the next-shot handoff.',
    fx: 'Near-still heroic hold; subtle breathing; cape settling; eyes forward; no further morph.' },
];

export const PRJ = mintId<ProjectId>('Project', 'SUPERZ_OPTICS');
export const SOURCE_VIDEO = mintId<AssetId>('Asset', 'VID_1000068454');
export const ROOFTOP_PLACE = mintId<PlaceId>('Place', 'ROOFTOP');
export const BOARD = mintId<BoardId>('Board', 'MAIN');

/** Frame assets, one per beat, plus the empty graph they'll be ingested into. */
export const buildIngestFixture = (): { graph: ProjectGraph; beats: VcsBeatInput[] } => {
  const frameAssets: Record<number, AssetId> = {};
  const assets: ProjectGraph['assets'] = {
    [SOURCE_VIDEO]: {
      id: SOURCE_VIDEO, kind: 'video', uri: 'vault://superz/1000068454.mp4',
      mimeType: 'video/mp4', durationMs: 10000,
      provenance: { engine: 'HUMAN', sourceRefs: [], createdAt: '2026-09-30T00:00:00.000Z' },
    },
  };
  for (const beat of SUPERZ_BEATS) {
    const frameId = mintId<AssetId>('Asset', `FRAME_${beat.n}`);
    frameAssets[beat.n] = frameId;
    assets[frameId] = {
      id: frameId, kind: 'keyframe', uri: `vault://superz/frames/${beat.n}.jpg`,
      mimeType: 'image/jpeg', extractedFrom: SOURCE_VIDEO, timecodeMs: beat.atMs,
      provenance: { engine: 'FRAMEFORGE', sourceRefs: [SOURCE_VIDEO], createdAt: '2026-09-30T00:00:00.000Z' },
    };
  }

  const beats: VcsBeatInput[] = SUPERZ_BEATS.map(b => ({ ...b, frame: frameAssets[b.n] }));

  const graph: ProjectGraph = {
    schemaVersion: '1.0',
    project: { id: PRJ, title: 'SUPERZ — Optics', stage: 'production' },
    worlds: {}, lenses: {}, characters: {}, relationships: {}, costumes: {},
    props: {}, places: {
      [ROOFTOP_PLACE]: { id: ROOFTOP_PLACE, projectId: PRJ, name: 'Rooftop', scoutCaptures: [], visualPackages: [], plateBackgrounds: [] },
    },
    visualPackages: {}, scripts: {}, scenes: {}, plates: {}, shots: {}, takes: {},
    boards: {
      [BOARD]: { id: BOARD, projectId: PRJ, name: 'Main cut', fps: 24, scenes: [], cutSchema: 'cut.json.v1' },
    },
    boardScenes: {}, boardSlots: {},
    continuityStates: {}, continuityReports: {}, scoutCaptures: {}, deliverySpecs: {},
    assets, events: [],
  };

  return { graph, beats };
};
