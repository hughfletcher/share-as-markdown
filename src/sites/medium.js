// Medium (medium.com, *.medium.com and custom-domain publications).
//
// Medium renders the full story into the DOM for readers who have access, so
// we only read what is already on the page. Surrounding chrome (claps, follow
// buttons, author card, "More from" / "Recommended" lists) is removed first.

const CLUTTER = [
  'nav',
  'footer',
  'aside',
  'button',
  '[role="tooltip"]',
  '[data-testid="headerClapButton"]',
  '[data-testid="footerClapButton"]',
  '[data-testid="authorPhoto"]',
  '[data-testid="publicationPhoto"]',
  '[data-testid="storyReadTime"]',
  '[data-testid="audioPlayButton"]',
  '[data-testid="headerSocialShareButton"]',
  '[data-testid="headerBookmarkButton"]',
  '[aria-label="responses"]',
  '[aria-label="Post Preview"]',
  '.speechify-ignore',
  'a[href*="/tag/"]',
];

const NOISE_TEXT = /^(follow|following|member-only story|listen|share|more|sign up|sign in|get unlimited access|open in app|\d+ min read|·)$/i;

export default {
  name: 'medium',
  dropParams: ['source', 'sk', 'gi'],

  matches(doc, url) {
    if (/(^|\.)medium\.com$/i.test(url.hostname)) return true;
    const meta = (name) => doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute('content') || '';
    return meta('al:android:package') === 'com.medium.reader' || meta('twitter:app:name:iphone') === 'Medium';
  },

  prepare(clone) {
    const article = clone.querySelector('article');
    if (article) clone.body.replaceChildren(article);

    for (const node of clone.querySelectorAll(CLUTTER.join(','))) node.remove();
    // Medium wraps story images in role="button" (tap to zoom); keep those.
    for (const node of clone.querySelectorAll('[role="button"]')) {
      if (!node.querySelector('img, picture')) node.remove();
    }

    // Author avatars and other tiny images.
    for (const img of clone.querySelectorAll('img')) {
      const width = parseInt(img.getAttribute('width') || '0', 10);
      if (!width || width >= 100) continue;
      const link = img.closest('a');
      (link && !link.textContent.trim() ? link : img).remove();
    }

    // Short UI labels that are not tied to a stable attribute.
    for (const node of clone.querySelectorAll('span, p, a, div')) {
      if (!node.isConnected || node.querySelector('img, pre')) continue;
      if (node.closest('[data-selectable-paragraph]')) continue;
      if (NOISE_TEXT.test(node.textContent.trim())) node.remove();
    }

    // Byline (author name, date) - reported separately in the document header.
    for (const node of clone.querySelectorAll('[data-testid="authorName"], [data-testid="storyPublishDate"]')) {
      node.remove();
    }
  },

  metadata(doc) {
    const text = (selector) => doc.querySelector(selector)?.textContent.replace(/\s+/g, ' ').trim() || '';
    return {
      title: text('[data-testid="storyTitle"]'),
      author: text('[data-testid="authorName"]'),
      siteName: 'Medium',
    };
  },
};
