// Reload the page when a newer version of the site has been published.
//
// A page saved to the iPhone Home Screen has no refresh button, and iOS
// resumes it from memory instead of reloading it, so without this it keeps
// showing whatever version it was first opened with.
//
// There is no build step here, so no file name changes from one version to
// the next. What does change is the publish time: GitHub Pages stamps every
// file with the time of the deploy and sends it as the Last-Modified header.
// The browser remembers that time for the page on screen
// (document.lastModified), so a newer time on the live site means a newer
// version is out.
(function () {
  "use strict";

  var MIN_INTERVAL_MS = 60000;
  var RELOADED_FOR_KEY = "landing-reloaded-for";

  // When the copy of the page now on screen was published. Without a
  // Last-Modified header the browser reports the current time instead, which
  // can never look older than the live site, so the check simply stays quiet.
  var current = Date.parse(document.lastModified);
  if (!current || !/^https?:$/.test(location.protocol)) return;

  var lastCheck = 0;

  // Never reload under someone typing, or while the cards are being rearranged.
  function busy() {
    var active = document.activeElement;
    return /^(INPUT|TEXTAREA|SELECT)$/.test((active && active.tagName) || "") ||
      document.body.classList.contains("arranging");
  }

  // Never reload twice for the same version: guards against a reload loop if
  // a stale copy of the page keeps coming back.
  function alreadyReloadedFor(live) {
    try {
      if (sessionStorage.getItem(RELOADED_FOR_KEY) === String(live)) return true;
      sessionStorage.setItem(RELOADED_FOR_KEY, String(live));
      return false;
    } catch (e) {
      return true; // storage unavailable: without the guard, do not reload at all
    }
  }

  // The browser keeps this site's style sheet and scripts for ten minutes.
  // Fetch fresh copies first, so the reloaded page does not pair new HTML
  // with old files.
  function refreshFiles() {
    var nodes = document.querySelectorAll('link[rel="stylesheet"][href], script[src]');
    var jobs = [];
    for (var i = 0; i < nodes.length; i++) {
      var url = nodes[i].href || nodes[i].src;
      if (url.indexOf(location.origin + "/") !== 0) continue;
      jobs.push(fetch(url, { cache: "reload" }).catch(function () {}));
    }
    return Promise.all(jobs);
  }

  function check() {
    if (document.visibilityState !== "visible" || Date.now() - lastCheck < MIN_INTERVAL_MS) return;
    lastCheck = Date.now();
    fetch(location.pathname, { method: "HEAD", cache: "no-store" })
      .then(function (response) {
        var live = response.ok ? Date.parse(response.headers.get("Last-Modified") || "") : NaN;
        // Both times are whole seconds; anything not clearly newer is the same version.
        if (!live || live - current < 1000) return;
        if (busy() || alreadyReloadedFor(live)) return;
        return refreshFiles().then(function () { location.reload(); });
      })
      .catch(function () {}); // offline: try again on the next resume
  }

  // Both events, because iOS does not reliably fire either one alone when a
  // Home Screen page is resumed; the one-minute limit collapses the pair.
  document.addEventListener("visibilitychange", check);
  window.addEventListener("pageshow", check);
  check();
})();
