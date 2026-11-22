# amanah

Five independent website designs for **still.**, a fictional natural-wellness brand (demo stores — no real orders).

```
index.html · styles.css   simple root page linking to the five sites
web_1/   Editorial         index.html · styles.css · app.js
web_2/   Split screen      index.html · styles.css · app.js
web_3/   Gallery · Mughal garden   index.html · styles.css · app.js
web_4/   Swiss grid        index.html · styles.css · app.js
web_5/   Bento             index.html · styles.css · app.js
```

Each `web_N` folder is fully self-contained: it has its own styles and scripts and
links to nothing outside itself. To keep one as the whole site, delete the others,
move everything inside the chosen `web_N/` to the repo root, and delete the old
root `index.html` and `styles.css` first.

To edit a design's About text, search its `index.html` for `ABOUT THE COMPANY`.
