// ==UserScript==
// @name        AutoNext-Eng
// @namespace   Violentmonkey Scripts
// @icon        https://animepahe.pw/favicon.ico
// @version     1.0.0
//
// @match       https://animepahe.pw/play/*
// @grant       none
//
// @author      -
// @description
// ==/UserScript==


(function () {
    'use strict';


window.addEventListener('load', () => {
    const div = document.querySelector('div.click-to-load');

    if (div) div.click();
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
                .find(a => a.title.includes('Play Next Episode'));

              if(!nextLink) console.log("No Next Link");
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