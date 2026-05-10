// ==UserScript==
// @name        AutoNext-Thai
// @namespace   Violentmonkey Scripts
// @icon
// @version     1.0.0
//
// @match       https://lnwanime.com/anime/*/episode/*
// @match       https://anime-hdzero.com/anime/*/episode/*
// @grant       none
//
// @author      -
// @description
// ==/UserScript==



(function () {
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
                }

            }, 3000);
        }

        wasFullscreen = false;
    }

    document.addEventListener('fullscreenchange', tryStartTimer);
    document.addEventListener('webkitfullscreenchange', tryStartTimer);
    document.addEventListener('mozfullscreenchange', tryStartTimer);
    document.addEventListener('MSFullscreenChange', tryStartTimer);

})();