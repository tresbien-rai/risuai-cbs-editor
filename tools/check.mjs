#!/usr/bin/env node
// Checks the editor's CBS engine without a browser: runs the CBS-CORE region of index.html
// in Node, then compares outputs for (1) cases pinned to RisuAI's behaviour and (2) every
// CBS Reference example that states a literal output (examples marked approx are skipped).
// Run it after tools/sync-risu.mjs; a non-zero exit means behaviour or docs drifted.
//
//   node tools/check.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const html = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'index.html'), 'utf8');
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker missing: ' + a); return html.slice(i, j); };
const core = between('// ==== CBS-CORE BEGIN', '// ==== CBS-CORE END ====');
const ref = between('const REF_DATA = [', '\n];') + '\n];';

// RisuAI's call:: code logs with console.log; keep the report readable
const ctx = vm.createContext({ console: { ...console, log() {} }, structuredClone, window: { innerWidth: 1280, innerHeight: 800 } });
vm.runInContext(core + '\n' + ref + '\nthis.createCBSParser = createCBSParser; this.REF_DATA = REF_DATA;', ctx);

const run = (code, cfg = {}) => ctx.createCBSParser({ charName: 'CharacterName', userName: 'UserName', rngSeed: 1, ...cfg }).parse(code);

// Behaviour pinned to RisuAI (verified against its parser.svelte.ts / cbs.ts)
const CASES = [
  ['{{char}} & {{user}}', 'CharacterName & UserName'],
  ['{{getvar::never_set}}', 'null'],
  ['{{getvar::hp}}', '5', { variables: { hp: '5' } }],
  ['{{getglobalvar::toggle_t}}', '1', { variables: { toggle_t: '1' } }],
  ['{{#when::toggle::t}}on{{:else}}off{{/when}}', 'off', { variables: { toggle_t: '0' } }],
  ['{{#when::toggle::t}}\non\n{{:else}}\noff\n{{/when}}', 'on', { variables: { toggle_t: '1' } }],
  ['{{#if 1}}x{{:else}}y{{/if}}', 'x{{:else}}y'],
  ['{{setvar::a::1}}', '{{setvar::a::1}}'],
  ['{{settempvar::a::3}}{{tempvar::a}}', '3'],
  ['{{? 2+3*4}} {{? $hp*2}}', '14 10', { variables: { hp: '5' } }],
  ['{{dice::20}}', 'NaN'],
  ['{{range::[5]}}', '["0","1","2","3","4"]'],
  ['{{range::1::5::1}}', '["0"]'],
  ['{{spread::["a","b"]}}', 'a::b'],
  ['{{join::["a","b"]}}', 'a,b'],
  ['{{br::3}}|', '\n|'],
  ['a{{cbr}}b', 'a\\nb'],
  ['{{not::true}} {{and::1::true}} {{all::["1","1"]}} {{all::[1,1]}}', '1 0 1 0'],
  ['{{min::abc::5}} {{max::[3,9]}}', '0 9'],
  ['{{arrayelement::["a","b"]::-1}} {{arrayelement::["a"]::5}}', 'b null'],
  ['{{lowercase::A}}', '{{lowercase::A}}'],
  ['{{bo}}x{{bc}}', '{{x}}'],
  ['{{#escape}}{{char}}(x){{/escape}}', '{{char}}(x)'],
  ['{{#each {{makearray::a::b}} as x}}[{{slot::x}}]{{/each}}', '[a][b]'],
  ['{{#func f}}{{call::g::{{arg::1}}}}{{/func}}{{#func g}}<{{arg::1}}>{{/func}}{{call::f::Q}}', '<Q>'],
  ['A{{//::x}}{{comment::y}}B', 'A{{//::x}}B'],
  ['{{hiddenkey::k}}|', '|'],
  ['{{random::a,b,c}}', 'b'],  // seed 1
];

let fail = 0;
const check = (label, code, want, cfg) => {
  let got; try { got = run(code, cfg); } catch (e) { got = 'THROW ' + e.message; }
  if (got !== want) { fail++; console.log(`FAIL ${label}\n  code: ${JSON.stringify(code)}\n  want: ${JSON.stringify(want)}\n  got:  ${JSON.stringify(got)}`); }
};
CASES.forEach(([code, want, cfg]) => check('case', code, want, cfg));
let n = 0;
for (const e of ctx.REF_DATA) for (const x of e.examples || []) if (x.out != null && !x.approx) { n++; check('reference ' + e.name, x.code, x.out); }
console.log(`${CASES.length} behaviour cases, ${n} reference examples: ${fail ? fail + ' failed' : 'all passed'}`);
process.exit(fail ? 1 : 0);
