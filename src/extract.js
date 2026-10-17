// Extraction: turns the live page into a sanitized article (HTML + metadata).
// Works on a clone so the page the user is reading is never modified.

import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import sites from './sites/index.js';

const LANG_ATTR = 'data-w2m-lang';

export function extract(doc, pageUrl) {
  const url = new URL(pageUrl);
  const site = sites.find((s) => safely(() => s.matches(doc, url), false));
  const clone = doc.cloneNode(true);

  if (site?.prepare) safely(() => site.prepare(clone, url));
  removeClutter(clone);
  resolveLazyImages(clone, url);
  normalizeCodeBlocks(clone);
  replaceEmbeds(clone, url);

  const article = new Readability(clone, { charThreshold: 200 }).parse();
  if (!article || !article.content) return null;

  const meta = readMetadata(doc);
  const siteMeta = site?.metadata ? safely(() => site.metadata(doc, url), {}) : {};

  return {
    title: clean(siteMeta.title || article.title || meta.title || doc.title || url.hostname),
    url: cleanUrl(meta.canonical || url.href, site),
    author: clean(siteMeta.author || meta.author || article.byline),
    published: formatDate(siteMeta.published || meta.published || article.publishedTime),
    siteName: clean(siteMeta.siteName || article.siteName || meta.siteName),
    html: sanitize(article.content, doc),
  };
}

function safely(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    console.log('web-to-markdown:', error);
    return fallback;
  }
}

function sanitize(html, doc) {
  const purify = DOMPurify(doc.defaultView || window);
  return purify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'button', 'input', 'select', 'textarea', 'svg', 'noscript'],
  });
}

// Readability already drops most navigation and sidebars. These catch what it
// tends to keep: inline ad slots and the byline/date line (reported in the
// document header instead).
const AD_TOKEN = /^(ads?|advert|advertisement|adsbygoogle|sponsored|ad-.+|ads-.+|.+-ads?)$/i;
const META_TOKEN = /^(byline|dateline|post-meta|entry-meta|article-meta|meta)$/i;

function removeClutter(root) {
  for (const el of root.querySelectorAll('[class], [id]')) {
    if (!el.isConnected || el === root.body || el.nodeName === 'HTML' || el.nodeName === 'BODY') continue;
    const tokens = `${el.getAttribute('class') || ''} ${el.id || ''}`.split(/\s+/).filter(Boolean);
    if (tokens.some((t) => AD_TOKEN.test(t))) {
      if (el.textContent.trim().length < 300) el.remove();
    } else if (tokens.some((t) => META_TOKEN.test(t))) {
      if (el.textContent.trim().length < 200 && !el.querySelector('h1, h2, pre, img')) el.remove();
    }
  }
  for (const el of root.querySelectorAll('[aria-label="advertisement" i], ins.adsbygoogle')) el.remove();
}

// Lazy-loading pages often leave <img src> empty or as a placeholder and keep
// the real URL in data-src, srcset, or a sibling <source>. Pick the best one.
function resolveLazyImages(root, base) {
  for (const img of root.querySelectorAll('img')) {
    const current = img.getAttribute('src') || '';
    const usable = current && !current.startsWith('data:') && !/placeholder|spacer|blank\.gif/i.test(current);
    if (usable) {
      img.setAttribute('src', absolute(current, base));
      continue;
    }
    const candidates = [
      img.getAttribute('data-src'),
      img.getAttribute('data-original'),
      img.getAttribute('data-lazy-src'),
      largestFromSrcset(img.getAttribute('srcset') || img.getAttribute('data-srcset')),
    ];
    const picture = img.closest('picture');
    if (picture) {
      for (const source of picture.querySelectorAll('source')) {
        candidates.push(largestFromSrcset(source.getAttribute('srcset') || source.getAttribute('data-srcset')));
      }
    }
    const found = candidates.find((c) => c && !c.startsWith('data:'));
    if (found) img.setAttribute('src', absolute(found, base));
  }
}

function largestFromSrcset(srcset) {
  if (!srcset) return null;
  let best = null;
  let bestSize = -1;
  for (const part of srcset.split(/,\s+/)) {
    const [candidate, descriptor = '1x'] = part.trim().split(/\s+/);
    const size = parseFloat(descriptor) || 1;
    if (candidate && size > bestSize) {
      best = candidate;
      bestSize = size;
    }
  }
  return best;
}

function absolute(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

// Syntax highlighters split code into spans, <br>s and per-line <div>s, and
// Readability may rewrite <br> runs. Flatten every <pre> to a single
// <pre><code> text node up front, remembering the language in an attribute
// that survives Readability's class stripping.
function normalizeCodeBlocks(root) {
  const doc = root.ownerDocument || root;
  // Line-number gutters rendered as separate cells or elements.
  for (const el of root.querySelectorAll('td, div, span')) {
    if (el.isConnected && GUTTER.test(el.getAttribute('class') || '')) el.remove();
  }
  // Layout tables that only exist to hold a code block (Pygments, Hugo, Jekyll).
  for (const table of root.querySelectorAll('table')) {
    const pres = table.querySelectorAll('pre');
    if (pres.length === 1 && table.textContent.trim() === pres[0].textContent.trim()) table.replaceWith(pres[0]);
  }
  for (const pre of root.querySelectorAll('pre')) {
    if (pre.parentElement?.closest('pre')) continue;
    const lang = detectLanguage(pre);
    const code = doc.createElement('code');
    code.textContent = codeText(pre).replace(/\n+$/, '');
    pre.replaceChildren(code);
    if (lang) pre.setAttribute(LANG_ATTR, lang);
  }
}

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'TR', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
// Line-number gutters that highlighters render as separate elements.
const GUTTER = /(^|\s)(line-numbers-rows|gutter|linenos|linenodiv|lineno|hljs-ln-numbers)(\s|$)/i;

function codeText(node) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      out += child.data;
    } else if (child.nodeType === 1) {
      if (child.nodeName === 'BR') {
        out += '\n';
        continue;
      }
      if (GUTTER.test(child.getAttribute('class') || '') || child.getAttribute('aria-hidden') === 'true') continue;
      out += codeText(child);
      if (BLOCK_TAGS.has(child.nodeName) && !out.endsWith('\n')) out += '\n';
    }
  }
  return out;
}

function detectLanguage(pre) {
  const nodes = [pre, ...pre.querySelectorAll('code, [data-code-block-lang]'), pre.parentElement].filter(Boolean);
  for (const node of nodes) {
    const explicit =
      node.getAttribute('data-lang') || node.getAttribute('data-language') || node.getAttribute('data-code-block-lang');
    if (explicit) return tidyLang(explicit);
    const match = (node.getAttribute('class') || '').match(/(?:^|\s)(?:language|lang|highlight-source|highlight)-([\w+#.-]+)/i);
    if (match) return tidyLang(match[1]);
  }
  return '';
}

function tidyLang(lang) {
  const value = lang.trim().toLowerCase();
  return /^[\w+#.-]{1,20}$/.test(value) && value !== 'none' && value !== 'plaintext' ? value : '';
}

// DOMPurify drops iframes; keep a link so embedded videos are not lost silently.
function replaceEmbeds(root, base) {
  const doc = root.ownerDocument || root;
  for (const frame of root.querySelectorAll('iframe[src]')) {
    const src = absolute(frame.getAttribute('src'), base);
    if (!/^https?:/.test(src)) continue;
    const p = doc.createElement('p');
    const a = doc.createElement('a');
    a.setAttribute('href', src);
    a.textContent = `Embedded content: ${src}`;
    p.appendChild(a);
    frame.replaceWith(p);
  }
}

function readMetadata(doc) {
  const metaContent = (selector) => doc.querySelector(selector)?.getAttribute('content') || '';
  const ld = readJsonLd(doc);
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  return {
    title: metaContent('meta[property="og:title"]') || ld.headline || '',
    author:
      ld.author ||
      metaContent('meta[name="author"]') ||
      metaContent('meta[property="article:author"]').replace(/^https?:\/\/\S+$/, '') ||
      doc.querySelector('[rel="author"]')?.textContent ||
      '',
    published:
      metaContent('meta[property="article:published_time"]') ||
      ld.datePublished ||
      metaContent('meta[name="date"]') ||
      metaContent('meta[itemprop="datePublished"]') ||
      doc.querySelector('article time[datetime], time[datetime]')?.getAttribute('datetime') ||
      '',
    siteName: metaContent('meta[property="og:site_name"]'),
    canonical: /^https?:/.test(canonical) ? canonical : '',
  };
}

function readJsonLd(doc) {
  const result = {};
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue;
    }
    const items = [].concat(data['@graph'] || data);
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      result.headline ||= typeof item.headline === 'string' ? item.headline : '';
      result.datePublished ||= typeof item.datePublished === 'string' ? item.datePublished : '';
      if (!result.author && item.author) {
        const names = [].concat(item.author).map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean);
        result.author = names.join(', ');
      }
    }
  }
  return result;
}

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function formatDate(value) {
  const text = clean(value);
  if (!text) return '';
  // ISO timestamps: keep the publisher's own calendar date.
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const TRACKING_PARAMS = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|igshid|ref_src)$/i;

function cleanUrl(href, site) {
  try {
    const url = new URL(href);
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key) || site?.dropParams?.includes(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.href;
  } catch {
    return href;
  }
}
