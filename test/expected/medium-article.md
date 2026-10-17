# Building a Tiny Search Engine in 200 Lines of Python

- **Source:** <https://medium.com/better-programming/building-a-tiny-search-engine-1a2b3c4d5e6f>
- **Author:** Jordan Lee
- **Published:** 2024-02-14
- **Site:** Medium
- **Saved:** 2026-01-15

---

## Inverted indexes, tokenisation and TF-IDF ranking, without a single dependency

![Diagram of an inverted index mapping words to document IDs](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*index-diagram.png)

_An inverted index maps each term to the documents that contain it._

Full-text search feels like magic until you build one. In this article we will write a working search engine over a folder of text files using nothing but the Python standard library. It will not replace [Elasticsearch](https://www.elastic.co/elasticsearch), but it will show you exactly what Elasticsearch is doing.

## Step 1: Tokenising text

Before we can index anything we need to split documents into **terms**. We lowercase everything, strip punctuation and drop a handful of _stop words_ such as `the` and `and`.

```python
import re

STOP_WORDS = {"the", "and", "a", "of"}

def tokenize(text):
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [w for w in words if w not in STOP_WORDS]
```

## Step 2: Building the index

The index is a dictionary from each term to the set of documents containing it. Three rules keep it simple:

1.  Every document gets an integer ID.
2.  Terms are stored after tokenising, never raw.
3.  We also record how often each term appears, for ranking later.

> An index is just a precomputed answer to the question “where does this word appear?”

## Ranking with TF-IDF

Term frequency rewards documents that mention a term often; inverse document frequency penalises terms that appear everywhere. Multiply them and you get a surprisingly good relevance score.

```python
def idf(term, index, total):
    return math.log(total / (1 + len(index[term])))
```

The complete code is on [GitHub](https://github.com/example/tiny-search). Thanks for reading!
