#!/usr/bin/env node
// Regenerates the bundled RisuAI CBS engine inside index.html from a RisuAI checkout.
//
//   git clone --depth 1 https://github.com/kwaroran/RisuAI.git /tmp/RisuAI
//   npm install --no-save typescript   (or have it installed globally)
//   node tools/sync-risu.mjs /tmp/RisuAI
//
// It copies selected top-level declarations (types stripped) from RisuAI's parser,
// CBS function registry and calculator into the block between the RISU-ENGINE markers.
// Everything those declarations import from the rest of RisuAI must be supplied by the
// editor's RisuHost object; the script lists them and fails if a new one appears, so a
// RisuAI change that adds a dependency is caught here instead of at runtime.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(execSync('npm root -g').toString().trim(), 'typescript')); }

const risuRoot = process.argv[2];
if (!risuRoot) { console.error('usage: node tools/sync-risu.mjs <RisuAI checkout>'); process.exit(1); }
const editorPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'index.html');

// file -> top-level declarations to copy, in dependency-friendly order
const PICK = [
  ['src/ts/model/types.ts', ['LLMFlags', 'LLMFormat']],
  ['src/ts/util.ts', ['sfc32', 'pickHashRand', 'parseKeyValue']],
  ['src/ts/process/infunctions.ts', ['toRPN', 'calculateRPN', 'executeRPNCalculation', 'calcString']],
  ['src/ts/parser/parser.svelte.ts', ['replacements', 'risuUnescape', 'risuEscape', 'matcherInitialized', 'matcherMap',
    'initMatcher', 'matcher', 'dateTimeFormat', 'legacyBlockMatcher', 'parseArray', 'parseDict', 'makeArray',
    'blockStartMatcher', 'trimLines', 'blockEndMatcher', 'risuChatParser']],
  ['src/ts/cbs.ts', ['registerCBS']],
];
// Supplied by the editor (RisuHost). Anything else the copied code needs is an error.
const HOST = ['get', 'DBState', 'selectedCharID', 'CurrentTriggerIdStore', 'getDatabase', 'getChatVar', 'setChatVar',
  'getGlobalChatVar', 'getPersonaPrompt', 'getUserName', 'findCharacterbyId', 'getModules', 'getModuleLorebooks',
  'getModelInfo', 'isTauri', 'isNodeServer', 'appVer', 'safeStructuredClone'];
const EXPORTS = ['risuChatParser', 'risuEscape', 'risuUnescape', 'calcString', 'parseArray', 'makeArray'];

// Drop registerFunction({... description: '...'}) text: it is documentation only and ~40% of cbs.ts.
const stripDescriptions = ctx => {
  const visit = node => {
    if (ts.isPropertyAssignment(node) && node.name.getText?.() === 'description' &&
        ts.isObjectLiteralExpression(node.parent) && ts.isCallExpression(node.parent.parent) &&
        node.parent.parent.expression.getText() === 'registerFunction') {
      return ts.factory.updatePropertyAssignment(node, node.name, ts.factory.createStringLiteral(''));
    }
    return ts.visitEachChild(node, visit, ctx);
  };
  return sf => ts.visitNode(sf, visit);
};

const declName = st => {
  if (ts.isFunctionDeclaration(st) || ts.isEnumDeclaration(st)) return [st.name.text];
  if (ts.isVariableStatement(st)) return st.declarationList.declarations.map(d => d.name.getText());
  return [];
};

let code = '';
const imported = new Set(), localNames = new Map();
for (const [rel, names] of PICK) {
  const src = readFileSync(path.join(risuRoot, rel), 'utf8');
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true);
  const byName = new Map();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const nb = st.importClause?.namedBindings;
      if (st.importClause?.name) imported.add(st.importClause.name.text);
      if (nb && ts.isNamedImports(nb)) nb.elements.forEach(e => { if (!e.isTypeOnly && !st.importClause.isTypeOnly) imported.add(e.name.text); });
      continue;
    }
    for (const n of declName(st)) { byName.set(n, st); localNames.set(n, rel); }
  }
  for (const n of names) {
    const st = byName.get(n);
    if (!st) throw new Error(`${rel}: declaration "${n}" not found (RisuAI changed; update PICK)`);
    const text = st.getText(sf).replace(/^export\s+/, '');
    code += `// ${rel}: ${n}\n${text}\n\n`;
  }
}

const picked = new Set(PICK.flatMap(p => p[1]));
const out = ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None, removeComments: false },
  transformers: { before: [stripDescriptions] },
}).outputText.replace(/^"use strict";\n/, '').replace(/^Object\.defineProperty\(exports.*\n/m, '');

// Free identifiers: names the copied code uses but neither declares nor gets from the host or
// the JS runtime (imports, same-file helpers, RisuAI-wide globals). Walk the AST so names in
// strings or used as property keys don't count. Not scope-exact, but any name declared
// nowhere in the bundle is reliably caught.
const refs = new Set(), declared = new Set();
const bind = n => { if (!n) return; if (ts.isIdentifier(n)) declared.add(n.text); else n.elements?.forEach(e => bind(e.name)); };
(function walk(node) {
  if (ts.isIdentifier(node)) {
    const p = node.parent;
    const isKey = (ts.isPropertyAccessExpression(p) && p.name === node) || (ts.isPropertyAssignment(p) && p.name === node) ||
      (ts.isMethodDeclaration(p) && p.name === node) || (ts.isBindingElement(p) && p.propertyName === node) ||
      (ts.isLabeledStatement(p) && p.label === node) || ((ts.isBreakStatement(p) || ts.isContinueStatement(p)) && p.label === node);
    if (!isKey) refs.add(node.text);
  }
  if (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) bind(node.name);
  if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isClassDeclaration(node)) && node.name) declared.add(node.name.text);
  ts.forEachChild(node, walk);
})(ts.createSourceFile('out.js', out, ts.ScriptTarget.Latest, true));
const used = n => refs.has(n);
const BROWSER = ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage'];
const missing = [...refs].filter(n => !declared.has(n) && !HOST.includes(n) && !BROWSER.includes(n) && !(n in globalThis) && n !== 'undefined');
if (missing.length) {
  console.error('Copied code references names that are not declared in it, not JS globals, and not provided by RisuHost:\n  ' + missing.join(', '));
  console.error('Add them to PICK (if they are pure helpers) or to HOST and implement them in index.html.');
  process.exit(1);
}

let sha = 'unknown';
try { sha = execSync('git rev-parse HEAD', { cwd: risuRoot }).toString().trim(); } catch {}
const block = `// ==== RISU-ENGINE BEGIN (generated by tools/sync-risu.mjs; do not edit by hand) ====
// Source: RisuAI by Kwaroran, https://github.com/kwaroran/RisuAI (GPL-3.0), commit ${sha}
const RisuEngine = (function (RisuHost) {
const { ${HOST.join(', ')} } = RisuHost;
${out.trim()}
return { ${EXPORTS.join(', ')} };
})(RisuHost);
// ==== RISU-ENGINE END ====`;

const html = readFileSync(editorPath, 'utf8');
const re = /\/\/ ==== RISU-ENGINE BEGIN[\s\S]*?\/\/ ==== RISU-ENGINE END ====/;
if (!re.test(html)) { console.error('index.html has no RISU-ENGINE markers'); process.exit(1); }
writeFileSync(editorPath, html.replace(re, () => block));
console.log(`Synced RisuAI ${sha.slice(0, 10)}: ${block.split('\n').length} lines, host needs: ${HOST.filter(used).join(', ')}`);
