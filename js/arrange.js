/*
 * Arrange mode — drag the app cards to reorder, then copy the new order.
 *
 * Model (chosen 2026-08-24): the *committed* DOM order in index.html is the
 * shared default everyone sees. Arrange mode lets the owner drag the cards and
 * copy the resulting order to the clipboard; the owner commits that order into
 * index.html to make it the new default. Nothing is persisted per-browser, so a
 * plain reload always returns to the committed order and a casual visitor's
 * dragging is transient and never leaves their tab.
 *
 * Vanilla JS, no build step. Degrades gracefully: if Sortable failed to load,
 * the Arrange button hides itself and the page is a normal static launcher.
 */
(function () {
  "use strict";

  var list = document.querySelector(".apps");
  var toggle = document.getElementById("arrange-toggle");
  var bar = document.getElementById("arrange-bar");
  var copyBtn = document.getElementById("arrange-copy");
  var doneBtn = document.getElementById("arrange-done");

  // Nothing to do (or Sortable missing) — leave the page as a static launcher.
  if (!list || !toggle || !bar || typeof window.Sortable === "undefined") {
    if (toggle) toggle.hidden = true;
    return;
  }

  var sortable = null;

  function slugOrder() {
    return Array.prototype.map
      .call(list.querySelectorAll(".app-slug"), function (el) {
        return el.textContent.trim();
      })
      .filter(Boolean);
  }

  function enter() {
    if (sortable) return;
    document.body.classList.add("arranging");
    toggle.setAttribute("aria-pressed", "true");
    bar.hidden = false;
    sortable = window.Sortable.create(list, {
      animation: 160,
      ghostClass: "app-ghost",
      chosenClass: "app-chosen",
      dragClass: "app-drag",
      // The whole <li> is the handle; block the card's link click while arranging.
      preventOnFilter: false
    });
    // Suppress navigation on the anchors while arranging (a drag ends in a click).
    list.addEventListener("click", blockNav, true);
  }

  function exit() {
    if (sortable) {
      sortable.destroy();
      sortable = null;
    }
    list.removeEventListener("click", blockNav, true);
    document.body.classList.remove("arranging");
    toggle.setAttribute("aria-pressed", "false");
    bar.hidden = true;
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
    }, 1400);
  }

  function copyOrder() {
    var order = slugOrder().join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(order).then(
        function () { flash(copyBtn, "Copied ✓"); },
        function () { fallbackCopy(order); }
      );
    } else {
      fallbackCopy(order);
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
      flash(copyBtn, "Copied ✓");
    } catch (err) {
      flash(copyBtn, "Copy failed");
    }
    document.body.removeChild(ta);
  }

  toggle.hidden = false;
  toggle.addEventListener("click", function () {
    if (sortable) exit();
    else enter();
  });
  copyBtn.addEventListener("click", copyOrder);
  doneBtn.addEventListener("click", exit);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sortable) exit();
  });
})();
