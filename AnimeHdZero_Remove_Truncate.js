// ==UserScript==
// @name        Remove truncate and Fix Font Size
// @namespace   Violentmonkey Scripts
// @icon        https://animehdzeroo.net/favicon.png
// @version     1.0.0
//
// @match       https://animehdzeroo.net/*
// @grant       none
//
// @author      -
// @description
// ==/UserScript==



(function() {
    'use strict';

    function removeTruncateClass() {
        document.querySelectorAll('.truncate').forEach(el => {
            el.classList.remove('truncate');
        });
    }

    function fixAccentOpacity() {
        document.querySelectorAll('[style]').forEach(el => {
            let style = el.getAttribute('style');

            if (style && style.includes('hsl(var(--accent) / 0.15)')) {
                el.setAttribute(
                    'style',
                    style.replace(/hsl\(var\(--accent\)\s*\/\s*0\.15\)/g, 'hsl(var(--accent) / 0.5)')
                );
            }
            if (style && style.includes('clamp(')) {
                el.setAttribute(
                    'style',
                    style.replace(
                        /clamp\(\s*([\d.]+px)\s*,\s*([\d.]+vw)\s*,\s*[\d.]+px\s*\)/g,
                        'clamp($1, $2, 24px)'
                    )
                );
            }
        });
    }

    function runAll() {
        removeTruncateClass();
        fixAccentOpacity();
    }

    // Run on initial load
    runAll();

    // Observe DOM changes
    const observer = new MutationObserver(() => {
        runAll();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
