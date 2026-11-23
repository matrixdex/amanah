/* Amanah Health Products — storefront logic (Gallery).
   Products come from products.json (the product database) and their images live in assets/products/.
   products.json is loaded with fetch(), so open the site through a web server (not file://). */

const THEME = { layout: "grid" };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let PRODUCTS = [], FREE_SHIP = 60, SHIPPING = 5, CURRENCY = "£";
const CART_KEY = "amanah-cart";
const PAGE = document.body.dataset.page;
const fmt = (n) => CURRENCY + n.toFixed(2);
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const productUrl = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
const soldOut = (p) => p.available === false;

/* ---------- Full-screen menu (mobile) ---------- */
let lastFocus = null;
(() => {
  const menu = $("#menu"), btn = $(".menu-btn");
  if (!menu || !btn) return;
  const closeBtn = $(".menu__close", menu);
  let hideTimer = 0;
  const focusables = () => $$("a, button", menu);
  function openMenu() {
    clearTimeout(hideTimer);
    const r = btn.getBoundingClientRect();
    menu.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")));
    btn.setAttribute("aria-expanded", "true");
    document.body.classList.add("lock");
    closeBtn.focus({ preventScroll: true });
  }
  function closeMenu(returnFocus = true) {
    if (menu.hidden) return;
    menu.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("lock");
    hideTimer = setTimeout(() => { menu.hidden = true; }, 420);
    if (returnFocus) btn.focus({ preventScroll: true });
  }
  btn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", () => closeMenu());
  menu.addEventListener("click", (e) => { if (e.target.closest(".menu__links a, .menu__logo, .menu__cart")) closeMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (menu.hidden || !menu.classList.contains("is-open")) return;
    if (e.key === "Escape") { closeMenu(); return; }
    if (e.key === "Tab") {
      const f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  matchMedia("(min-width: 761px)").addEventListener("change", (m) => { if (m.matches) closeMenu(false); });
})();

/* ---------- Header state ---------- */
(() => {
  const nav = $("#nav"); if (!nav) return;
  let ticking = false;
  const update = () => { nav.classList.toggle("is-scrolled", window.scrollY > 8); ticking = false; };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

/* ---------- Product markup ---------- */
function img(p, eager) {
  return `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.name)}" width="900" height="1125" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
}
const benefitLine = (p) => (p.benefits || []).slice(0, 2).map((b) => b.title).join(" · ");

function cardHTML(p, i) {
  const price = soldOut(p) ? "Sold out" : fmt(p.price);
  const num = THEME.layout === "list" ? `<span class="card__num">${String(i + 1).padStart(2, "0")}</span>` : "";
  return `<a class="card${soldOut(p) ? " is-soldout" : ""}" href="${productUrl(p)}">${num}
    <span class="card__img">${img(p)}</span>
    <span class="card__body">
      <span class="card__name">${esc(p.name)}</span>
      <span class="card__sub">${esc(p.sub)}</span>
      <span class="card__benefits">${esc(benefitLine(p))}</span>
    </span>
    <span class="card__price">${price}</span>
  </a>`;
}

function renderProducts(list, target) {
  const el = $(target); if (!el) return;
  el.innerHTML = list.map(cardHTML).join("");
}

function renderHero() {
  const el = $("#heroImages"); if (!el) return;
  el.innerHTML = PRODUCTS.slice(0, 3).map((p, i) => `<a class="hero__img" href="${productUrl(p)}" aria-label="${esc(p.name)}">${img(p, true)}</a>`).join("");
}

function renderProductPage() {
  const root = $("#product"); if (!root) return;
  const p = byId(new URLSearchParams(location.search).get("id"));
  if (!p) {
    document.title = "Product not found — Amanah Health Products";
    root.innerHTML = `<div class="notfound"><h1>Product not found</h1><p>That product isn't in our range.</p><a class="btn" href="shop.html">Shop all</a></div>`;
    return;
  }
  document.title = `${p.name} — Amanah Health Products`;
  const meta = $('meta[name="description"]'); if (meta) meta.content = p.description;
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description,
    image: new URL(p.image, location.href).href, brand: { "@type": "Brand", name: "Dr Ali's" },
    offers: { "@type": "Offer", priceCurrency: "GBP", price: p.price.toFixed(2), availability: soldOut(p) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", url: location.href }
  });
  document.head.appendChild(ld);

  const details = [["Ingredients", p.ingredients], ["Directions", p.directions], ["Warnings", p.warnings], ["Storage", p.storage]]
    .filter((r) => r[1]).map(([k, v]) => `<details><summary>${k}</summary><p>${esc(v)}</p></details>`).join("");
  const benefits = (p.benefits || []).map((b) => `<li><strong>${esc(b.title)}</strong><span>${esc(b.text)}</span></li>`).join("");
  root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="shop.html">Shop</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.name)}</span></nav>
    <div class="pdp">
      <div class="pdp__media">${img(p, true)}</div>
      <div class="pdp__info">
        <h1>${esc(p.name)}</h1>
        <p class="pdp__sub">${esc(p.sub)}</p>
        <p class="pdp__price">${soldOut(p) ? "Sold out" : fmt(p.price)}</p>
        <p class="pdp__desc">${esc(p.description)}</p>
        <div class="pdp__buy">
          <div class="qty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><span id="pdpQty" aria-live="polite">1</span><button type="button" data-q="1" aria-label="Increase quantity">+</button></div>
          <button class="btn" type="button" id="pdpAdd" ${soldOut(p) ? "disabled" : ""}>${soldOut(p) ? "Sold out" : "Add to cart"}</button>
        </div>
        ${benefits ? `<section class="benefits" aria-labelledby="benefitsTitle"><h2 id="benefitsTitle">Health benefits</h2><ul>${benefits}</ul></section>` : ""}
        <div class="details">${details}</div>
      </div>
    </div>`;
  let qty = 1;
  $$("[data-q]", root).forEach((b) => b.addEventListener("click", () => {
    qty = Math.max(1, Math.min(20, qty + Number(b.dataset.q)));
    $("#pdpQty").textContent = qty;
  }));
  $("#pdpAdd").addEventListener("click", () => window.addToCart(p.id, qty));
  const others = PRODUCTS.filter((x) => x.id !== p.id);
  if (others.length) { $("#more").hidden = false; renderProducts(others, "#moreGrid"); }
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
  window.addToCart = (id, qty = 1) => {
    cart[id] = Math.min((cart[id] || 0) + qty, 20);
    saveCart(); renderCart(); toast(`Added ${byId(id).name}`);
  };
  function setQty(id, q) {
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 20);
    saveCart(); renderCart();
  }

  /* ---------- Drawer ---------- */
  const drawer = $("#drawer"), overlay = $("#overlay");
  const modal = $("#modal"), modalContent = $("#modalContent");

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
    setTimeout(() => { if (!drawer.classList.contains("is-open")) overlay.hidden = true; }, 400);
    if (!modal.classList.contains("is-open")) document.body.classList.remove("lock");
    lastFocus?.focus?.();
  }
  $$("[data-open-cart]").forEach((b) => b.addEventListener("click", openDrawer));
  $("[data-close-drawer]").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);

  /* ---------- Swipe the cart away: 1:1 tracking, momentum decides ---------- */
  (() => {
    let start = null, dx = 0, dragging = false, hist = [];
    const width = () => drawer.getBoundingClientRect().width;
    const rubber = (o, dim) => (o * dim * 0.55) / (dim + 0.55 * Math.abs(o));
    drawer.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || !drawer.classList.contains("is-open") || e.target.closest("button, a, input")) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId }; dx = 0; dragging = false; hist = [{ x: e.clientX, t: e.timeStamp }];
    });
    drawer.addEventListener("pointermove", (e) => {
      if (!start || e.pointerId !== start.id) return;
      const mx = e.clientX - start.x, my = e.clientY - start.y;
      if (!dragging) {
        if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { start = null; return; }
        if (Math.abs(mx) < 10) return;
        dragging = true; try { drawer.setPointerCapture(e.pointerId); } catch (err) {} drawer.style.transition = "none";
      }
      dx = mx > 0 ? mx : rubber(mx, width());
      drawer.style.transform = `translateX(${dx}px)`;
      overlay.style.opacity = String(Math.max(0, 1 - Math.max(0, dx) / width()));
      hist.push({ x: e.clientX, t: e.timeStamp }); if (hist.length > 6) hist.shift();
    });
    const end = (e) => {
      if (!start || (e && e.pointerId !== start.id)) return;
      start = null; if (!dragging) return; dragging = false;
      const a = hist[0], b = hist[hist.length - 1], dt = Math.max(1, b.t - a.t);
      const v = ((b.x - a.x) / dt) * 1000;
      const projected = dx + (v / 1000) * 0.998 / (1 - 0.998);
      drawer.style.transition = ""; overlay.style.opacity = ""; drawer.style.transform = "";
      if (projected > width() / 2) closeDrawer();
    };
    drawer.addEventListener("pointerup", end);
    drawer.addEventListener("pointercancel", end);
  })();

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
        <a class="line__img" href="${productUrl(p)}">${img(p)}</a>
        <div><h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3><p>${esc(p.sub)}</p>
          <div class="qty"><button data-qty="-1" aria-label="Decrease quantity">−</button><span>${q}</span><button data-qty="1" aria-label="Increase quantity">+</button></div>
        </div>
        <div class="line__end"><span>${fmt(p.price * q)}</span><button class="text-btn" data-remove>Remove</button></div>
      </div>`).join("") : `<p class="empty">Your cart is empty.</p>`;
  }
  $("#cartBody").addEventListener("click", (e) => {
    const line = e.target.closest(".line"); if (!line) return;
    const id = line.dataset.id, q = e.target.closest("[data-qty]");
    if (q) setQty(id, (cart[id] || 0) + Number(q.dataset.qty));
    if (e.target.closest("[data-remove]")) setQty(id, 0);
    if (e.target.closest("a")) closeDrawer();
  });
  $("#checkoutBtn").addEventListener("click", () => { closeDrawer(); openCheckout(); });

  /* ---------- Checkout modal ---------- */
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

  function openCheckout() {
    const items = cartItems(); if (!items.length) return;
    const sub = subtotal(), ship = sub >= FREE_SHIP ? 0 : SHIPPING;
    openModal(`
      <div class="checkout">
        <form id="coForm" novalidate>
          <h2>Checkout</h2>
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
          <button class="btn btn--block" type="submit">Place order</button>
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
      modalContent.innerHTML = `<div class="confirm"><h2>Thank you, ${esc(name)}.</h2><p>Your order ${order} has been received.</p><button class="btn" id="confirmDone">Continue</button></div>`;
      $("#confirmDone").addEventListener("click", closeModal);
    });
  }

  /* ---------- Toast, newsletter, year ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  const news = $("#newsForm");
  if (news) news.addEventListener("submit", (e) => {
    e.preventDefault();
    const i = $("#newsEmail"), s = $("#newsStatus");
    if (!i.checkValidity() || !i.value.trim()) { s.textContent = "Enter a valid email."; return; }
    s.textContent = "Subscribed. Thank you."; i.value = "";
  });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Page ---------- */
  if (PAGE === "home") { renderHero(); renderProducts(PRODUCTS.slice(0, 8), "#grid"); }
  if (PAGE === "shop") { renderProducts(PRODUCTS, "#grid"); const c = $("#shopCount"); if (c) c.textContent = `${PRODUCTS.length} products`; }
  if (PAGE === "product") renderProductPage();
  renderCart();
  if (location.hash && PAGE === "home") { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
}

fetch("products.json")
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((db) => {
    CURRENCY = db.currencySymbol || "£";
    FREE_SHIP = db.freeShippingOver ?? FREE_SHIP;
    SHIPPING = db.shippingFlat ?? SHIPPING;
    PRODUCTS = db.products.map((p) => ({ ...p, sub: p.subtitle }));
    boot();
  })
  .catch(() => {
    const g = $("#grid") || $("#product");
    if (g) g.innerHTML = '<p class="empty">Products could not be loaded. Open this site through a web server rather than as a local file.</p>';
  });
