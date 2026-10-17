// Appended after the bundle inside the Shortcut's "Run JavaScript on Web Page"
// action. Shortcuts provides `completion`; whatever is passed to it becomes the
// action's output (an object becomes a Dictionary).
try {
  var result = WebToMarkdown.convert(document, location.href);
  completion({ filename: result.filename, markdown: result.markdown, title: result.title, url: result.url });
} catch (error) {
  completion({ error: String((error && error.message) || error) });
}
