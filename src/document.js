// Assembles the final Markdown document and its filename.

export function buildDocument(article, body, savedAt = new Date()) {
  const lines = [`# ${article.title}`, ''];
  lines.push(`- **Source:** <${article.url}>`);
  if (article.author) lines.push(`- **Author:** ${article.author}`);
  if (article.published) lines.push(`- **Published:** ${article.published}`);
  if (article.siteName) lines.push(`- **Site:** ${article.siteName}`);
  lines.push(`- **Saved:** ${localDate(savedAt)}`);
  lines.push('', '---', '', stripLeadingTitle(body, article.title), '');
  return lines.join('\n');
}

function localDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Readability often keeps the article's own <h1>; avoid printing the title twice.
function stripLeadingTitle(body, title) {
  const match = body.match(/^#{1,2} (.+)\n+/);
  if (match && normalize(match[1]) === normalize(title)) return body.slice(match[0].length);
  return body;
}

function normalize(text) {
  return text.replace(/\\(.)/g, '$1').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function buildFilename(title) {
  let name = (title || '')
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  if (name.length > 80) name = name.slice(0, 80).replace(/\s+\S*$/, '').trim() || name.slice(0, 80);
  return `${name || 'Article'}.md`;
}
