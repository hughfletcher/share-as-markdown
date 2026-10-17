# Testing on a real iPhone or iPad

The extraction and conversion code is tested automatically in jsdom
(`npm test`). The parts that only exist on Apple devices have to be checked by
hand on a real device:

- the Shortcuts actions
- Safari's script injection
- creating the file
- the Share Sheet hand-off

Record the iOS version and the result for each item.

## Setup

1. Install the shortcut using one of the methods in the [README](../README.md#installation).
2. Make sure **Allow Running Scripts** is on (see [manual setup, step 0](manual-setup.md#0-allow-scripts-one-time)).
3. Install Telegram and sign in. A chat with yourself (Saved Messages) works fine as a target.

## Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | Open an ordinary news/blog article in Safari → Share → **Web to Markdown** | iOS asks to allow access to the site (first time only), then a Share Sheet opens with a file named `<Article title>.md` |
| 2 | From that Share Sheet choose **Telegram** → Saved Messages → Send | Telegram sends a **document** (file icon, `.md` name), not a text message or link preview |
| 3 | Open the document in Telegram | Header has title, Source URL, author/date where the page had them; body is the article without menus, ads or "related" links |
| 4 | Repeat 1 and share to **Save to Files** | A `.md` file appears in Files; open it with a text editor and confirm UTF-8 characters (quotes, accents, emoji) look right |
| 5 | Repeat 1 and share via **Mail** and **AirDrop** (to a Mac) | The same file arrives, unchanged |
| 6 | Signed in to Medium, open a member-only story you can read → run the shortcut | Full story text is in the file; no "Member-only story", claps, Follow, "More from…" or "Recommended from Medium" |
| 7 | Signed out of Medium (or a story you can't read), run the shortcut | Only the visible preview is saved; nothing beyond what Safari shows |
| 8 | A technical article with code blocks (for example MDN, a GitHub blog post, a dev.to post) | Code is in fenced blocks with correct line breaks and indentation; no line numbers |
| 9 | A page with a table and images | Table is a Markdown table; images are `![alt](https://…)` links |
| 10 | A very long article (for example a long-form magazine piece) | Completes without a timeout error; note how long it takes |
| 11 | A page with no article (for example a search results page) | An alert says no readable article content was found; nothing is shared |
| 12 | Run from Chrome or Firefox for iOS | Web to Markdown is not offered, or fails, because those browsers share a URL, not a Safari web page. This is expected (see Limitations) |
| 13 | On a Mac: Safari → Share → Web to Markdown | Same as 1 (optional) |

## When something fails

- **"Run JavaScript on Web Page" error about scripts:** turn on *Allow Running Scripts*.
- **No file, or a file with the wrong content:** open the same page in
  Safari on a Mac while signed in. Use *Develop → Show Web Inspector* and
  copy the `<html>` element (right-click → *Copy* → *HTML*) into `page.html`.
  Then run `node scripts/convert.mjs page.html <url>` to reproduce the
  problem locally. If you open an issue, attach the HTML with personal data
  removed.
- **The shortcut won't import:** the `.shortcut` file must be signed. Build it
  by hand instead ([manual setup](manual-setup.md)).
