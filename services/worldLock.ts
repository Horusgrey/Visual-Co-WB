
import type { WorldBible } from '../types';

// Imagen takes a single positive prompt string — there is no negative-prompt
// parameter — so forbidden-drift rules must be restated as explicit
// constraints inside the prompt itself.
const asPositiveConstraint = (negative: string): string => {
  const cleaned = negative
    .split(/[,.;\n]+/)
    .map(s => s.trim().replace(/^no\s+/i, ''))
    .filter(Boolean);
  if (!cleaned.length) return '';
  return `strictly exclude: ${cleaned.join(', ')}`;
};

/**
 * Injects the project's world locks into an image-generation prompt so every
 * render obeys the production bible without the user re-typing the rules.
 *
 * `kind` controls scope: 'scene' applies location rules; 'character' omits
 * them so portraits are not polluted with set-dressing requirements.
 */
export const applyWorldLock = (
  prompt: string,
  world: WorldBible | null | undefined,
  kind: 'scene' | 'character' = 'scene'
): string => {
  if (!world || world.locked === false) return prompt;

  // Bible values usually already end in a period; trim so the join does not
  // produce doubled punctuation, which reads as noise to the image model.
  const seg = (s: string) => s.trim().replace(/[.\s]+$/, '');

  const parts: string[] = [seg(prompt)];
  if (world.visual_style) parts.push(`Visual style lock: ${seg(world.visual_style)}`);
  if (world.aesthetic_locks) parts.push(`Aesthetic locks: ${seg(world.aesthetic_locks)}`);
  if (kind === 'scene' && world.location_rules) parts.push(`Location rules: ${seg(world.location_rules)}`);
  if (world.time_period) parts.push(`Period: ${seg(world.time_period)}`);
  if (world.tone) parts.push(`Tone: ${seg(world.tone)}`);

  if (world.negative_prompt) {
    const constraint = asPositiveConstraint(world.negative_prompt);
    if (constraint) parts.push(seg(constraint));
  }

  return parts.filter(Boolean).join('. ') + '.';
};

export const isWorldLockActive = (world: WorldBible | null | undefined): boolean =>
  !!world &&
  world.locked !== false &&
  !!(world.visual_style || world.aesthetic_locks || world.location_rules || world.tone || world.negative_prompt);
