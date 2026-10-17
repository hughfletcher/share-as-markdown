// Builds everything in dist/:
//   web-to-markdown.js               readable bundle defining window.WebToMarkdown (for review and tests)
//   shortcut-script.js               minified, self-contained script for "Run JavaScript on Web Page"
//   web-to-markdown-unsigned.shortcut Shortcut workflow (XML plist); sign on a Mac before importing
//
// Usage: node scripts/build.mjs

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildShortcut, toPlist } from './shortcut.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const banner = `/*! Web to Markdown ${pkg.version} | MIT | ${pkg.homepage}
 * Bundles Mozilla Readability (Apache-2.0), DOMPurify (Apache-2.0 / MPL-2.0),
 * Turndown and turndown-plugin-gfm (MIT). See THIRD_PARTY_NOTICES.md. */`;

const common = {
  entryPoints: [join(root, 'src/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'WebToMarkdown',
  platform: 'browser',
  target: ['safari15'],
  charset: 'ascii',
  legalComments: 'eof',
  define: { __VERSION__: JSON.stringify(pkg.version) },
  write: false,
  logLevel: 'warning',
};

const readable = await build({ ...common, banner: { js: banner } });
writeFileSync(join(dist, 'web-to-markdown.js'), readable.outputFiles[0].text);

// The minified bundle and the completion() wrapper are wrapped in one function
// so nothing leaks into the page's global scope.
const minified = await build({ ...common, minify: true });
const runner = readFileSync(join(root, 'shortcut/run.js'), 'utf8')
  .split('\n')
  .filter((line) => !line.startsWith('//'))
  .join('\n');
const shortcutScript = `${banner}\n(function () {\n${minified.outputFiles[0].text.trim()}\n${runner.trim()}\n})();\n`;
writeFileSync(join(dist, 'shortcut-script.js'), shortcutScript);

const workflow = buildShortcut({ script: shortcutScript });
writeFileSync(join(dist, 'web-to-markdown-unsigned.shortcut'), toPlist(workflow));

const kb = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`;
console.log(`dist/web-to-markdown.js      ${kb(readable.outputFiles[0].text)}`);
console.log(`dist/shortcut-script.js      ${kb(shortcutScript)}`);
console.log('dist/web-to-markdown-unsigned.shortcut');
