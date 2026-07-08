// ==UserScript==
// @name        AutoNext-Thai
// @namespace   Violentmonkey Scripts
// @icon
// @version     1.0.0
//
// @match       https://lnwani-me.com/anime/*/episode/*
// @match       https://animehdzeroo.net/anime/*/episode/*
// @grant       none
//
// @author      -
// @description
// ==/UserScript==



(function() {
    'use strict';

    window.addEventListener('load', () => {
        // Change this selector to your button
        const button = [...document.querySelectorAll('button')]
            .find(btn => btn.textContent.includes('ตัวเล่นสำรอง'));

        if (button) button.click();


    });


    let timeoutId = null;
    let wasFullscreen = false;

    function isFullscreen() {
        return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;
    }

    function tryStartTimer() {
        // if we are currently fullscreen, just mark state
        if (isFullscreen()) {
            wasFullscreen = true;
            return;
        }

        // if we just exited fullscreen, start delay
        if (wasFullscreen) {
            console.log('Exited fullscreen → starting 3s timer');

            clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {

                // IMPORTANT: if user went fullscreen again, cancel
                if (isFullscreen()) {
                    console.log('User re-entered fullscreen → cancel click');
                    return;
                }

                const nextLink = [...document.querySelectorAll('a')]
                    .find(a => a.textContent.includes('ถัดไป'));

                if (nextLink) {
                    console.log('Clicking Next');
                    nextLink.click();
                } else {
                    console.log('No Next')
                }

            }, 3000);
        }

        wasFullscreen = false;
    }

    document.addEventListener('fullscreenchange', tryStartTimer);
    document.addEventListener('webkitfullscreenchange', tryStartTimer);
    document.addEventListener('mozfullscreenchange', tryStartTimer);
    document.addEventListener('MSFullscreenChange', tryStartTimer);

    let lastUrl = location.href;

    function updatePage() {
        if (location.pathname.includes('episode')) {
            document.documentElement.style.overflow = "hidden";
            document.body.style.overflow = "hidden";
        } else {
            document.documentElement.style.overflow = "";
            document.body.style.overflow = "";
        }
    }

    updatePage();

    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            updatePage();
        }
    }).observe(document, {
        subtree: true,
        childList: true
    });

})();
