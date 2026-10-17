// Site adapters. Each may implement:
//   matches(doc, url)  -> boolean (required)
//   prepare(clone, url) -> mutate the cloned document before Readability
//   metadata(doc, url) -> { title, author, published, siteName } overrides
//   dropParams         -> extra query parameters to strip from the source URL

import medium from './medium.js';

export default [medium];
