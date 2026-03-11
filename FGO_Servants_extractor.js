// ==UserScript==
// @name         FGO Identity Extractor + Profile Scraper
// @namespace    vm-fgo-identity-profile
// @version      2.0
// @description  Extract servant links and scrape full Profile section
// @match        https://typemoon.fandom.com/wiki/List_of_Servants_in_Fate/Grand_Order*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';


/* =========================
   Extract Identity Links
========================= */

function extractIdentityLinks() {

    const rows = document.querySelectorAll('tbody tr');
    const links = [];

    rows.forEach(row => {

        const identityCell = row.querySelector('td:nth-child(3)');
        if (!identityCell) return;

        identityCell.querySelectorAll('a[href]').forEach(a => {
            links.push(a.href);
        });

    });

    if (!links.length) {
        alert("No links found.");
        return;
    }

    const output = links.join('\n');

    GM_setClipboard(output);

    console.log("Extracted:", links);

    alert(`Extracted ${links.length} links.\nCopied to clipboard.`);
}


/* =========================
   Flexible Input Parsing
========================= */

function parseLinks(input) {

    return input
        .replace(/["']/g, '')
        .split(/[\n,]+/)
        .map(v => v.trim())
        .filter(Boolean);

}


/* =========================
   Profile Section Extractor
========================= */

function extractProfile(doc) {

    const profileSpan = doc.querySelector('#Profile');

    if (!profileSpan) return '';

    const profileHeader = profileSpan.closest('h2');

    let node = profileHeader.nextElementSibling;

    let result = [];

    while (node) {

        // Stop at next H2 section
        if (node.tagName === 'H2') break;

        if (node.tagName === 'H3' || node.tagName === 'H4') {

            result.push(`\n## ${node.innerText.trim()}\n`);

        }

        else if (node.tagName === 'P') {

            const text = node.innerText.trim();

            if (text) result.push(text);

        }

        else if (node.tagName === 'DL') {

            node.querySelectorAll('dt').forEach(dt => {

                const dd = dt.nextElementSibling;

                if (dd && dd.tagName === 'DD') {

                    result.push(`- ${dt.innerText.trim()}: ${dd.innerText.trim()}`);

                }

            });

        }

        node = node.nextElementSibling;

    }

    return result.join('\n\n');

}


/* =========================
   Scrape Servant Pages
========================= */

async function scrapeServantPages(links) {

    const results = [];

    for (const url of links) {

        console.log("Fetching:", url);

        try {

            const res = await fetch(url);
            const html = await res.text();

            const doc = new DOMParser()
                .parseFromString(html, "text/html");

            doc.querySelectorAll('sup').forEach(el => el.remove());
            doc.querySelectorAll('.mw-editsection').forEach(el => el.remove());

            const name =
                doc.querySelector("h1.page-header__title")?.innerText.trim()
                || doc.querySelector("h1")?.innerText.trim()
                || "Unknown";

            const profile = extractProfile(doc);

            results.push({
                name,
                profile
            });

            await new Promise(r => setTimeout(r, 500));

        }

        catch (err) {

            console.error("Failed:", url, err);

        }

    }

    return results;

}


/* =========================
   Run Scraper
========================= */

async function runScraper() {

    const input = prompt(
`Paste servant links
Supports:
• newline
• comma
• quoted links`
    );

    if (!input) return;

    const links = parseLinks(input);

    if (!links.length) {

        alert("No valid links detected.");
        return;

    }

    console.log("Parsed links:", links);

    const data = await scrapeServantPages(links);

    const json = JSON.stringify(data, null, 2);

    GM_setClipboard(json);

    console.log("Scraped data:", data);

    alert(`Scraped ${data.length} servants.\nJSON copied to clipboard.`);

}


/* =========================
   Menu Commands
========================= */

GM_registerMenuCommand(
    "Extract FGO Identity Links",
    extractIdentityLinks
);

GM_registerMenuCommand(
    "Scrape Servant Profile",
    runScraper
);

})();