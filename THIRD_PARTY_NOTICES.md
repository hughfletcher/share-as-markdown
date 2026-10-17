# Third-party notices

Web to Markdown is released under the MIT License (see [LICENSE](LICENSE)).

The built scripts in `dist/` bundle the following open-source libraries
without modification. Their full license texts are in [`licenses/`](licenses/).

| Library | Version | License | Copyright |
|---------|---------|---------|-----------|
| [Mozilla Readability](https://github.com/mozilla/readability) | 0.6.0 | Apache License 2.0 | © 2010 Arc90 Inc, and Mozilla contributors |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.17 | Apache License 2.0 or Mozilla Public License 2.0, at your option (used here under Apache 2.0) | © Cure53 and other contributors |
| [Turndown](https://github.com/mixmark-io/turndown) | 7.2.4 | MIT | © 2017 Dom Christie |
| [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) | 1.0.2 | MIT | © 2017 Dom Christie |

## Acknowledgement

The overall approach comes from
[SilentTiger/web-clipper-on-shortcut](https://github.com/SilentTiger/web-clipper-on-shortcut)
(MIT, © 2023 SilentTiger). That approach is to run Readability, DOMPurify and
Turndown on a clone of the live page from Shortcuts' *Run JavaScript on Web
Page* action. Web to Markdown is a separate implementation and does not copy
its source code.
