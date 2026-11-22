/* Amanah Health Products — Swiss grid (web_4) storefront logic.
   Products come from products.json (the product database); their images live in assets/products/.
   products.json is loaded with fetch(), so open the site through a web server (not file://). */

const THEME = { layout: "table" };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let PRODUCTS = [], CATS = { all: "All" }, FREE_SHIP = 60, SHIPPING = 5, CURRENCY = "£";
const CART_KEY = "amanah-cart";
const fmt = (n) => CURRENCY + n.toFixed(2);
const byId = (id) => PRODUCTS.find((p) => p.id === id);

/* Product photography */
function art(p) {
  return `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.name)}" loading="lazy" decoding="async" />`;
}

function boot() {
  /* ---------- Cart state ---------- */
  let cart = loadCart();
  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY)) || {};
      return Object.fromEntries(Object.entries(raw).filter(([id, q]) => byId(id) && Number.isInteger(q) && q > 0));
    } catch (e) { return {}; }
  }
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
  const cartItems = () => Object.entries(cart).map(([id, q]) => ({ p: byId(id), q })).filter((i) => i.p);
  const subtotal = () => cartItems().reduce((s, i) => s + i.p.price * i.q, 0);

  function addToCart(id, qty = 1) {
    cart[id] = Math.min((cart[id] || 0) + qty, 20);
    saveCart(); renderCart();
    toast(`Added ${byId(id).name}`);
  }
  function setQty(id, q) {
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 20);
    saveCart(); renderCart();
  }

  /* ---------- Grid + filters ---------- */
  let filter = "all";
  const grid = $("#grid"), filters = $("#filters");
  filters.hidden = PRODUCTS.length < 5;
  filters.innerHTML = Object.entries(CATS).map(([k, v]) =>
    `<button class="filter${k === "all" ? " is-active" : ""}" role="tab" aria-selected="${k === "all"}" data-cat="${k}">${v}</button>`).join("");
  filters.addEventListener("click", (e) => {
    const f = e.target.closest(".filter"); if (!f) return;
    filter = f.dataset.cat;
    $$(".filter", filters).forEach((b) => { const on = b === f; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", on); });
    renderGrid();
  });

  /* Product markup — designs can pick a layout via STORE_THEME.layout: "grid" (default), "list" or "table" */
  function cardHTML(p, i) {
    const num = String(i + 1).padStart(2, "0");
    if (THEME.layout === "list") return `
      <article class="card row" data-id="${p.id}">
        <span class="row__num">No. ${num}</span>
        <button class="row__name" data-action="view">${esc(p.name)}<em>${esc(p.sub)}</em></button>
        <span class="row__price">${fmt(p.price)}</span>
        <button class="row__add" data-action="add">Add to bag</button>
        <div class="row__img" aria-hidden="true">${art(p)}</div>
      </article>`;
    if (THEME.layout === "table") return `
      <article class="card cell" data-id="${p.id}">
        <div class="cell__top"><span>${num}</span><span>${CATS[p.cat]}</span></div>
        <button class="cell__media" data-action="view" aria-label="View ${esc(p.name)}">${art(p)}</button>
        <div class="cell__foot"><button class="cell__name" data-action="view">${esc(p.name)}<small>${esc(p.sub)}</small></button><span class="cell__price">${fmt(p.price)}</span></div>
        <button class="cell__add" data-action="add">+ Add to bag</button>
      </article>`;
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media">
          <button class="card__view" data-action="view" aria-label="View ${esc(p.name)}" style="display:grid;place-items:center;height:100%">${art(p)}</button>
          <button class="card__add" data-action="add">Add to bag</button>
        </div>
        <button class="card__view" data-action="view" tabindex="-1">
          <div class="card__info">
            <div><h3>${esc(p.name)}</h3><p>${esc(p.sub)}</p></div>
            <span class="card__price">${fmt(p.price)}</span>
          </div>
        </button>
      </article>`;
  }
  function renderGrid() {
    grid.innerHTML = PRODUCTS.filter((p) => filter === "all" || p.cat === filter).map(cardHTML).join("");
  }
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]"); if (!btn) return;
    const id = btn.closest(".card").dataset.id;
    if (btn.dataset.action === "add") addToCart(id); else openProduct(id);
  });

  /* ---------- Hero ---------- */
  $("#heroArt").innerHTML = PRODUCTS.map(art).join("");

  /* ---------- Drawer ---------- */
  const drawer = $("#drawer"), overlay = $("#overlay");
  const modal = $("#modal"), modalContent = $("#modalContent");
  let lastFocus = null;

  function openDrawer() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => { overlay.classList.add("is-open"); drawer.classList.add("is-open"); });
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    $("[data-close-drawer]").focus();
  }
  function closeDrawer() {
    overlay.classList.remove("is-open"); drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    setTimeout(() => { if (!drawer.classList.contains("is-open")) overlay.hidden = true; }, 350);
    if (!modal.classList.contains("is-open")) document.body.classList.remove("lock");
    lastFocus?.focus?.();
  }
  $$("[data-open-cart]").forEach((b) => b.addEventListener("click", openDrawer));
  $("[data-close-drawer]").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);

  function renderCart() {
    const items = cartItems(), sub = subtotal();
    $$("[data-cart-count]").forEach((el) => (el.textContent = items.reduce((s, i) => s + i.q, 0)));
    $("#subtotal").textContent = fmt(sub);
    $("#checkoutBtn").disabled = !items.length;
    const left = FREE_SHIP - sub;
    $("#shipText").textContent = !items.length ? `Free shipping over ${fmt(FREE_SHIP)}.`
      : left > 0 ? `${fmt(left)} until free shipping.` : "Free shipping applied.";
    $("#cartBody").innerHTML = items.length ? items.map(({ p, q }) => `
      <div class="line" data-id="${p.id}">
        <div class="line__img">${art(p)}</div>
        <div><h3>${esc(p.name)}</h3><p>${esc(p.sub)}</p>
          <div class="qty"><button data-qty="-1" aria-label="Decrease quantity">−</button><span>${q}</span><button data-qty="1" aria-label="Increase quantity">+</button></div>
        </div>
        <div class="line__end"><span>${fmt(p.price * q)}</span><button class="text-btn" data-remove>Remove</button></div>
      </div>`).join("") : `<p class="empty">Your bag is empty.</p>`;
  }
  $("#cartBody").addEventListener("click", (e) => {
    const line = e.target.closest(".line"); if (!line) return;
    const id = line.dataset.id, q = e.target.closest("[data-qty]");
    if (q) setQty(id, (cart[id] || 0) + Number(q.dataset.qty));
    if (e.target.closest("[data-remove]")) setQty(id, 0);
  });
  $("#checkoutBtn").addEventListener("click", () => { closeDrawer(); openCheckout(); });

  /* ---------- Modal ---------- */
  function openModal(html) {
    if (!modal.classList.contains("is-open")) lastFocus = document.activeElement;
    modalContent.innerHTML = html;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    $(".modal__close").focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!drawer.classList.contains("is-open")) document.body.classList.remove("lock");
    lastFocus?.focus?.();
  }
  $(".modal__close").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (modal.classList.contains("is-open")) closeModal();
    else if (drawer.classList.contains("is-open")) closeDrawer();
  });

  function openProduct(id) {
    const p = byId(id);
    let qty = 1;
    openModal(`
      <div class="pdp">
        <div class="pdp__media">${art(p)}</div>
        <div class="pdp__info">
          <h2>${esc(p.name)}</h2>
          <p class="pdp__sub">${esc(p.sub)}</p>
          <p class="pdp__price">${fmt(p.price)}</p>
          <p class="pdp__desc">${esc(p.desc)}</p>
          <dl>${[["Ingredients", p.ingredients], ["Directions", p.directions], ["Warnings", p.warnings], ["Storage", p.storage], ["Size", p.size], ["Category", CATS[p.cat]]].filter((r) => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
          <div class="pdp__buy">
            <div class="qty"><button data-q="-1" aria-label="Decrease quantity">−</button><span id="pdpQty">1</span><button data-q="1" aria-label="Increase quantity">+</button></div>
            <button class="btn" id="pdpAdd">Add to bag</button>
          </div>
        </div>
      </div>`);
    $$("[data-q]", modalContent).forEach((b) => b.addEventListener("click", () => {
      qty = Math.max(1, Math.min(20, qty + Number(b.dataset.q)));
      $("#pdpQty").textContent = qty;
    }));
    $("#pdpAdd").addEventListener("click", () => { addToCart(p.id, qty); closeModal(); });
  }

  function openCheckout() {
    const items = cartItems(); if (!items.length) return;
    const sub = subtotal(), ship = sub >= FREE_SHIP ? 0 : SHIPPING;
    openModal(`
      <div class="checkout">
        <form id="coForm" novalidate>
          <h2>Checkout</h2>
          <p class="checkout__note">Demo store — no payment is taken and nothing ships.</p>
          <div class="field-row">
            <label class="field">First name<input name="first" required autocomplete="given-name" /></label>
            <label class="field">Last name<input name="last" required autocomplete="family-name" /></label>
          </div>
          <label class="field">Email<input name="email" type="email" required autocomplete="email" /></label>
          <label class="field">Address<input name="address" required autocomplete="street-address" /></label>
          <div class="field-row">
            <label class="field">City<input name="city" required autocomplete="address-level2" /></label>
            <label class="field">Postal code<input name="zip" required autocomplete="postal-code" /></label>
          </div>
          <p class="form-error" id="coError" role="alert"></p>
          <button class="btn" type="submit">Place demo order</button>
        </form>
        <aside class="summary">
          <h3>Summary</h3>
          ${items.map(({ p, q }) => `<div class="summary__line"><span>${esc(p.name)} × ${q}</span><span>${fmt(p.price * q)}</span></div>`).join("")}
          <div class="summary__line"><span>Shipping</span><span>${ship ? fmt(ship) : "Free"}</span></div>
          <div class="summary__line summary__total"><span>Total</span><span>${fmt(sub + ship)}</span></div>
        </aside>
      </div>`);
    $("#coForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      let ok = true;
      $$("input", form).forEach((i) => { const v = i.checkValidity() && i.value.trim(); i.classList.toggle("invalid", !v); if (!v) ok = false; });
      if (!ok) { $("#coError").textContent = "Please complete every field."; return; }
      const order = "AH-" + Math.floor(10000 + Math.random() * 90000);
      const name = form.first.value.trim();
      cart = {}; saveCart(); renderCart();
      modalContent.innerHTML = `<div class="confirm"><h2>Thank you, ${esc(name)}.</h2><p>Demo order ${order} received.</p><p>No payment was taken and nothing will ship.</p><button class="btn" id="confirmDone">Continue</button></div>`;
      $("#confirmDone").addEventListener("click", closeModal);
    });
  }

  /* ---------- Toast, nav, newsletter ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  const nav = $("#nav");
  /* Smooth scrolling: update at most once per frame, and pause hover effects while the page is moving
     (otherwise every product passing under the cursor re-paints its glow mid-scroll). */
  let scrolled = null, ticking = false, scrollTimer = 0;
  const updateNav = () => {
    const s = window.scrollY > 8;
    if (s !== scrolled) { scrolled = s; nav.classList.toggle("is-scrolled", s); }
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateNav); }
    if (!scrollTimer) document.body.classList.add("is-scrolling");
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { document.body.classList.remove("is-scrolling"); scrollTimer = 0; }, 150);
  }, { passive: true });
  updateNav();

  $("#newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const i = $("#newsEmail"), s = $("#newsStatus");
    if (!i.checkValidity() || !i.value.trim()) { s.textContent = "Enter a valid email."; return; }
    s.textContent = "Subscribed. (Demo — nothing is stored.)"; i.value = "";
  });

  $("#year").textContent = new Date().getFullYear();
  renderGrid();
  renderCart();
}

fetch("products.json")
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((db) => {
    CURRENCY = db.currencySymbol || "£";
    FREE_SHIP = db.freeShippingOver ?? FREE_SHIP;
    SHIPPING = db.shippingFlat ?? SHIPPING;
    db.categories.forEach((c) => { CATS[c.id] = c.name; });
    PRODUCTS = db.products.map((p) => ({ ...p, sub: p.subtitle, cat: p.category, desc: p.description }));
    boot();
  })
  .catch(() => {
    const g = document.getElementById("grid");
    if (g) g.innerHTML = '<p class="empty">Products could not be loaded. Open this site through a web server rather than as a local file.</p>';
  });
