/*
 * Arrange mode: drag the app cards into the order you want, then tap Done.
 *
 * Model (revised 2026-09-08): the committed <li> order in index.html is the
 * shared default everyone sees. Done saves the dragged order in this browser's
 * localStorage and the page applies it on every load, so the order sticks per
 * device. Escape cancels a session's drags; "Reset to default" restores the
 * committed order (Done then clears the stored one). "Share order" copies (or
 * shares, on touch devices) a link like /?order=grocery,deer,... and opening
 * that link on another device applies the order there and saves it. Pasting
 * the link to Claude is also how the committed default gets changed.
 *
 * Vanilla JS, no build step. Degrades gracefully: if Sortable failed to load,
 * the Arrange button hides itself and the page is a normal static launcher.
 * A saved or linked order is still applied; that needs no Sortable.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "rndpig.cardOrder";
  var ORDER_PARAM = "order";
  var DOMAIN_SUFFIX = ".rndpig.com";

  var list = document.querySelector(".apps");
  var toggle = document.getElementById("arrange-toggle");
  var bar = document.getElementById("arrange-bar");
  var shareBtn = document.getElementById("arrange-share");
  var resetBtn = document.getElementById("arrange-reset");
  var doneBtn = document.getElementById("arrange-done");

  if (!list) return;

  // The <li>s as shipped in index.html, captured before any saved order is
  // applied. Reset restores this order.
  var committed = Array.prototype.slice.call(list.children);

  function slugOf(li) {
    var el = li.querySelector(".app-slug");
    return el ? el.textContent.trim() : "";
  }

  function currentOrder() {
    return Array.prototype.map.call(list.children, slugOf).filter(Boolean);
  }

  function committedOrder() {
    return committed.map(slugOf).filter(Boolean);
  }

  function sameOrder(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Links carry the short form ("grocery" for grocery.rndpig.com); accept
  // either form on the way in.
  function toLabel(slug) {
    var n = DOMAIN_SUFFIX.length;
    return slug.length > n && slug.slice(-n) === DOMAIN_SUFFIX ? slug.slice(0, -n) : slug;
  }

  function toSlug(label) {
    return label.indexOf(".") === -1 ? label + DOMAIN_SUFFIX : label;
  }

  function loadSaved() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) return null;
      return parsed.filter(function (s) { return typeof s === "string"; });
    } catch (err) {
      return null;
    }
  }

  // Storing the committed order would be redundant, so Done clears the key
  // instead; a later change to the default then shows up on this device too.
  function save(order) {
    try {
      if (sameOrder(order, committedOrder())) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
      }
    } catch (err) {
      // Storage blocked (private mode etc.): the order still holds for this tab.
    }
  }

  // Re-append the <li>s in the given slug order. Cards missing from the order
  // (an app added since it was saved) follow in their committed order; slugs
  // that no longer exist are ignored. `renumber` rewrites --i so the entrance
  // stagger follows the visual order; only wanted at load.
  function applyOrder(order, renumber) {
    var bySlug = {};
    committed.forEach(function (li) { bySlug[slugOf(li)] = li; });
    var placed = [];
    order.forEach(function (slug) {
      var li = bySlug[slug];
      if (li && placed.indexOf(li) === -1) placed.push(li);
    });
    committed.forEach(function (li) {
      if (placed.indexOf(li) === -1) placed.push(li);
    });
    placed.forEach(function (li, i) {
      list.appendChild(li);
      if (renumber) li.style.setProperty("--i", i);
    });
  }

  // An order carried in the URL (?order=grocery,deer,...) wins over the saved
  // one, becomes this device's saved order, and is then dropped from the URL
  // so a reload does not re-apply it.
  function orderFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var raw = params.get(ORDER_PARAM);
      if (raw === null) return null;
      var order = raw.split(",").map(function (s) { return s.trim(); }).filter(Boolean).map(toSlug);
      params.delete(ORDER_PARAM);
      var qs = params.toString();
      var clean = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
      window.history.replaceState(null, "", clean);
      return order.length ? order : null;
    } catch (err) {
      return null;
    }
  }

  // Apply a linked or saved order on every load, before the entrance
  // animation runs.
  var linked = orderFromUrl();
  if (linked) {
    // Keep only cards that exist here so junk in a link is never stored.
    var known = committedOrder();
    linked = linked.filter(function (s) { return known.indexOf(s) !== -1; });
    if (linked.length) save(linked);
    else linked = null;
  }
  var initial = linked || loadSaved();
  if (initial && initial.length && !sameOrder(initial, committedOrder())) {
    applyOrder(initial, true);
  }

  // Nothing to arrange (or Sortable missing): leave the page as a static launcher.
  if (!toggle || !bar || !doneBtn || typeof window.Sortable === "undefined") {
    if (toggle) toggle.hidden = true;
    return;
  }

  var sortable = null;
  var orderAtEntry = null;

  function updateReset() {
    if (resetBtn) resetBtn.hidden = sameOrder(currentOrder(), committedOrder());
  }

  function enter() {
    if (sortable) return;
    orderAtEntry = currentOrder();
    document.body.classList.add("arranging");
    toggle.setAttribute("aria-pressed", "true");
    bar.hidden = false;
    updateReset();
    sortable = window.Sortable.create(list, {
      animation: 160,
      ghostClass: "app-ghost",
      chosenClass: "app-chosen",
      dragClass: "app-drag",
      onEnd: updateReset
    });
    // Suppress navigation on the anchors while arranging (a drag ends in a click).
    list.addEventListener("click", blockNav, true);
  }

  function leave() {
    if (sortable) {
      sortable.destroy();
      sortable = null;
    }
    list.removeEventListener("click", blockNav, true);
    document.body.classList.remove("arranging");
    toggle.setAttribute("aria-pressed", "false");
    bar.hidden = true;
    orderAtEntry = null;
  }

  function done() {
    if (!sortable) return;
    save(currentOrder());
    leave();
  }

  function cancel() {
    if (!sortable) return;
    if (orderAtEntry) applyOrder(orderAtEntry, false);
    leave();
  }

  function reset() {
    applyOrder(committedOrder(), false);
    updateReset();
  }

  function blockNav(e) {
    var link = e.target.closest("a.app");
    if (link) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function flash(btn, text) {
    var original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    btn.textContent = text;
    window.setTimeout(function () {
      btn.textContent = btn.dataset.label;
    }, 1600);
  }

  function shareLink() {
    var labels = currentOrder().map(toLabel).join(",");
    return window.location.origin + window.location.pathname + "?" + ORDER_PARAM + "=" + labels;
  }

  // Touch devices get the native share sheet (AirDrop, Messages, ...); a
  // pointer device just gets the link on the clipboard.
  function shareOrder() {
    var url = shareLink();
    var touch = window.matchMedia && window.matchMedia("(hover: none)").matches;
    if (touch && navigator.share) {
      navigator.share({ title: "rndpig app order", url: url }).then(
        function () { flash(shareBtn, "Shared ✓"); },
        function (err) {
          if (!err || err.name !== "AbortError") copyText(url);
        }
      );
    } else {
      copyText(url);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { flash(shareBtn, "Link copied ✓"); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      flash(shareBtn, "Link copied ✓");
    } catch (err) {
      flash(shareBtn, "Copy failed");
    }
    document.body.removeChild(ta);
  }

  toggle.hidden = false;
  // The header toggle doubles as Done while arranging: a second tap on
  // "Arrange" should keep the work, not throw it away.
  toggle.addEventListener("click", function () {
    if (sortable) done();
    else enter();
  });
  doneBtn.addEventListener("click", done);
  if (resetBtn) resetBtn.addEventListener("click", reset);
  if (shareBtn) shareBtn.addEventListener("click", shareOrder);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sortable) cancel();
  });
})();
