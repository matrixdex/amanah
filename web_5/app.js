/* Amanah Health Products, Bento (web_5) storefront logic.
   Products come from products.json (the product database); their images live in assets/products/.
   products.json is loaded with fetch(), so open the site through a web server (not file://). */

const THEME = { layout: "grid" };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let PRODUCTS = [], CATS = { all: "All" }, FREE_SHIP = null, SHIPPING = 10, CURRENCY = "£";
const CART_KEY = "amanah-cart";
const fmt = (n) => CURRENCY + n.toFixed(2);
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const benefit = (p) => (p.benefits && p.benefits[0] ? p.benefits[0].title : "");

/* Product photography */
function art(p) {
  return `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.name)}" loading="lazy" decoding="async" />`;
}

/* ---------- Full-screen menu (mobile) ---------- */
let lastPoint = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener("pointerdown", (e) => { lastPoint = { x: e.clientX, y: e.clientY }; }, { capture: true, passive: true });
(() => {
  const menu = document.getElementById("menu"), btn = document.querySelector(".menu-btn");
  if (!menu || !btn) return;
  const closeBtn = menu.querySelector(".menu__close");
  let hideTimer = 0;
  const focusables = () => [...menu.querySelectorAll("a, button")];
  function openMenu() {
    clearTimeout(hideTimer);
    const r = btn.getBoundingClientRect();
    menu.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;   /* grows out of the button */
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
  menu.addEventListener("click", (e) => {
    if (e.target.closest(".menu__links a, .menu__logo")) closeMenu(false);
    if (e.target.closest(".menu__cart")) closeMenu(false);
  });
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
  if (filters) filters.hidden = true;
  if (filters) filters.innerHTML = Object.entries(CATS).map(([k, v]) =>
    `<button class="filter${k === "all" ? " is-active" : ""}" role="tab" aria-selected="${k === "all"}" data-cat="${k}">${v}</button>`).join("");
  if (filters) filters.addEventListener("click", (e) => {
    const f = e.target.closest(".filter"); if (!f) return;
    filter = f.dataset.cat;
    $$(".filter", filters).forEach((b) => { const on = b === f; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", on); });
    renderGrid();
  });

  /* Product markup, designs can pick a layout via STORE_THEME.layout: "grid" (default), "list" or "table" */
  function cardHTML(p, i) {
    const num = String(i + 1).padStart(2, "0");
    if (THEME.layout === "list") return `
      <article class="card row" data-id="${p.id}">
        <span class="row__num">No. ${num}</span>
        <button class="row__name" data-action="view">${esc(p.name)}<em class="benefit-line">${esc(benefit(p))}</em></button>
        <span class="row__price">${fmt(p.price)}</span>
        <button class="row__add" data-action="add">Add to cart</button>
        <div class="row__img" aria-hidden="true">${art(p)}</div>
      </article>`;
    if (THEME.layout === "table") return `
      <article class="card cell" data-id="${p.id}">
        <div class="cell__top"><span>${num}</span><span>${CATS[p.cat]}</span></div>
        <button class="cell__media" data-action="view" aria-label="View ${esc(p.name)}">${art(p)}</button>
        <div class="cell__foot"><button class="cell__name" data-action="view">${esc(p.name)}<small class="benefit-line">${esc(benefit(p))}</small></button><span class="cell__price">${fmt(p.price)}</span></div>
        <button class="cell__add" data-action="add">+ Add to cart</button>
      </article>`;
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media">
          <button class="card__view" data-action="view" aria-label="View ${esc(p.name)}" style="display:grid;place-items:center;height:100%">${art(p)}</button>
          <button class="card__add" data-action="add">Add to cart</button>
        </div>
        <button class="card__view" data-action="view" tabindex="-1">
          <div class="card__info">
            <div><h3>${esc(p.name)}</h3><p class="card__benefit">${esc(benefit(p))}</p></div>
            <span class="card__price">${fmt(p.price)}</span>
          </div>
        </button>
      </article>`;
  }
  function renderGrid(target = grid, list = PRODUCTS.filter((p) => filter === "all" || p.cat === filter)) {
    if (target) target.innerHTML = list.map(cardHTML).join("");
  }
  [grid, $("#moreGrid")].filter(Boolean).forEach((g) => g.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]"); if (!btn) return;
    const id = btn.closest(".card").dataset.id;
    if (btn.dataset.action === "add") addToCart(id); else openProduct(id);
  }));

  /* ---------- Hero ---------- */
  if ($("#heroArt")) $("#heroArt").innerHTML = '<img src="assets/hero.jpg" alt="The Amanah Health Products range: Overnight Breakfast Muesli, Detox Powder, Joint Support Oil, Bowel Ease Concept and TGF Powder" width="1600" height="900" />';

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
        if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { start = null; return; }  /* it's a scroll */
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
      const v = ((b.x - a.x) / dt) * 1000;                                 /* px/s */
      const projected = dx + (v / 1000) * 0.998 / (1 - 0.998);
      drawer.style.transition = ""; overlay.style.opacity = "";
      drawer.style.transform = "";
      if (projected > width() / 2) closeDrawer();
    };
    drawer.addEventListener("pointerup", end);
    drawer.addEventListener("pointercancel", end);
  })();

  function renderCart() {
    const items = cartItems(), sub = subtotal();
    $$("[data-cart-count]").forEach((el) => (el.textContent = items.reduce((s, i) => s + i.q, 0)));
    /* Shipping & Delivery sits on its own row above the subtotal, and the subtotal includes it. */
    const ship = !items.length ? 0 : (FREE_SHIP != null && sub >= FREE_SHIP ? 0 : SHIPPING);
    $("#shipRow").hidden = !items.length;
    $("#shipText").textContent = ship ? fmt(ship) : "Free";
    $("#subtotal").textContent = fmt(sub + ship);
    $("#checkoutBtn").disabled = !items.length;
    $("#cartBody").innerHTML = items.length ? items.map(({ p, q }) => `
      <div class="line" data-id="${p.id}">
        <div class="line__img">${art(p)}</div>
        <div><h3>${esc(p.name)}</h3>
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
  });
  $("#checkoutBtn").addEventListener("click", () => { closeDrawer(); openCheckout(); });

  /* ---------- Modal ---------- */
  function openModal(html) {
    if (!modal.classList.contains("is-open")) {
      lastFocus = document.activeElement;
      const panel = $(".modal__panel"), r = panel.getBoundingClientRect();
      panel.style.transformOrigin = `${lastPoint.x - r.left}px ${lastPoint.y - r.top}px`;
    }
    modalContent.innerHTML = html;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    $(".modal__close").focus();
  }
  function closeModal() {
    $(".modal__panel").classList.remove("is-confirm");
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

  function openProduct(id) { location.href = "product.html?id=" + encodeURIComponent(id); }

  /* ---------- Checkout: Stripe embedded payment form ---------- */
  const STRIPE_APPEARANCE = {
    theme: "flat",
    labels: "auto",
    inputs: "condensed",
    variables: {
      borderRadius: "4px",
      colorBackground: "#ffffff",
      colorDanger: "#df1b41",
      colorPrimary: "#0570de",
      colorSuccess: "#00c853",
      colorText: "#30313d",
      fontFamily: "Geist, system-ui, sans-serif",
      fontSizeBase: "16px",
      spacingUnit: "4px"
    }
  };
  function orderComplete() {
    cart = {}; saveCart(); renderCart();
    openModal(`<div class="confirm"><h2>Thank you.</h2><p>Your order has been received. A receipt is on its way to your email.</p><button class="btn" id="confirmDone">Close</button></div>`);
    $(".modal__panel").classList.add("is-confirm");     /* one Close button only: hide the corner one */
    $("#confirmDone").addEventListener("click", closeModal);
  }
  /* Back from a payment method that redirected: check the session's status before confirming the order. */
  (async () => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    if (params.get("checkout") !== "complete" || !sessionId) return;
    history.replaceState(null, "", location.pathname + location.hash);
    try {
      const res = await fetch("/api/session-status?session_id=" + encodeURIComponent(sessionId));
      const data = await res.json();
      if (data.status === "complete") orderComplete();
      else toast("Your payment was not completed.");
    } catch (e) { toast("We could not confirm your payment. Please check your email for a receipt."); }
  })();
  async function openCheckout() {
    const items = cartItems(); if (!items.length) return;
    const sub = subtotal();
    openModal(`
      <div class="checkout">
        <div class="checkout__pay">
          <h2>Checkout</h2>
          <div id="checkout-form" class="checkout__form"><p class="checkout__loading">Loading secure payment form…</p></div>
          <p class="form-error" id="coError" role="alert"></p>
        </div>
        <aside class="summary">
          <h3>Summary</h3>
          ${items.map(({ p, q }) => `<div class="summary__line"><span>${esc(p.name)} × ${q}</span><span>${fmt(p.price * q)}</span></div>`).join("")}
          <div class="summary__line"><span>Shipping &amp; Delivery</span><span>${fmt(SHIPPING)}</span></div>
          <div class="summary__line summary__total"><span>Total</span><span>${fmt(sub + SHIPPING)}</span></div>
        </aside>
      </div>`);
    const showError = (msg) => { const e = $("#coError"); if (e) e.textContent = msg; const l = $(".checkout__loading"); if (l) l.remove(); };
    if (typeof Stripe !== "function") { showError("The payment form could not load. Please check your connection and try again."); return; }
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ p, q }) => ({ id: p.id, quantity: q })) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.client_secret || !data.publishable_key) throw new Error(data.error || "Checkout could not be started. Please try again.");
      const stripe = Stripe(data.publishable_key);
      const checkout = stripe.initCheckoutFormSdk({
        clientSecret: Promise.resolve(data.client_secret),
        appearance: STRIPE_APPEARANCE,
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" }]
      });
      if (!$("#checkout-form")) return;                       /* the checkout was closed while loading */
      $("#checkout-form").innerHTML = "";
      const form = checkout.createForm({ layout: "expanded" });
      form.mount("#checkout-form");
      const loadActionsResult = await checkout.loadActions();
      if (loadActionsResult.type !== "success") throw new Error("Checkout could not be started. Please try again.");
      form.on("confirm", async (event) => {
        showError("");
        try {
          /* Cards finish here without leaving the page; methods that need a redirect come back via return_url. */
          const result = await loadActionsResult.actions.confirm({ formConfirmEvent: event, redirect: "if_required" });
          if (result && result.type === "error") { showError(result.error.message); return; }
          orderComplete();
        } catch (error) {
          console.error("Payment confirmation error:", error);
          showError(error && error.message ? error.message : "Your payment could not be completed. Please try again.");
        }
      });
    } catch (err) {
      showError(err.message);
    }
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

  if ($("#newsForm")) $("#newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const i = $("#newsEmail"), s = $("#newsStatus");
    if (!i.checkValidity() || !i.value.trim()) { s.textContent = "Enter a valid email."; return; }
    s.textContent = "Subscribed. Thank you."; i.value = "";
  });

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Product page ---------- */
  function renderProductPage() {
    const host = $("#product"); if (!host) return;
    const p = byId(new URLSearchParams(location.search).get("id"));
    if (!p) {
      host.innerHTML = '<div class="pp-missing"><h1>Product not found</h1><a class="btn" href="shop.html">Shop All</a></div>';
      return;
    }
    document.title = `${p.name} - Amanah Health Products`;
    const md = document.querySelector('meta[name="description"]'); if (md) md.content = `${p.name}: ${p.desc}`.slice(0, 200);
    const ld = document.createElement("script"); ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.desc, image: new URL(p.image, location.href).href, brand: { "@type": "Brand", name: "Amanah Health Products" },
      offers: { "@type": "Offer", priceCurrency: "GBP", price: p.price.toFixed(2), availability: "https://schema.org/InStock" } });
    document.head.appendChild(ld);
    let qty = 1;
    const details = [["Ingredients", p.ingredients], ["Directions", p.directions], ["Warnings", p.warnings], ["Storage", p.storage]].filter((r) => r[1]);
    host.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="shop.html">Shop</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.name)}</span></nav>
      <div class="pdp pdp--page">
        <div class="pdp__media">${art(p)}</div>
        <div class="pdp__info">
          <h1>${esc(p.name)}</h1>
          <p class="pdp__sub">${esc(p.sub)}</p>
          <p class="pdp__price">${fmt(p.price)}</p>
          <p class="pdp__desc">${esc(p.desc)}</p>
          <div class="pdp__buy">
            <div class="qty"><button data-q="-1" aria-label="Decrease quantity">−</button><span id="pdpQty">1</span><button data-q="1" aria-label="Increase quantity">+</button></div>
            <button class="btn" id="pdpAdd">Add to cart</button>
          </div>
          <div class="benefits" aria-label="Health benefits"><ul>${(p.benefits || []).map((b) => `<li><strong>${esc(b.title)}</strong><span>${esc(b.text)}</span></li>`).join("")}</ul></div>
          <div class="details">${details.map(([k, v]) => `<details><summary>${k}</summary><p>${esc(v)}</p></details>`).join("")}</div>
        </div>
      </div>`;
    $$("[data-q]", host).forEach((b) => b.addEventListener("click", () => {
      qty = Math.max(1, Math.min(20, qty + Number(b.dataset.q)));
      $("#pdpQty").textContent = qty;
    }));
    $("#pdpAdd").addEventListener("click", () => addToCart(p.id, qty));
    const others = PRODUCTS.filter((o) => o.id !== p.id);
    if (others.length) { $("#more").hidden = false; renderGrid($("#moreGrid"), others); }
  }
  /* ---------- Health Benefits page ---------- */
  function renderBenefitsPage() {
    const host = $("#benefitsList"); if (!host) return;
    host.innerHTML = PRODUCTS.filter((p) => p.available !== false).map((p) => `
      <article class="bp" id="${esc(p.id)}">
        <a class="bp__media" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}">${art(p)}</a>
        <div class="bp__body">
          <h2>${esc(p.name)}</h2>
          <div class="benefits"><ul>${(p.benefits || []).map((b) => `<li><strong>${esc(b.title)}</strong><span>${esc(b.text)}</span></li>`).join("")}</ul></div>
          <a class="be-btn bp__btn" href="product.html?id=${encodeURIComponent(p.id)}">View Product</a>
        </div>
      </article>`).join("");
  }

  renderGrid();
  renderProductPage();
  renderBenefitsPage();
  renderCart();
}

fetch("products.json")
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((db) => {
    CURRENCY = db.currencySymbol || "£";
    FREE_SHIP = db.freeShippingOver ?? null;
    SHIPPING = db.shippingFlat ?? SHIPPING;
    db.categories.forEach((c) => { CATS[c.id] = c.name; });
    PRODUCTS = db.products.map((p) => ({ ...p, sub: p.subtitle, cat: p.category, desc: p.description }));
    boot();
  })
  .catch(() => {
    const g = document.getElementById("grid") || document.getElementById("product");
    if (g) g.innerHTML = '<p class="empty">Products could not be loaded. Open this site through a web server rather than as a local file.</p>';
  });
