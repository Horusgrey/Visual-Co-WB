import { runSelfCheck } from './selfcheck.js';

const { pass, results } = runSelfCheck();
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && !r.pass ? `\n        → ${r.detail}` : ''}`);
}
console.log(`\n${results.filter(r => r.pass).length}/${results.length} checks passed`);
process.exit(pass ? 0 : 1);
