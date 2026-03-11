// ==UserScript==
// @name        animehdzero no ad vid
// @namespace   Violentmonkey Scripts
// @match       https://anime-hdzero.com/*
// @grant       none
// @version     1.0
// @author      -
// @description 12/24/2025, 7:17:19 PM
// ==/UserScript==

(() => {
  "use strict";

  // ===== CONFIG =====
  const TARGET_HOST = "anime-hdzero.com";
  const APPEND_TEXT = "&mirror=true"; // literal, even without '?'

  // Match rule:
  // - same host
  // - path has at least 2 segments like /a/b (covers strings/digits combos)
  const shouldRewrite = (urlObj) => {
    if (urlObj.hostname !== TARGET_HOST) return false;
    if (!urlObj.href.includes("/watch/")){
      return false;
    }
    return true;
  };
  // ==================

  function rewriteHref(rawHref) {
    if (!rawHref) return null;

    const lower = rawHref.trim().toLowerCase();
    if (
      lower.startsWith("#") ||
      lower.startsWith("javascript:") ||
      lower.startsWith("mailto:") ||
      lower.startsWith("tel:")
    ) return null;

    let url;
    try {
      url = new URL(rawHref, location.href);
    } catch {
      return null;
    }
    if (!shouldRewrite(url)) return null;
    const full = url.toString();

    // Don't duplicate if already present (case-insensitive check)
    if (full.toLowerCase().includes(APPEND_TEXT.toLowerCase())) return full;

    // Insert before #hash if present
    const hashIndex = full.indexOf("#");
    if (hashIndex !== -1) {
      return full.slice(0, hashIndex) + APPEND_TEXT + full.slice(hashIndex);
    }
    return full + APPEND_TEXT;
  }

  function rewriteAllLinks(root = document) {
    const links = root.querySelectorAll?.("a[href]") ?? [];
    for (const a of links) {
      const original = a.getAttribute("href");
      const newHref = rewriteHref(original);
      if (newHref && newHref !== a.href) {
        a.href = newHref;
      }
    }
  }

  // Rewrite existing links
  rewriteAllLinks();

  // Rewrite links added later (SPAs / infinite scroll)
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        rewriteAllLinks(node);
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Safety: rewrite right before navigation (some sites mutate href on click)
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target?.closest?.("a[href]");
      if (!a) return;
      const newHref = rewriteHref(a.getAttribute("href"));
      if (newHref) a.href = newHref;
    },
    true
  );
})();
