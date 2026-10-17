# Debouncing vs. Throttling in JavaScript

- **Source:** <https://devnotes.example.dev/posts/debounce-vs-throttle>
- **Author:** Sam Okafor
- **Published:** 2024-11-03
- **Site:** devnotes
- **Saved:** 2026-01-15

---

Scroll, resize and input events can fire dozens of times per second. Running expensive work on every event makes interfaces feel sluggish, so we usually wrap the handler in either a `debounce` or a `throttle` helper. They sound similar but behave very differently.

## Debounce

A debounced function waits until calls **stop** for a given delay, then runs once. It is ideal for search-as-you-type:

```javascript
function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Usage: only search after the user pauses typing
input.addEventListener('input', debounce(search, 300));
```

## Throttle

A throttled function runs at most once per interval, no matter how often it is called. Use it for scroll position tracking. Here is a TypeScript version rendered with a line-number gutter:

```ts
export function throttle<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let last = 0;
  return (...args: T) => {
    const now = Date.now();
    if (now - last < ms) return;
    last = now;
    fn(...args);
  };
}
```

Some highlighters emit one element per line instead of newline characters:

```bash
npm install lodash.debounce lodash.throttle
npm test -- --watch
```

And a block that itself contains Markdown fences, which must not break the output:

````markdown
Use triple backticks:

```js
console.log("hi");
```
````

## Comparison

| Helper | Runs when | Good for |
| --- | --- | --- |
| `debounce` | Calls stop for _delay_ ms | Search boxes, autosave |
| `throttle` | At most once per _ms_ | Scroll, resize, pointer move |

Things to remember:

-   Both helpers return a _new_ function; keep a reference if you need to remove the listener.
    -   Calling `debounce(fn)` inside a render loop creates a new timer each time.
    -   In React, wrap it in `useMemo` or `useRef`.
-   Prefer `requestAnimationFrame` for purely visual updates.

Further reading: the [MDN glossary entry](https://developer.mozilla.org/en-US/docs/Glossary/Debounce) and [my post on requestAnimationFrame](https://devnotes.example.dev/posts/raf).
