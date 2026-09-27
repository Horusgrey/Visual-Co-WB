import { buildScene06Graph } from './scene06.js';
import { checkInvariants, canReachFinalMaster } from '../vco/invariants.js';
import { computeRuntimeMs, runDeliveryChecks } from '../vco/delivery.js';

/**
 * Prints Scene 06's real delivery state. The studio-law deck quotes these
 * figures, so they are computed here rather than written by hand.
 */

const g = buildScene06Graph();

const violations = checkInvariants(g);
console.log(`graph invariants: ${violations.length === 0 ? 'clean' : 'VIOLATIONS'}`);
for (const v of violations) console.log(`  ${v.rule} — ${v.detail}`);

const runtime = computeRuntimeMs(g, g.project.boardId!);
const slots = Object.values(g.boardSlots);
const distinctShots = new Set(slots.map(s => s.shotId)).size;
const takeCount = Object.keys(g.takes).length;

console.log(`\nslots: ${slots.length}   distinct shots: ${distinctShots}   takes: ${takeCount}`);
console.log(`runtime: ${(runtime! / 1000).toFixed(1)}s of ${(g.project.deliverySpec!.targetRuntimeMs! / 1000).toFixed(1)}s target`);

const report = runDeliveryChecks(g);
g.project.deliveryReport = report;

console.log('\ndelivery checks');
for (const c of report.checks) {
  const mark = { pass: ' ok ', warn: 'warn', block: 'BLOCK', not_applicable: ' -- ' }[c.outcome];
  const cmp = c.expected !== undefined ? `  expected ${c.expected}, actual ${c.actual}` : '';
  console.log(`  [${mark}] ${c.label}${cmp}`);
  if (c.detail) console.log(`          ${c.detail}`);
}

const blockers = report.checks.filter(c => c.outcome === 'block');
console.log(`\ndeliverable: ${report.deliverable}   blockers: ${blockers.length}`);

const gate = canReachFinalMaster(g);
console.log(`can reach final master: ${gate.ok}`);
for (const r of gate.reasons) console.log(`  - ${r}`);
