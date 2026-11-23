# amanah

Four independent storefront designs for **Amanah Health Products** (Dr Ali's range), demo
stores, no real orders are taken.

```
index.html · styles.css   simple root page linking to the four sites
web_1/   Editorial
web_3/   Gallery · Mughal garden
web_4/   Swiss grid
web_5/   Bento
```

Each `web_N` folder is fully self-contained and links to nothing outside itself:

```
web_N/index.html · styles.css · app.js
web_N/products.json            the product database (single source of truth)
web_N/assets/products/*.jpg    product images referenced by products.json
```

## Products

Products are **not** hard-coded in the pages. `products.json` holds every product
(name, price, category, description, ingredients, directions, warnings, image path) plus the
currency and shipping settings, and `app.js` renders the shop, product pages, bag and checkout
from it. To add or change a product, edit `products.json` and drop its image into
`assets/products/`. Prices are placeholders until confirmed.

`products.json` is loaded with `fetch()`, so open a site through a web server
(e.g. `python3 -m http.server`) rather than double-clicking the file.

## Keeping one design

Delete the other `web_N` folders, move everything inside the chosen `web_N/` to the repo
root, and delete the old root `index.html` and `styles.css` first.
