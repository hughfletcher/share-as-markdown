// Converts a saved HTML file with the built bundle, the same way the Shortcut
// does in Safari. Useful for checking a page you saved from your phone.
//
// Usage: node scripts/convert.mjs page.html [source-url] > page.md

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const [file, url = 'https://example.com/'] = process.argv.slice(2);
if (!file) {
  console.error('Usage: node scripts/convert.mjs page.html [source-url]');
  process.exit(1);
}

const bundle = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../dist/web-to-markdown.js'), 'utf8');
const dom = new JSDOM(readFileSync(file, 'utf8'), { url, runScripts: 'outside-only' });
dom.window.eval(bundle);
const result = dom.window.WebToMarkdown.convert(dom.window.document, url);
console.error(`filename: ${result.filename}`);
process.stdout.write(result.markdown);
