# Technical notes

## Why "Run JavaScript on Web Page"

When a shortcut runs from Safari's Share Sheet with *Safari web pages* as its
input, the **Run JavaScript on Web Page** action injects a script into the tab
the user is looking at. So the script sees the DOM exactly as Safari rendered
it, including content that is only there because the user is signed in, as on
a Medium member story. It makes no second HTTP request. A server-side or
"Get Contents of URL" approach would fetch the page without the user's
session, and would get a paywall or login page instead.

## Pipeline

```
live document ──clone──▶ site adapter (src/sites/) ──▶ generic cleanup
   ──▶ lazy images / code blocks / embeds normalised ──▶ Readability
   ──▶ DOMPurify ──▶ Turndown (+ GFM tables) ──▶ header + filename
```

| Stage | File | Notes |
|-------|------|-------|
| Extraction | `src/extract.js` | Works on `document.cloneNode(true)`, so the page itself is never changed. Resolves lazy images from `data-src`, `srcset` and `<picture><source>`. Flattens highlighted code into `<pre><code>`, keeping the language in a `data-w2m-lang` attribute, because Readability strips classes. Turns iframes into links. Reads author and date from JSON-LD, Open Graph and `<meta>`. |
| Site adapters | `src/sites/*.js` | Optional `matches` / `prepare` / `metadata` hooks. Only Medium needs one today. |
| Conversion | `src/convert.js` | Turndown with ATX headings, fenced code, `-` bullets, and GFM tables and strikethrough. Code fences grow longer than any backtick run inside the code. Converts in chunks of top-level blocks. Turndown re-copies its whole output at every join, which makes very long articles quadratic: 3,000 paragraphs took 4.0 s in one piece and 0.7 s chunked, measured in Node. |
| Document | `src/document.js` | Title, source, author, date, site and saved date. Removes a duplicate leading title. Builds a filename safe for iOS Files, AirDrop and Telegram (no `/ \ : * ? " < > \| # %`, at most 80 characters, ends in `.md`). |
| Shortcut glue | `shortcut/run.js` | Calls `completion({ filename, markdown, title, url })`, or `completion({ error })` instead of throwing. |

The build (`scripts/build.mjs`) bundles everything with esbuild into one IIFE.
It wraps the IIFE and the glue in an outer function, so nothing is added to the
page's global scope. The result goes in `dist/shortcut-script.js` (about
90 KB) and is embedded directly in the shortcut.

## How the Markdown becomes a file

JavaScript in the page can't create files that Shortcuts can share. Instead,
the script returns the Markdown as text. The shortcut then runs **Set Name**
on that text with a name ending in `.md`, which turns it into a file with that
name. **Share** hands that file to the system Share Sheet. Telegram, Files,
Mail and AirDrop therefore get a document, not a text snippet.

## Safari / Shortcuts constraints (what is known, what is not)

Apple documents very little about this action. Items marked *unverified* are
based on Apple's documentation, community reports or reasoning. They have not
been measured on a device for this project.

- **Input type.** The action only works when the shortcut input is a *Safari
  web page*. Safari's own Share Sheet provides one, on iOS, iPadOS and macOS.
  Chrome, Firefox and most in-app browsers share a URL instead, so the action
  can't run there.
- **Permissions.** *Allow Running Scripts* must be on in the Shortcuts
  settings. iOS also asks once per website before the script may run.
- **Returning data.** The script must call `completion(value)`. A
  JSON-compatible object comes back as a Shortcuts Dictionary. If
  `completion` is never called, the action eventually fails with a timeout.
- **Execution time.** The time limit is not documented (*unverified*). The
  script is fully synchronous and makes no network requests. In jsdom, which
  is much slower than Safari's native DOM, the three fixtures convert in
  60–120 ms. A synthetic 2.6 MB page with 3,000 paragraphs took about 18 s
  in jsdom. Real articles are far smaller, but extreme pages may still be
  slow on older devices.
- **Memory.** Shortcuts run from the Share Sheet as an app extension, and iOS
  limits extension memory (*unverified* how strictly for this action). The
  Markdown is roughly the size of the article's text, so a normal article
  produces tens of KB.
- **Script size.** The ~90 KB script is stored inside the shortcut. Shortcuts
  doesn't publish a size limit for the script field, and the reference project
  injects a script of similar size (*unverified* on current iOS).
- **What the script can see.** It sees the main document only. It can't see
  content inside cross-origin iframes or closed shadow roots. Content that a
  site loads only when you scroll (infinite scroll, "show more" buttons) is
  captured only if it has already loaded. Images are an exception: lazy image
  URLs are taken from their `srcset` / `data-src` attributes even if they
  haven't loaded yet.
- **Page interference.** The script runs in the page's JavaScript context. A
  page that overrides built-in prototypes could in theory break it. This is
  rare.

## The `.shortcut` file

Since iOS 15, iOS and macOS only import signed shortcut files. Signing is done
by Apple's `shortcuts sign` command, which exists only on macOS. So the build
produces an **unsigned** workflow, `dist/web-to-markdown-unsigned.shortcut`,
in the XML property-list format that Shortcuts uses internally. It has to be
signed on a Mac before it can be imported (see the README). The action
identifiers and parameter keys follow what Shortcuts exports, but Apple
doesn't document them. If a future iOS version rejects the file, the
[manual setup](manual-setup.md) builds the same workflow by hand.
