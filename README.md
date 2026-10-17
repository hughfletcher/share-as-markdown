# Web to Markdown

An open-source Apple Shortcut that turns the article you're reading in Safari
into a clean Markdown (`.md`) file. It then hands that file to the native iOS
Share Sheet, so you can send it to Telegram, Files, Mail, AirDrop, Obsidian or
any other app that accepts files.

**Safari → Share → Web to Markdown → pick an app.**

- Runs entirely on your device. No API keys, accounts, servers or tracking.
- Reads the page exactly as Safari shows it. This includes articles you can
  only see because you're signed in, such as Medium member stories. It never
  re-downloads the page and never tries to get around paywalls.
- Keeps the title, source URL, author and publication date, along with
  headings, paragraphs, lists, links, blockquotes, code blocks, tables and
  images (as `![alt](url)` links).
- Drops navigation, ads, cookie banners, share bars, comments and "related" or
  "recommended" lists.
- The shortcut contains its whole script, so it never loads remote JavaScript.

> **Status:** the extraction and conversion code is covered by automated tests
> in a simulated browser (jsdom). **The shortcut itself has not yet been tested
> on a real iPhone or iPad.** Please use the
> [device test checklist](docs/device-testing.md) and report what you find.

## Example output

````markdown
# Building a Tiny Search Engine in 200 Lines of Python

- **Source:** <https://medium.com/better-programming/building-a-tiny-search-engine-1a2b3c4d5e6f>
- **Author:** Jordan Lee
- **Published:** 2024-02-14
- **Site:** Medium
- **Saved:** 2026-01-15

---

Full-text search feels like magic until you build one. …

## Step 1: Tokenising text

```python
import re
…
```
````

Saved as `Building a Tiny Search Engine in 200 Lines of Python.md`. See
[`test/expected/`](test/expected/) for complete examples.

## Installation

You need iOS/iPadOS 15 or later, or macOS 12 or later, with the Shortcuts app.

### Step 1: allow scripts (required, one time)

**Settings → Apps → Shortcuts → Advanced → Allow Running Scripts** → on
(on iOS 17 and earlier: **Settings → Shortcuts → Advanced**).

### Step 2: add the shortcut

Choose one of these:

**A. Build it by hand on your iPhone (no Mac needed, about 5 minutes).**
Follow [docs/manual-setup.md](docs/manual-setup.md). You paste the script
into a *Run JavaScript on Web Page* action and add six simple actions around
it.

**B. Import the `.shortcut` file (needs a Mac once).** iOS only imports
*signed* shortcut files, and only macOS can sign them. On a Mac:

```sh
git clone https://github.com/hughfletcher/share-as-markdown.git
cd share-as-markdown
shortcuts sign --mode anyone \
  --input dist/web-to-markdown-unsigned.shortcut \
  --output "Web to Markdown.shortcut"
```

Then open `Web to Markdown.shortcut` on the Mac, or AirDrop it to your
iPhone, and tap **Add Shortcut**. If `shortcuts sign` rejects the file,
convert it to a binary plist first with
`plutil -convert binary1 dist/web-to-markdown-unsigned.shortcut` and try
again. If it still fails, use option A. Once the shortcut is in your library,
you can also use *Share → Copy iCloud Link* to give others a one-tap install
link.

After installing, check that the shortcut's details have **Show in Share
Sheet** turned on, with **Safari web pages** as the input type.

## Usage

1. Open an article in Safari. Sign in first if the article needs it.
2. Tap **Share** → **Web to Markdown**. If you don't see it, scroll to the
   bottom of the Share Sheet, tap **Edit Actions…** and add it to your
   favourites.
3. The first time you use it on a website, iOS asks whether the shortcut may
   access that site. Tap **Allow**.
4. A second Share Sheet opens with `<Article title>.md`. Choose **Telegram**
   and pick a chat, or **Save to Files**, Mail, AirDrop, and so on.

If the page has no recognisable article, such as a home page or search
results, an alert explains that and nothing is shared.

## Medium

Medium was the main test case:

- Works on `medium.com`, `*.medium.com` and custom-domain Medium
  publications. These are detected from Medium's `<meta>` tags.
- Removes the member-only badge, avatar, Follow button, read time, clap,
  response, listen and share bars, tags, the "Written by" card, "More from…"
  and "Recommended from Medium".
- Image URLs are taken from Medium's `<picture>` `srcset`, at the largest
  size offered. The `?source=…` tracking parameters are removed from the
  source URL.
- **Member-only stories:** if you are signed in and Safari shows you the full
  story, the file contains the full story. If Safari shows only a preview, you
  get only the preview. The shortcut never fetches the page again and never
  tries to unlock content.

The Medium adapter is checked against a synthetic fixture modelled on Medium's
current DOM ([`test/fixtures/medium-article.html`](test/fixtures/medium-article.html)),
not against a live Medium page. Medium changes its markup from time to time.
Item 6 of the device checklist covers testing it for real.

## Limitations

- **Safari only.** The *Run JavaScript on Web Page* action needs a Safari web
  page as input. Chrome, Firefox and most in-app browsers share only a URL, so
  the shortcut can't run there.
- **Only what's loaded.** Content behind "show more" buttons, infinite scroll,
  cross-origin iframes or shadow DOM isn't captured. Embedded videos and
  iframes become plain links.
- **Extraction is heuristic.** Readability works well on articles but can
  include stray bits or miss parts of unusual layouts, such as forums,
  documentation sites with sidebars, and single-page apps. Tables without a
  header row, and complex tables with merged cells, stay as HTML inside the
  Markdown.
- **Images are links, not attachments.** Images that need you to be signed in
  may not load in other apps.
- **Very large pages.** Apple doesn't document the action's time and memory
  limits. Normal articles are small, but extremely long pages may be slow or
  fail on older devices. See [technical notes](docs/technical-notes.md).
- **Not yet tested on iOS hardware** (see Status above).

## How it works

```
Safari tab ─▶ Run JavaScript on Web Page ─▶ { filename, markdown } ─▶ Set Name (.md) ─▶ Share Sheet
              │
              └─ clone DOM → site adapter → Readability → DOMPurify → Turndown → header
```

The script runs inside the page you're viewing, on a copy of its DOM. It
returns a dictionary to Shortcuts. The shortcut turns the Markdown text into
a named `.md` file and opens the Share Sheet with it. See
[docs/technical-notes.md](docs/technical-notes.md) for the design and what's
known about Safari's constraints on the action.

## Development

You need Node.js 18 or later. The only build tool is esbuild, and jsdom is
used for tests.

```sh
npm install
npm run build        # writes dist/
npm test             # builds, then runs the fixture tests
npm run test:update  # accept intended changes to test/expected/*.md
npm run convert -- page.html https://example.com/article > out.md
```

`dist/` is committed so that iPhone users can copy the script without
building it.

| Path | Purpose |
|------|---------|
| `src/extract.js` | Clone the page, clean it, run Readability, collect metadata, sanitize |
| `src/convert.js` | HTML → Markdown (Turndown rules) |
| `src/document.js` | Header block and filename |
| `src/sites/` | Site-specific adapters (Medium) |
| `shortcut/run.js` | Glue that calls Shortcuts' `completion()` |
| `scripts/build.mjs` | Bundles the script and generates the `.shortcut` workflow |
| `scripts/shortcut.mjs` | Shortcut workflow definition and plist writer |
| `scripts/convert.mjs` | Convert a saved HTML file from the command line |
| `test/fixtures/` | Ordinary article, Medium story, technical article with code |
| `test/expected/` | Expected Markdown for each fixture |
| `dist/shortcut-script.js` | The script embedded in the shortcut |
| `dist/web-to-markdown.js` | Readable (unminified) build of the same code |
| `dist/web-to-markdown-unsigned.shortcut` | Unsigned workflow, to sign on a Mac |

### Adding a site adapter

Create `src/sites/<site>.js` exporting `{ name, matches(doc, url), prepare(clone, url), metadata(doc, url), dropParams }`
(only `matches` is required) and add it to `src/sites/index.js`. Add a fixture
and a test for it.

## License and credits

MIT. See [LICENSE](LICENSE).

The script bundles [Mozilla Readability](https://github.com/mozilla/readability)
(Apache-2.0), [DOMPurify](https://github.com/cure53/DOMPurify)
(Apache-2.0 / MPL-2.0), [Turndown](https://github.com/mixmark-io/turndown) and
[turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) (MIT).
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [`licenses/`](licenses/).

The approach is inspired by
[SilentTiger/web-clipper-on-shortcut](https://github.com/SilentTiger/web-clipper-on-shortcut).
