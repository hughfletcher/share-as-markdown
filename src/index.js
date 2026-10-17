// Entry point. Bundled as an IIFE that defines window.WebToMarkdown, which the
// Shortcut's "Run JavaScript on Web Page" action calls (see shortcut/run.js).

import { extract } from './extract.js';
import { toMarkdown } from './convert.js';
import { buildDocument, buildFilename } from './document.js';

export function convert(doc = document, url = doc.location?.href, savedAt = new Date()) {
  const article = extract(doc, url);
  if (!article) {
    throw new Error('No readable article content was found on this page.');
  }
  const body = toMarkdown(article.html);
  return {
    title: article.title,
    url: article.url,
    filename: buildFilename(article.title),
    markdown: buildDocument(article, body, savedAt),
  };
}

export const version = __VERSION__;
