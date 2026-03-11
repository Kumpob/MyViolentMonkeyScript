// ==UserScript==
// @name         MAL Fill Dates From History
// @match        https://myanimelist.net/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

'use strict';

const STATE_KEY = 'mal_autofill_state_v3';

function setState(s) { GM_setValue(STATE_KEY, s); }
function getState() { return GM_getValue(STATE_KEY, null); }
function clearState() { GM_setValue(STATE_KEY, null); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseUSDate(s) {
  const [m, d, y] = s.split('/').map(Number);
  return { y, m, d };
}
function dateKey(o) { return o.y * 10000 + o.m * 100 + o.d; }

function getAnimeIdsFromCompletedListPage() {
  const links = [...document.querySelectorAll('a[href*="/ownlist/anime/"][href*="/edit"]')];
  const ids = links.map(a => {
    const m = a.href.match(/\/ownlist\/anime\/(\d+)\/edit/);
    return m ? m[1] : null;
  }).filter(Boolean);
  return [...new Set(ids)];
}

function advanceQueue(state) {
  state.animeQueue.shift();
  state.start = null;
  state.finish = null;

  if (!state.animeQueue.length) {
    clearState();
    alert('MAL Autofill finished.');
    return;
  }

  state.currentId = state.animeQueue[0];
  state.step = 'edit';
  setState(state);

  location.href = `https://myanimelist.net/ownlist/anime/${state.currentId}/edit?hideLayout`;
}

async function startFromList() {
  const ids = getAnimeIdsFromCompletedListPage();
  if (!ids.length) {
    alert('No anime edit links found on this page.\nOpen your completed list page (e.g. ?status=2) then run again.');
    return;
  }

  setState({
    running: true,
    animeQueue: ids,
    currentId: ids[0],
    step: 'edit',
    start: null,
    finish: null
  });

  location.href = `https://myanimelist.net/ownlist/anime/${ids[0]}/edit?hideLayout`;
}

/* ========= EDIT PAGE ========= */
async function handleEditPage(state) {
  const sy = document.querySelector('select[name="add_anime[start_date][year]"]')?.value;
  const fy = document.querySelector('select[name="add_anime[finish_date][year]"]')?.value;

  const alreadySet =
    sy && sy !== '0' && sy !== '' &&
    fy && fy !== '0' && fy !== '';

  if (alreadySet) {
    advanceQueue(state);
    return;
  }

  state.step = 'history';
  setState(state);

  location.href =
    `https://myanimelist.net/ajaxtb.php?keepThis=true&detailedaid=${state.currentId}&TB_iframe=true&height=420&width=390`;
}

/* ========= HISTORY PAGE ========= */
async function handleHistoryPage(state) {
  const text = document.body?.innerText || '';
  const matches = [...text.matchAll(/watched on (\d{1,2}\/\d{1,2}\/\d{4})/g)];

  if (!matches.length) {
    advanceQueue(state);
    return;
  }

  const dates = matches
    .map(m => parseUSDate(m[1]))
    .sort((a, b) => dateKey(a) - dateKey(b));

  state.start = dates[0];
  state.finish = dates[dates.length - 1];
  state.step = 'submit';
  setState(state);

  location.href = `https://myanimelist.net/ownlist/anime/${state.currentId}/edit?hideLayout`;
}

/* ========= SUBMIT PAGE ========= */
async function handleSubmitPage(state) {
  // 0) If we already landed on the success page somehow, just continue
  const bodyText = document.body?.innerText || '';
  if (bodyText.includes('Successfully updated entry')) {
    advanceQueue(state);
    return;
  }

  const { start, finish } = state;
  if (!start || !finish) {
    advanceQueue(state);
    return;
  }

  // 1) Wait for the form/selects to exist (up to ~10s)
  let tries = 0;
  while (tries < 40) {
    const hasStartYear = !!document.querySelector('select[name="add_anime[start_date][year]"]');
    const hasFinishYear = !!document.querySelector('select[name="add_anime[finish_date][year]"]');
    if (hasStartYear && hasFinishYear) break;
    await sleep(250);
    tries++;
  }

  // If still not there, maybe MAL served a different page (rate limit / etc.)
  if (!document.querySelector('select[name="add_anime[start_date][year]"]')) {
    // If it's success, continue; otherwise stop safely.
    const t = document.body?.innerText || '';
    if (t.includes('Successfully updated entry')) {
      advanceQueue(state);
      return;
    }
    alert('Edit form not found on this page. Stopping here.');
    return;
  }

  function setSelect(name, val) {
    const el = document.querySelector(`select[name="${name}"]`);
    if (!el) return false;
    el.value = String(val);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // 2) Fill start/finish
  setSelect('add_anime[start_date][month]', start.m);
  setSelect('add_anime[start_date][day]', start.d);
  setSelect('add_anime[start_date][year]', start.y);

  setSelect('add_anime[finish_date][month]', finish.m);
  setSelect('add_anime[finish_date][day]', finish.d);
  setSelect('add_anime[finish_date][year]', finish.y);

  await sleep(200);

  // 3) Find submit in MANY possible ways
  const candidates = [
    document.querySelector('input.main_submit'),
    document.querySelector('input.inputButton.main_submit'),
    document.querySelector('button.main_submit'),
    document.querySelector('.main_submit'),
    ...document.querySelectorAll('input[type="button"]'),
    ...document.querySelectorAll('input[type="submit"]'),
    ...document.querySelectorAll('button'),
  ].filter(Boolean);

  const submitBtn = candidates.find(el => {
    const v = (el.value || el.textContent || '').trim().toLowerCase();
    return v === 'submit';
  });

  // 4) If no submit found, check again if we are on success page, else stop.
  if (!submitBtn) {
    const t = document.body?.innerText || '';
    if (t.includes('Successfully updated entry')) {
      advanceQueue(state);
      return;
    }
    console.warn('Submit not found. URL:', location.href);
    alert('Submit button not found on this edit page.\nStopping here (open console for URL).');
    return;
  }

  // 5) Click submit
  submitBtn.click();

  // 6) Wait for success message (up to ~10s), then continue
  for (let i = 0; i < 40; i++) {
    const t = document.body?.innerText || '';
    if (t.includes('Successfully updated entry')) break;
    await sleep(250);
  }

  advanceQueue(state);
}


/* ========= CONTROL PANEL ========= */
function openControlPanel() {
  // If already open, do nothing
  if (document.getElementById('mal-auto-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'mal-auto-panel';
  panel.style.cssText = `
    position: fixed;
    right: 16px;
    bottom: 16px;
    width: 360px;
    z-index: 999999;
    background: #111;
    color: #eee;
    border: 1px solid #333;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,.5);
    font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #333;
    cursor: move;
    user-select: none;
  `;
  header.innerHTML = `<strong>MAL Autofill Control Panel</strong>`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: transparent;
    color: #eee;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 0 6px;
  `;
  closeBtn.onclick = () => panel.remove();
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.style.cssText = `padding: 10px 12px;`;

  const status = document.createElement('div');
  status.style.cssText = `margin-bottom: 10px; color:#bbb; white-space: pre-wrap;`;

  const btnRow = document.createElement('div');
  btnRow.style.cssText = `display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;`;

  function mkBtn(label) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `
      background: #222;
      color: #eee;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 6px 10px;
      cursor: pointer;
    `;
    b.onmouseenter = () => b.style.borderColor = '#666';
    b.onmouseleave = () => b.style.borderColor = '#444';
    return b;
  }

  const resumeBtn = mkBtn('Resume');
  const pauseBtn = mkBtn('Pause');
  const stopBtn = mkBtn('Stop + Clear');
  const skipBtn = mkBtn('Skip current');
  const reloadQueueBtn = mkBtn('Load queue from this page');

  btnRow.append(resumeBtn, pauseBtn, stopBtn, skipBtn, reloadQueueBtn);

  const label = document.createElement('div');
  label.textContent = 'Queue (anime IDs, one per line or comma-separated):';
  label.style.cssText = `margin: 8px 0 6px; color:#bbb;`;

  const ta = document.createElement('textarea');
  ta.style.cssText = `
    width: 100%;
    height: 140px;
    background: #0b0b0b;
    color: #eee;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 8px;
    resize: vertical;
  `;

  const saveQueueBtn = mkBtn('Save queue');
  saveQueueBtn.style.cssText += `width: 100%; margin-top: 8px;`;

  const hint = document.createElement('div');
  hint.style.cssText = `margin-top: 8px; color:#888; font-size: 12px;`;
  hint.textContent = 'Tip: Stop + Clear fully resets. Pause keeps progress but prevents auto-resume.';

  body.append(status, btnRow, label, ta, saveQueueBtn, hint);

  panel.append(header, body);
  document.body.appendChild(panel);

  // --- Drag to move ---
  let dragging = false, startX = 0, startY = 0, startR = 0, startB = 0;
  header.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    startR = window.innerWidth - rect.right;
    startB = window.innerHeight - rect.bottom;
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.right = Math.max(0, startR - dx) + 'px';
    panel.style.bottom = Math.max(0, startB - dy) + 'px';
  });
  window.addEventListener('mouseup', () => dragging = false);

  function readQueueFromTextarea() {
    const raw = ta.value || '';
    const parts = raw
      .split(/[\s,]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .filter(x => /^\d+$/.test(x));
    return [...new Set(parts)];
  }

  function render() {
    const s = getState();
    if (!s) {
      status.textContent = 'State: (none)\nNot running.';
      ta.value = '';
      return;
    }
    status.textContent =
      `State: ${s.running ? 'RUNNING' : 'PAUSED'}\n` +
      `Step: ${s.step || '(unknown)'}\n` +
      `Current ID: ${s.currentId || '(none)'}\n` +
      `Remaining: ${(s.animeQueue && s.animeQueue.length) ? s.animeQueue.length : 0}`;

    ta.value = (s.animeQueue || []).join('\n');
  }

  // --- Button actions ---
  resumeBtn.onclick = () => {
    const s = getState();
    if (!s) return alert('No saved state. Use your Start button from the list page first.');
    s.running = true;
    setState(s);
    render();
    // kick it if you're on a relevant page
    location.reload();
  };

  pauseBtn.onclick = () => {
    const s = getState();
    if (!s) return alert('No saved state.');
    s.running = false;
    setState(s);
    render();
  };

  stopBtn.onclick = () => {
    clearState();
    render();
    alert('Stopped and cleared.');
  };

  skipBtn.onclick = () => {
    const s = getState();
    if (!s || !s.animeQueue || !s.animeQueue.length) return alert('No queue to skip.');
    // Drop current and go next
    s.animeQueue.shift();
    s.currentId = s.animeQueue[0] || null;
    s.step = 'edit';
    s.start = null;
    s.finish = null;
    setState(s);
    render();
    if (s.currentId) location.href = `https://myanimelist.net/ownlist/anime/${s.currentId}/edit?hideLayout`;
    else alert('Queue ended.');
  };

  reloadQueueBtn.onclick = () => {
    // Build a new queue from the current page
    const ids = getAnimeIdsFromCompletedListPage();
    if (!ids.length) return alert('No edit links found on this page.');
    const s = getState() || { running: false };
    s.animeQueue = ids;
    s.currentId = ids[0];
    s.step = 'edit';
    s.start = null;
    s.finish = null;
    setState(s);
    render();
    alert(`Loaded ${ids.length} IDs from this page.`);
  };

  saveQueueBtn.onclick = () => {
    const ids = readQueueFromTextarea();
    const s = getState() || { running: false };
    s.animeQueue = ids;
    s.currentId = ids[0] || null;
    s.step = 'edit';
    s.start = null;
    s.finish = null;
    setState(s);
    render();
    alert(`Saved queue (${ids.length} IDs).`);
  };

  render();
}

/* ========= MENU BUTTON ========= */
GM_registerMenuCommand('MAL: START Filling Dates From History', startFromList);
GM_registerMenuCommand('MAL: STOP + Clear saved progress', () => {
  clearState();
  alert('Stopped. Saved progress cleared.');
});
GM_registerMenuCommand('MAL: PAUSE (keep progress)', () => {
  const s = getState();
  if (!s) { alert('No running state found.'); return; }
  s.running = false;
  setState(s);
  alert('Paused. It will NOT resume until you click Start again.');
});

// Menu command to open the panel
GM_registerMenuCommand('MAL: OPEN Control Panel', openControlPanel);


/* ========= AUTO RESUME ========= */
(function resume() {
  const state = getState();
  if (!state || !state.running) return;

  const url = location.href;

  if (url.includes('/ownlist/anime/') && url.includes('/edit') && state.step === 'edit') {
    handleEditPage(state);
  } else if (url.includes('ajaxtb.php') && state.step === 'history') {
    handleHistoryPage(state);
  } else if (url.includes('/ownlist/anime/') && url.includes('/edit') && state.step === 'submit') {
    handleSubmitPage(state);
  }
})();
