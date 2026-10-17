// Runs the built bundles inside jsdom against the HTML fixtures.
// `npm test` rebuilds first; `npm run test:update` rewrites test/expected/*.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = readFileSync(join(root, 'dist/web-to-markdown.js'), 'utf8');
const shortcutScript = readFileSync(join(root, 'dist/shortcut-script.js'), 'utf8');
const SAVED_AT = new Date(2026, 0, 15);

function load(html, url) {
  return new JSDOM(html, { url, runScripts: 'outside-only' }).window;
}

function convertFixture(name, url) {
  const html = readFileSync(join(root, 'test/fixtures', `${name}.html`), 'utf8');
  const window = load(html, url);
  const before = window.document.documentElement.outerHTML;
  window.eval(bundle);
  const result = window.WebToMarkdown.convert(window.document, url, SAVED_AT);
  assert.equal(window.document.documentElement.outerHTML, before, 'the live page must not be modified');
  return result;
}

function checkSnapshot(name, markdown) {
  const file = join(root, 'test/expected', `${name}.md`);
  if (process.env.UPDATE_SNAPSHOTS) writeFileSync(file, markdown);
  assert.equal(markdown, readFileSync(file, 'utf8'), `${name}.md differs; run "npm run test:update" if the change is intended`);
}

test('ordinary article', () => {
  const r = convertFixture('ordinary-article', 'https://news.example.com/environment/tiny-forests?utm_source=twitter');
  checkSnapshot('ordinary-article', r.markdown);
  const md = r.markdown;

  assert.equal(r.filename, 'Why Cities Are Planting Tiny Forests.md');
  assert.match(md, /^# Why Cities Are Planting Tiny Forests\n/);
  assert.match(md, /- \*\*Source:\*\* <https:\/\/news\.example\.com\/environment\/tiny-forests>/);
  assert.match(md, /- \*\*Author:\*\* Priya Raman/);
  assert.match(md, /- \*\*Published:\*\* 2025-04-22/);
  assert.match(md, /^## How the method works$/m);
  assert.match(md, /^### Unanswered questions$/m);
  assert.match(md, /^1\. +Survey the remnants/m);
  assert.match(md, /^- +How well do the forests survive/m);
  assert.match(md, /^> “People assume you need acres/m);
  assert.match(md, /\[Akira Miyawaki\]\(https:\/\/en\.wikipedia\.org\/wiki\/Akira_Miyawaki\)/);
  assert.match(md, /!\[Volunteers planting saplings in a vacant lot\]\(https:\/\/news\.example\.com\/images\/tiny-forest\.jpg\)/);
  assert.match(md, /\| Insect species recorded \| 14 \| 41 \|/);

  for (const clutter of ['Accept all', 'Politics', 'ADVERTISEMENT', 'cheap flights', 'Related stories', 'newsletter', 'Comments (128)', 'All rights reserved', 'Share on X', 'Who pays for the water']) {
    assert.ok(!md.includes(clutter), `should not contain "${clutter}"`);
  }
  assert.equal(md.match(/Why Cities Are Planting Tiny Forests/g).length, 1, 'title appears once');
});

test('technical article with code blocks', () => {
  const r = convertFixture('technical-article', 'https://devnotes.example.dev/posts/debounce-vs-throttle');
  checkSnapshot('technical-article', r.markdown);
  const md = r.markdown;

  assert.equal(r.filename, 'Debouncing vs. Throttling in JavaScript.md');
  assert.match(md, /- \*\*Author:\*\* Sam Okafor/);
  assert.match(md, /- \*\*Published:\*\* 2024-11-03/);
  assert.match(md, /```javascript\nfunction debounce\(fn, delay = 250\) \{\n  let timer;\n/);
  assert.match(md, /input\.addEventListener\('input', debounce\(search, 300\)\);\n```/);
  assert.match(md, /```ts\nexport function throttle<T extends unknown\[\]>/);
  assert.ok(!/^1\n2\n3/m.test(md), 'line-number gutter removed');
  assert.ok(!md.includes('<table'), 'layout table around code removed');
  assert.match(md, /```bash\nnpm install lodash\.debounce lodash\.throttle\nnpm test -- --watch\n```/);
  assert.match(md, /````markdown\nUse triple backticks:\n\n```js\nconsole\.log\("hi"\);\n```\n````/);
  assert.match(md, /either a `debounce` or a `throttle` helper/);
  assert.match(md, /\| `throttle` \| At most once per _ms_ \| Scroll, resize, pointer move \|/);
  assert.match(md, /^ {4}- +Calling `debounce\(fn\)` inside a render loop/m, 'nested list indented');
  assert.match(md, /\[my post on requestAnimationFrame\]\(https:\/\/devnotes\.example\.dev\/posts\/raf\)/);
  assert.ok(!md.includes('On this page'), 'table of contents removed');
  assert.ok(!md.includes('6 min read'), 'meta line removed');
});

test('Medium article (signed-in DOM)', () => {
  const r = convertFixture(
    'medium-article',
    'https://medium.com/better-programming/building-a-tiny-search-engine-1a2b3c4d5e6f?source=rss----d0b105d10f0a---4&sk=abc'
  );
  checkSnapshot('medium-article', r.markdown);
  const md = r.markdown;

  assert.equal(r.filename, 'Building a Tiny Search Engine in 200 Lines of Python.md');
  assert.match(md, /- \*\*Source:\*\* <https:\/\/medium\.com\/better-programming\/building-a-tiny-search-engine-1a2b3c4d5e6f>/);
  assert.match(md, /- \*\*Author:\*\* Jordan Lee/);
  assert.match(md, /- \*\*Published:\*\* 2024-02-14/);
  assert.match(md, /- \*\*Site:\*\* Medium/);
  assert.match(md, /!\[Diagram of an inverted index mapping words to document IDs\]\(https:\/\/miro\.medium\.com\/v2\/resize:fit:1400\/format:webp\/1\*index-diagram\.png\)/);
  assert.match(md, /_An inverted index maps each term to the documents that contain it\._/);
  assert.match(md, /```python\nimport re\n\nSTOP_WORDS = \{"the", "and", "a", "of"\}\n\ndef tokenize\(text\):\n    words = /);
  assert.match(md, /^## Step 1: Tokenising text$/m);
  assert.match(md, /^1\. +Every document gets an integer ID\./m);
  assert.match(md, /^> An index is just a precomputed answer/m);
  assert.match(md, /\[Elasticsearch\]\(https:\/\/www\.elastic\.co\/elasticsearch\)/);
  assert.match(md, /Thanks for reading!/);

  for (const clutter of ['Member-only story', 'Follow', '7 min read', '1.2K', 'Listen', 'Sign in', 'Written by', 'More from', 'Recommended from Medium', 'Ten Habits', 'Search Engines', 'miro.medium.com/v2/resize:fill:88:88']) {
    assert.ok(!md.includes(clutter), `should not contain "${clutter}"`);
  }
});

test('Medium detection on a custom domain', () => {
  const html = readFileSync(join(root, 'test/fixtures/medium-article.html'), 'utf8');
  const window = load(html, 'https://blog.example.org/building-a-tiny-search-engine-1a2b3c4d5e6f');
  window.eval(bundle);
  const md = window.WebToMarkdown.convert(window.document, window.location.href, SAVED_AT).markdown;
  assert.ok(!md.includes('Recommended from Medium'));
  assert.match(md, /- \*\*Site:\*\* Medium/);
});

test('shortcut script calls completion() with filename and markdown', () => {
  const html = readFileSync(join(root, 'test/fixtures/ordinary-article.html'), 'utf8');
  const window = load(html, 'https://news.example.com/environment/tiny-forests');
  let output;
  window.completion = (value) => {
    output = value;
  };
  window.eval(shortcutScript);
  assert.equal(output.error, undefined);
  assert.equal(output.filename, 'Why Cities Are Planting Tiny Forests.md');
  assert.match(output.markdown, /^# Why Cities Are Planting Tiny Forests/);
  assert.equal(window.WebToMarkdown, undefined, 'no globals leak into the page');
});

test('shortcut script reports an error instead of throwing', () => {
  const window = load('<!DOCTYPE html><html><head><title>Empty</title></head><body></body></html>', 'https://example.com/');
  let output;
  window.completion = (value) => {
    output = value;
  };
  window.eval(shortcutScript);
  assert.match(output.error, /No readable article content/);
});

test('filenames are safe for Files, Telegram and AirDrop', () => {
  const window = load('<!DOCTYPE html><title>x</title>', 'https://example.com/');
  window.eval(bundle);
  const name = (title) => {
    const doc = window.document.implementation.createHTMLDocument(title);
    const paragraph = '<p>' + 'Plenty of readable article text goes here, sentence after sentence. '.repeat(12) + '</p>';
    doc.body.innerHTML = `<article><h1>${title}</h1>${paragraph}${paragraph}</article>`;
    return window.WebToMarkdown.convert(doc, 'https://example.com/a', SAVED_AT).filename;
  };
  assert.equal(name('A/B testing: what "works"?'), 'A B testing what works.md');
  assert.equal(name('Ünïcödé — 日本語のタイトル'), 'Ünïcödé — 日本語のタイトル.md');
  const long = name('Word '.repeat(40).trim());
  assert.ok(long.length <= 83 && long.endsWith('Word.md'), long);
});
