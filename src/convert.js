// Conversion: sanitized article HTML -> Markdown body.

import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export function toMarkdown(html) {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });
  turndown.use(gfm);
  turndown.remove(['script', 'style', 'noscript']);

  // Rules added later take precedence over gfm's and Turndown's defaults.
  turndown.addRule('codeBlock', {
    filter: (node) => node.nodeName === 'PRE',
    replacement: (_content, node) => {
      const code = node.textContent.replace(/\n+$/, '');
      const lang = node.getAttribute('data-w2m-lang') || '';
      const longestRun = Math.max(2, ...(code.match(/`+/g) || []).map((run) => run.length));
      const fence = '`'.repeat(longestRun + 1);
      return `\n\n${fence}${lang}\n${code}\n${fence}\n\n`;
    },
  });

  turndown.addRule('image', {
    filter: 'img',
    replacement: (_content, node) => {
      const src = node.getAttribute('src') || '';
      if (!/^https?:/i.test(src)) return '';
      const alt = (node.getAttribute('alt') || '').replace(/\s+/g, ' ').replace(/[[\]]/g, '\\$&').trim();
      return `![${alt}](${escapeUrl(src)})`;
    },
  });

  turndown.addRule('link', {
    filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
    replacement: (content, node) => {
      const href = node.getAttribute('href');
      const text = content.trim();
      if (!/^(https?:|mailto:)/i.test(href)) return content;
      if (!text) return '';
      return `[${text}](${escapeUrl(href)})`;
    },
  });

  turndown.addRule('figcaption', {
    filter: 'figcaption',
    replacement: (content) => (content.trim() ? `\n\n_${content.trim()}_\n\n` : ''),
  });

  // Turndown re-copies its accumulated output at every join, which is
  // quadratic on very long articles. Converting runs of top-level blocks
  // separately keeps it linear; the joins fall between block elements only.
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  const parts = chunk(root).map((part) => turndown.turndown(part).trim());
  return tidy(parts.filter(Boolean).join('\n\n'));
}

const CHUNK_SIZE = 40;
const WRAPPERS = new Set(['BODY', 'DIV', 'SECTION', 'ARTICLE', 'MAIN']);
const BLOCKS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'NAV',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'DL', 'PRE', 'BLOCKQUOTE',
  'TABLE', 'FIGURE', 'HR', 'DETAILS', 'ADDRESS',
]);

function chunk(root) {
  let container = root;
  while (container.children.length === 1 && WRAPPERS.has(container.firstElementChild.nodeName) && !hasText(container)) {
    container = container.firstElementChild;
  }
  const doc = container.ownerDocument;
  const groups = [];
  let current = doc.createElement('div');
  let count = 0;
  let lastWasBlock = true;
  for (const node of [...container.childNodes]) {
    const whitespace = node.nodeType === 3 && !node.data.trim();
    const block = node.nodeType === 1 && BLOCKS.has(node.nodeName);
    if (block && lastWasBlock && count >= CHUNK_SIZE) {
      groups.push(current);
      current = doc.createElement('div');
      count = 0;
    }
    current.appendChild(node);
    if (!whitespace) {
      count += 1;
      lastWasBlock = block;
    }
  }
  groups.push(current);
  return groups;
}

function hasText(element) {
  return [...element.childNodes].some((n) => n.nodeType === 3 && n.data.trim());
}

function escapeUrl(url) {
  return url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function tidy(markdown) {
  return markdown
    .replace(/ /g, ' ')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
