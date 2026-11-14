// ==UserScript==
// @name         Shadow Fight 2 - Custom Cheat Panel
// @namespace    local.sf2.custompanel
// @version      4.10.0
// @description  Standalone custom trainer with battle controls, separate equipment upgrade/acquisition/equip controls, and enchantment tools, direct level and energy setting, individual timer controls for quest/event timers, Duel, energy refill, and shop making/upgrading, individual player stat overrides with recalculation reset, and profile checkpoints, plus a reload-persistent infinite-energy toggle and saved panel settings.
// @match        https://shadowfight2.com/play/*
// @run-at       document-start
// @sandbox      MAIN_WORLD
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // GameInterface downloads the game bundle with fetch(), converts the response
  // to text, and then loads it through a temporary Blob URL. Intercepting
  // appendChild() therefore sees only the Blob URL, not the original filename.
  // Patch fetch() instead, before GameInterface starts downloading the bundle.

  const TARGET = /\/sf2\.331cd20c\.hotfix1\.js(?:[?#].*)?$/;
  const nativeFetch = window.fetch.bind(window);

  window.__SF2_CUSTOM_PANEL_DIAG__ = {
    fetchPatched: true,
    matched: false,
    bridgeInjected: false,
    bridgeError: null,
    panelBuilt: false
  };

  function showNotice(message, bad = false) {
    const render = () => {
      if (!document.body) return setTimeout(render, 100);
      let notice = document.getElementById('sf2-custom-cheat-notice');
      if (!notice) {
        notice = document.createElement('div');
        notice.id = 'sf2-custom-cheat-notice';
        Object.assign(notice.style, {
          position: 'fixed', left: '12px', bottom: '12px', zIndex: '2147483647',
          maxWidth: 'min(520px, calc(100vw - 24px))', padding: '10px 12px',
          borderRadius: '9px', font: '13px/1.45 system-ui,sans-serif', color: '#fff'
        });
        document.body.appendChild(notice);
      }
      notice.style.background = bad ? '#792d38' : '#203b35';
      notice.textContent = `[SF2 Custom Cheats] ${message}`;
    };
    render();
  }

  window.fetch = async function(input, init) {
    const requestUrl = typeof input === 'string' ? input :
      (input && typeof input.url === 'string' ? input.url : '');

    const response = await nativeFetch(input, init);
    let matches = false;
    try {
      matches = TARGET.test(new URL(requestUrl, location.href).pathname +
        new URL(requestUrl, location.href).search);
    } catch (_) {}

    if (!matches) return response;

    const diag = window.__SF2_CUSTOM_PANEL_DIAG__;
    diag.matched = true;

    try {
      if (!response.ok) throw new Error(`Game bundle request failed: HTTP ${response.status}`);

      const source = await response.clone().text();
      const marker = '/* SF2_CUSTOM_PANEL_BRIDGE */';
      if (source.includes(marker)) throw new Error('The game bundle already contains the cheat bridge.');

      const closeAt = source.lastIndexOf('})(typeof exports');
      if (closeAt < 0) throw new Error('Could not find the game bundle wrapper; the game may have updated.');

      const bridgeCode =
        `\n${marker}\n` +
        `try {\n` +
        `  let sf2EnergyFreezeOriginal = null; let sf2EnergyFreezeActive = false;\n` +
        `  window.__SF2_CUSTOM_CHEATS__ = { player: p, game: J, unlock: Ak, getBattle: () => ca.Ka(), getBattleDiagnostics: () => { const battle = ca.Ka(); if (!battle) return { active: false }; return { active: true, frame: Number.isFinite(battle.frame) ? battle.frame : null, round: battle.round && Number.isFinite(battle.round.round) ? battle.round.round + 1 : null, playerReady: !!battle.zb, opponentReady: !!battle.qb, battleType: battle.Da && battle.Da.type ? String(battle.Da.type) : 'Unknown' }; }, getBattleHealth: (side) => { const battle = ca.Ka(); if (!battle || !battle.zb || !battle.qb) throw new Error('Enter an active fight first.'); const fighter = side === 'opponent' ? battle.qb : side === 'player' ? battle.zb : null; const health = fighter && fighter.parameters; if (!health || !Number.isFinite(health.jd) || !Number.isFinite(health.ho) || typeof health.qu !== 'function') throw new Error('That fighter health model is unavailable in this fight.'); return { current: health.jd, maximum: health.ho }; }, setBattleHealth: (side, value) => { const battle = ca.Ka(); if (!battle || !battle.zb || !battle.qb) throw new Error('Enter an active fight first.'); const fighter = side === 'opponent' ? battle.qb : side === 'player' ? battle.zb : null; const health = fighter && fighter.parameters; if (!health || !Number.isFinite(health.jd) || !Number.isFinite(health.ho) || typeof health.qu !== 'function') throw new Error('That fighter health model is unavailable in this fight.'); const amount = Number(value); if (!Number.isFinite(amount) || amount < 0 || amount > health.ho) throw new Error('Enter a health value from 0 to ' + health.ho + '.'); health.qu(amount); return { current: health.jd, maximum: health.ho }; }, refillBattleHealth: (side) => { const battle = ca.Ka(); if (!battle || !battle.zb || !battle.qb) throw new Error('Enter an active fight first.'); const fighter = side === 'opponent' ? battle.qb : side === 'player' ? battle.zb : null; const health = fighter && fighter.parameters; if (!health || !Number.isFinite(health.jd) || !Number.isFinite(health.ho) || typeof health.vpb !== 'function') throw new Error('That fighter health refill routine is unavailable.'); health.vpb(); return { current: health.jd, maximum: health.ho }; }, getCatalog: () => p.items, upgradeEquipment: (name) => { const item = p.items && p.items.$b(String(name)); const record = p.o && p.o.ya && p.o.ya.Uj(String(name)); if (!item || !record || record.rd() <= 0) throw new Error('This equipment must be owned before it can be upgraded. Acquire it first.'); if (typeof record.Hu !== 'function' || typeof record.aq !== 'function') throw new Error('The equipment upgrade model is unavailable.'); record.Hu(p.o.bb()); const next = record.Ui; if (!next || !Number.isFinite(next.Wg) || next.Wg <= record.Fe) throw new Error('No further upgrade is currently available for this item at your player level.'); const previous = record.Fe; record.aq(next.Wg); record.Hu(p.o.bb()); if (p.o.Ca && typeof p.o.Ca.Pm === 'function') p.o.Ca.Pm(); if (typeof p.o.save === 'function') p.o.save(); const sync = Ma.get(); if (sync && typeof sync.lna === 'function') sync.lna(); const power = p.F(); if (power && typeof power.Zzb === 'function') power.Zzb(p.o.bb()); return { name: item.name, previous, current: record.Fe, equipped: !!record.dv }; }, setEquipmentLevel: (name, level) => { const item = p.items && p.items.$b(String(name)); const record = p.o && p.o.ya && p.o.ya.Uj(String(name)); if (!item || !record || record.rd() <= 0) throw new Error('This equipment must be owned before its level can be changed. Acquire it first.'); if (typeof record.Hu !== 'function' || typeof record.aq !== 'function') throw new Error('The equipment level model is unavailable.'); const target = Number(level); const maxLevel = p.o && Array.isArray(p.o.oC) ? p.o.oC.length : 52; if (!Number.isSafeInteger(target) || target < 0 || target > maxLevel) throw new Error('Enter a whole-number equipment level from 0 to ' + maxLevel + '.'); const previous = record.Fe; record.aq(target); record.Hu(p.o.bb()); if (p.o.Ca && typeof p.o.Ca.Pm === 'function') p.o.Ca.Pm(); if (typeof p.o.save === 'function') p.o.save(); const sync = Ma.get(); if (sync && typeof sync.lna === 'function') sync.lna(); const power = p.F(); if (power && typeof power.Zzb === 'function') power.Zzb(p.o.bb()); if (p.o.FS && typeof p.o.FS.Z === 'function') p.o.FS.Z(); if (p.o.Bia && typeof p.o.Bia.Z === 'function') p.o.Bia.Z(); return { name: item.name, previous, current: record.Fe, equipped: !!record.dv }; }, getEnchantments: () => v.Ug, getAchievements: () => { if (!v.Hv || !Array.isArray(v.Hv.CI) || !p.o || !p.o.Di) throw new Error('Achievement catalog is unavailable.'); return v.Hv.CI.map(item => ({ name: item.name, completed: !!(p.o.Di.vCa(item.name) && p.o.Di.vCa(item.name).sO) })); }, unlockAchievement: (name) => { if (!v.Hv || !Array.isArray(v.Hv.CI) || !p.o || !p.o.Di || typeof p.o.Di.Tca !== 'function') throw new Error('Achievement manager is unavailable.'); const item = v.Hv.CI.find(entry => entry && entry.name === String(name)); if (!item) throw new Error('Achievement not found in this game build.'); p.o.Di.Tca(item, true); if (typeof p.o.save === 'function') p.o.save(); return true; }, itemTypes: I, getEnergy: () => ({ current: p.o.gk, maximum: p.o.Kr }), setEnergy: (value) => { if (!p.o || typeof p.o.L5 !== 'function') throw new Error('Energy setter is unavailable in this game build.'); const amount = Number(value); if (!Number.isSafeInteger(amount) || amount < 0 || amount > p.o.Kr) throw new Error('Enter a whole-number energy value from 0 to ' + p.o.Kr + '.'); p.o.L5(amount); if (typeof p.o.save === 'function') p.o.save(); return { current: p.o.gk, maximum: p.o.Kr }; }, setInfiniteEnergy: (enabled) => { if (!p.o || typeof p.o.r_a !== 'function') throw new Error('Energy spending routine is unavailable in this game build.'); if (enabled && !sf2EnergyFreezeActive) { sf2EnergyFreezeOriginal = p.o.r_a; p.o.r_a = function(amount) { if (Number(amount) < 0) return true; return sf2EnergyFreezeOriginal.call(this, amount); }; sf2EnergyFreezeActive = true; } else if (!enabled && sf2EnergyFreezeActive) { p.o.r_a = sf2EnergyFreezeOriginal; sf2EnergyFreezeOriginal = null; sf2EnergyFreezeActive = false; } return sf2EnergyFreezeActive; }, getStats: () => { const model = p.o && p.o.Ca; if (!model || !model.attributes || !model.pM || !v.no || !Array.isArray(v.no.attributes)) throw new Error('Player stat model is unavailable.'); return v.no.attributes.filter(attribute => attribute && attribute.name && !attribute.hidden).map(attribute => ({ name: attribute.name, label: attribute.Hg || attribute.name, value: model.gCa(attribute.name), format: attribute.format || '', icon: attribute.icon || '', overridden: model.pM.attributes.has(attribute.name) })); }, setStat: (name, value) => { const model = p.o && p.o.Ca; const definition = v.no && v.no.f6a(String(name)); const amount = Number(value); if (!model || !model.pM || !definition) throw new Error('That stat is not available in this game build.'); if (!Number.isFinite(amount) || Math.abs(amount) > 1000000000) throw new Error('Enter a finite stat value between -1,000,000,000 and 1,000,000,000.'); model.pM.set(String(name), amount); model.Pm(); if (typeof p.o.save === 'function') p.o.save(); const sync = Ma.get(); if (sync && typeof sync.lna === 'function') sync.lna(); const power = p.F(); if (power && typeof power.Zzb === 'function') power.Zzb(p.o.bb()); if (p.o.FS && typeof p.o.FS.Z === 'function') p.o.FS.Z(); if (p.o.Bia && typeof p.o.Bia.Z === 'function') p.o.Bia.Z(); return model.gCa(String(name)); }, resetStat: (name) => { const model = p.o && p.o.Ca; const definition = v.no && v.no.f6a(String(name)); if (!model || !model.pM || !definition) throw new Error('That stat is not available in this game build.'); model.pM.attributes.delete(String(name)); model.Pm(); if (typeof p.o.save === 'function') p.o.save(); const sync = Ma.get(); if (sync && typeof sync.lna === 'function') sync.lna(); const power = p.F(); if (power && typeof power.Zzb === 'function') power.Zzb(p.o.bb()); if (p.o.FS && typeof p.o.FS.Z === 'function') p.o.FS.Z(); if (p.o.Bia && typeof p.o.Bia.Z === 'function') p.o.Bia.Z(); return model.gCa(String(name)); }, resetAllStats: () => { const model = p.o && p.o.Ca; if (!model || !model.pM) throw new Error('Player stat model is unavailable.'); model.pM.clear(); model.Pm(); if (typeof p.o.save === 'function') p.o.save(); const sync = Ma.get(); if (sync && typeof sync.lna === 'function') sync.lna(); const power = p.F(); if (power && typeof power.Zzb === 'function') power.Zzb(p.o.bb()); if (p.o.FS && typeof p.o.FS.Z === 'function') p.o.FS.Z(); if (p.o.Bia && typeof p.o.Bia.Z === 'function') p.o.Bia.Z(); return true; }, getTimers: () => { if (!p.o || !p.o.Bl || !p.o.Bl.Hq) return []; return Array.from(p.o.Bl.Hq.values()).map(timer => ({ name: timer.name, remaining: Math.max(0, timer.Xv - p.Ec) })).sort((a, b) => a.name.localeCompare(b.name)); }, skipTimer: (name) => { if (!p.o || !p.o.Bl || typeof p.o.Bl.b5 !== 'function') throw new Error('Timer manager is unavailable.'); const timer = p.o.Bl.qJ(String(name)); if (!timer) throw new Error('That timer no longer exists. Refresh the timer list.'); p.o.Bl.b5(String(name), true); if (typeof p.o.save === 'function') p.o.save(); return true; }, getDeliveryTimers: () => { const manager = p.o && p.o.ya; if (!manager || !Array.isArray(manager.items)) return []; return manager.items.filter(item => item && item.Gh > p.Ec).map(item => ({ name: item.ab(), kind: typeof item.gA === 'function' && item.gA() ? 'Upgrade' : 'Making', remaining: Math.max(0, item.Gh - p.Ec) })).sort((a, b) => a.name.localeCompare(b.name)); }, skipDeliveryTimer: (name) => { const manager = p.o && p.o.ya; const item = manager && typeof manager.Uj === 'function' ? manager.Uj(String(name)) : null; if (!item || !(item.Gh > 0) || typeof item.LF !== 'function' || typeof manager.bna !== 'function') throw new Error('That making/upgrade timer is unavailable or already completed. Refresh the list.'); item.LF(p.Ec); manager.bna(); if (typeof p.o.save === 'function') p.o.save(); return true; }, skipAllDeliveryTimers: () => { const manager = p.o && p.o.ya; if (!manager || !Array.isArray(manager.items) || typeof manager.bna !== 'function') throw new Error('Shop making/upgrade timer manager is unavailable.'); let count = 0; manager.items.forEach(item => { if (item && item.Gh > p.Ec && typeof item.LF === 'function') { item.LF(p.Ec); count++; } }); if (count) manager.bna(); if (typeof p.o.save === 'function') p.o.save(); return count; }, getEnergyTimer: () => ({ current: p.o ? p.o.gk : 0, maximum: p.o ? p.o.Kr : 0, remaining: p.o && p.o.A4 > 0 ? p.o.A4 : 0 }), getStarterPackTimer: () => p.o && typeof v.iJ === 'function' ? Math.max(0, v.iJ(p.o.rWa)) : 0, skipEnergyTimer: () => { if (!p.o || typeof p.o.L5 !== 'function') throw new Error('Energy refill control is unavailable.'); p.o.L5(p.o.Kr); if (typeof p.o.save === 'function') p.o.save(); return true; }, getDuelCooldown: () => ({ remaining: Hb && Hb.time > 0 ? Math.max(0, Hb.Vn - Hb.time) : 0 }), skipDuelCooldown: () => { if (!Hb || typeof Hb.reset !== 'function') throw new Error('The Duel cooldown reset is unavailable in this game build.'); Hb.reset(false); if (p.o && typeof p.o.save === 'function') p.o.save(); return true; }, getCheckpointXml: () => J.Wu.stringify(), restoreCheckpoint: (xml) => { const restored = Jb.parse(xml); const parent = J.Wu && J.Wu.parent; if (!parent || !J.Wu || typeof J.Clb !== 'function') throw new Error('The active save profile cannot be replaced in this game build.'); parent.Ef(J.Wu); parent.dt(restored); J.Clb(restored); if (p.o && p.o.Ca && typeof p.o.Ca.Pm === 'function') p.o.Ca.Pm(); if (p.o && typeof p.o.save === 'function') p.o.save(); if (typeof J.jx === 'function') J.jx(); return true; } };\n` +
        `  window.__SF2_CUSTOM_PANEL_DIAG__.bridgeInjected = true;\n` +
        `  window.dispatchEvent(new Event('sf2-custom-cheats-ready'));\n` +
        `} catch (e) {\n` +
        `  window.__SF2_CUSTOM_PANEL_DIAG__.bridgeError = String(e && e.stack || e);\n` +
        `  console.error('[SF2 Custom Cheats] Bridge error:', e);\n` +
        `}\n`;

      const patchedSource = source.slice(0, closeAt) + bridgeCode + source.slice(closeAt);

      // The response body has already been decoded by fetch(). Remove stale
      // transport headers before returning the modified source to GameInterface.
      const headers = new Headers(response.headers);
      ['content-encoding', 'content-length', 'content-md5', 'etag'].forEach(h => headers.delete(h));

      return new Response(patchedSource, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      diag.bridgeError = String(error && error.stack || error);
      console.error('[SF2 Custom Cheats] Bundle patch failed:', error);
      showNotice(`Could not patch game bundle: ${error.message || error}`, true);
      return response;
    }
  };

  // The bridge is inserted while the bundle is evaluating, before the game
  // finishes initializing its player manager. Retry until the manager and DOM
  // are ready instead of treating that temporary state as a broken build.
  window.addEventListener('sf2-custom-cheats-ready', () => {
    const startedAt = Date.now();
    const attemptBuild = () => {
      const bridge = window.__SF2_CUSTOM_CHEATS__;
      if ((!bridge || !bridge.player || !bridge.player.o || !document.body) &&
          Date.now() - startedAt < 30000) {
        setTimeout(attemptBuild, 250);
        return;
      }
      try {
        buildPanel();
        window.__SF2_CUSTOM_PANEL_DIAG__.panelBuilt =
          !!document.getElementById('sf2-custom-cheat-panel');
        if (!window.__SF2_CUSTOM_PANEL_DIAG__.panelBuilt) {
          showNotice('Game objects did not finish initializing. Reload the game and try again.', true);
        }
      } catch (error) {
        window.__SF2_CUSTOM_PANEL_DIAG__.bridgeError = String(error && error.stack || error);
        console.error('[SF2 Custom Cheats] Panel error:', error);
        showNotice(`Panel error: ${error.message || error}`, true);
      }
    };
    attemptBuild();
  }, { once: true });

  // If the expected bundle was never requested, show a clear diagnostic.
  setTimeout(() => {
    const d = window.__SF2_CUSTOM_PANEL_DIAG__;
    if (d && !d.matched) {
      showNotice('Userscript is running, but it did not see the game bundle request. Check the game build/URL.', true);
    }
  }, 20000);

  function buildPanel() {
    const bridge = window.__SF2_CUSTOM_CHEATS__;
    const p = bridge && bridge.player;
    if (!p || !p.o) {
      showNotice(window.__SF2_CUSTOM_CHEATS_ERROR__ || 'Could not connect to the game objects. The game build may have changed.', true);
      return;
    }
    if (document.getElementById('sf2-custom-cheat-panel')) return;

    // These are panel preferences only. They live in this page's local storage;
    // the game hook itself exists only while this userscript is running.
    const PANEL_SETTINGS_KEY = 'sf2_custom_cheat_panel_settings_v1';
    function readPanelSettings() {
      try {
        const value = JSON.parse(localStorage.getItem(PANEL_SETTINGS_KEY) || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      } catch (_) { return {}; }
    }
    const panelSettings = readPanelSettings();
    function savePanelSettings() {
      try { localStorage.setItem(PANEL_SETTINGS_KEY, JSON.stringify(panelSettings)); }
      catch (_) { /* Settings persistence is optional if storage is unavailable. */ }
    }

    const panel = document.createElement('div');
    panel.id = 'sf2-custom-cheat-panel';
    Object.assign(panel.style, {
      position: 'fixed', top: '72px', right: '18px', width: 'min(350px, calc(100vw - 24px))',
      maxHeight: 'calc(100vh - 90px)', overflow: 'auto', zIndex: '2147483646',
      color: '#f4f6fb', background: '#111827', border: '1px solid #35445e',
      borderRadius: '13px', boxShadow: '0 16px 48px #000a',
      font: '14px/1.45 system-ui,sans-serif'
    });

    const style = document.createElement('style');
    style.textContent = `
      #sf2-custom-cheat-panel *{box-sizing:border-box}
      #sf2-custom-cheat-panel button,#sf2-custom-cheat-panel input,#sf2-custom-cheat-panel select{font:inherit}
      #sf2-custom-cheat-panel button{border:1px solid #40516d;border-radius:8px;padding:9px 10px;color:#f8fafc;background:#26364f;cursor:pointer}
      #sf2-custom-cheat-panel button:hover{background:#344967}
      #sf2-custom-cheat-panel button.primary{background:#176b59;border-color:#238b72}
      #sf2-custom-cheat-panel button.warn{background:#6c303c;border-color:#9b4a59}
      #sf2-custom-cheat-panel input,#sf2-custom-cheat-panel select{width:100%;min-width:0;padding:9px;border:1px solid #40516d;border-radius:8px;background:#0c1422;color:#fff}
      #sf2-custom-cheat-panel .header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 13px;background:#1b2940;cursor:move;position:sticky;top:0}
      #sf2-custom-cheat-panel .header small{display:block;color:#9fb0ca;font-size:11px;font-weight:400}
      #sf2-custom-cheat-panel .content{display:grid;gap:11px;padding:12px}
      #sf2-custom-cheat-panel .section{display:grid;gap:8px;padding:10px;border:1px solid #2d3c54;border-radius:10px;background:#151f30}
      #sf2-custom-cheat-panel .section-title{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9fb7d9;font-weight:700}
      #sf2-custom-cheat-panel .entry{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:7px}
      #sf2-custom-cheat-panel .buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      #sf2-custom-cheat-panel .status{padding:9px;border-radius:8px;background:#0c1422;color:#b8c9e5;font-size:12px;white-space:pre-wrap}
      #sf2-custom-cheat-panel .hint{font-size:11px;color:#91a1b9}
      #sf2-custom-cheat-panel .close{padding:4px 9px;font-size:18px;line-height:1}
    `;
    panel.appendChild(style);

    const header = document.createElement('div');
    header.className = 'header';
    panel.appendChild(header);
    const heading = document.createElement('div');
    heading.innerHTML = '<strong>SHADOW FIGHT 2</strong><small>Custom cheat panel · v4.8.0</small>';
    header.appendChild(heading);
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '×';
    close.title = 'Hide panel';
    header.appendChild(close);

    const content = document.createElement('div');
    content.className = 'content';
    panel.appendChild(content);
    const status = document.createElement('div');
    status.className = 'status';
    status.textContent = 'Connected to Shadow Fight 2.';
    content.appendChild(status);
    const report = (message, bad = false) => {
      status.textContent = message;
      status.style.color = bad ? '#ffb4b4' : '#b8c9e5';
    };

    function section(title) {
      const box = document.createElement('section');
      box.className = 'section';
      const label = document.createElement('div');
      label.className = 'section-title';
      label.textContent = title;
      box.appendChild(label);
      content.appendChild(box);
      return box;
    }

    function addButton(parent, label, action, className = '') {
      const button = document.createElement('button');
      button.textContent = label;
      if (className) button.className = className;
      button.addEventListener('click', () => {
        try { action(); }
        catch (error) { report(`${label} failed: ${error.message || error}`, true); }
      });
      parent.appendChild(button);
      return button;
    }

    function amountEntry(parent, label, action, defaultValue = '1000000') {
      const row = document.createElement('div');
      row.className = 'entry';
      parent.appendChild(row);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = '1000000000';
      input.step = '1';
      input.value = defaultValue;
      input.setAttribute('aria-label', `${label} amount`);
      row.appendChild(input);
      addButton(row, label, () => {
        const amount = Number(input.value);
        if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1e9) {
          throw new Error('Enter a whole number from 1 to 1,000,000,000.');
        }
        action(amount);
        report(`${label}: ${amount.toLocaleString()} added.`);
      }, 'primary');
    }

    const battleSection = section('Battle');
    const battleButtons = document.createElement('div');
    battleButtons.className = 'buttons';
    battleSection.appendChild(battleButtons);

    let oneHitEnabled = false;
    let damageBoostEnabled = false;
    let damageMultiplier = Number.isInteger(panelSettings.damageMultiplier) && panelSettings.damageMultiplier >= 1 && panelSettings.damageMultiplier <= 1000 ? panelSettings.damageMultiplier : 5;

    function installDamageHook(battle) {
      if (typeof battle.kM !== 'function') throw new Error('Battle damage handler was not found.');
      if (battle.__sf2OriginalDamageHandler) return;
      const original = battle.kM;
      Object.defineProperty(battle, '__sf2OriginalDamageHandler', { value: original, configurable: true });
      battle.kM = function(target, amount) {
        // The game routes resolved health changes through kM(target, delta).
        // Negative deltas are damage; only amplify damage dealt to the opponent.
        if (target === this.qb && amount < 0) {
          if (oneHitEnabled) amount = -1e9;
          else if (damageBoostEnabled) amount *= damageMultiplier;
        }
        return original.call(this, target, amount);
      };
    }

    function currentBattle() {
      const battle = bridge.getBattle && bridge.getBattle();
      if (!battle || !battle.zb || !battle.qb) {
        throw new Error('Enter an active fight first.');
      }
      return battle;
    }

    addButton(battleButtons, 'Toggle player invincibility', () => {
      const battle = currentBattle();
      battle.zb.Ola(!battle.zb.Ks);
      report(`Player invincibility: ${battle.zb.Ks ? 'ON' : 'OFF'}.`);
    }, 'primary');

    addButton(battleButtons, 'Toggle opponent invincibility', () => {
      const battle = currentBattle();
      battle.qb.Ola(!battle.qb.Ks);
      report(`Opponent invincibility: ${battle.qb.Ks ? 'ON' : 'OFF'}.`);
    });

    addButton(battleButtons, 'Disable opponent invincibility', () => {
      const battle = currentBattle();
      battle.qb.Ola(false);
      report('Opponent invincibility disabled.');
    });

    addButton(battleButtons, 'Force opponent knockdown', () => {
      const battle = currentBattle();
      const applied = battle.zA(false, true);
      report(applied ? 'Opponent knockdown requested.' : 'Knockdown unavailable in this fight.');
    });

    addButton(battleButtons, 'Restart current fight', () => {
      const battle = currentBattle();
      if (!confirm('Restart this fight from the beginning?')) return;
      if (typeof battle.cpb !== 'function') throw new Error('Restart routine unavailable.');
      battle.cpb();
      report('Fight restart requested.');
    }, 'warn');

    addButton(battleButtons, 'Pause / resume fight', () => {
      const battle = currentBattle();
      if (battle.Fn) {
        battle.OZ();
        report('Fight resumed.');
      } else {
        battle.cja();
        report(battle.Fn ? 'Fight paused.' : 'Pause is unavailable right now.');
      }
    });

    const battleHint = document.createElement('div');
    battleHint.className = 'hint';
    battleHint.textContent = 'Battle controls become available after entering a fight. Invincibility uses the game model’s own damage-immunity flag.';
    battleSection.appendChild(battleHint);

    const healthTitle = document.createElement('div');
    healthTitle.className = 'section-title';
    healthTitle.textContent = 'Fighter health';
    battleSection.appendChild(healthTitle);
    const healthSelect = document.createElement('select');
    healthSelect.setAttribute('aria-label', 'Fighter whose health to edit');
    [['player', 'Player'], ['opponent', 'Opponent']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      healthSelect.appendChild(option);
    });
    battleSection.appendChild(healthSelect);
    if (panelSettings.healthSide === 'player' || panelSettings.healthSide === 'opponent') {
      healthSelect.value = panelSettings.healthSide;
    }
    const healthSlider = document.createElement('input');
    healthSlider.type = 'range';
    // Use a percentage slider rather than the model's raw health units.
    // Some fighters expose max health as 1.0, so a raw 0..maximum slider
    // with step=1 only permits empty/full. Convert the 0..100 percentage
    // back into the fighter's absolute health units when applying it.
    healthSlider.min = '0';
    healthSlider.max = '100';
    healthSlider.step = '1';
    healthSlider.value = String(Number.isInteger(panelSettings.healthPercent) && panelSettings.healthPercent >= 0 && panelSettings.healthPercent <= 100 ? panelSettings.healthPercent : 100);
    healthSlider.setAttribute('aria-label', 'Fighter health slider');
    battleSection.appendChild(healthSlider);
    const healthState = document.createElement('div');
    healthState.className = 'hint';
    battleSection.appendChild(healthState);
    function refreshBattleHealth() {
      const health = bridge.getBattleHealth(healthSelect.value);
      const ratio = health.maximum > 0 ? health.current / health.maximum : 0;
      healthSlider.value = String(Math.round(Math.max(0, Math.min(1, ratio)) * 100));
      panelSettings.healthPercent = Number(healthSlider.value);
      savePanelSettings();
      healthState.textContent = `${healthSelect.value === 'player' ? 'Player' : 'Opponent'} health: ${health.current} / ${health.maximum} (${(ratio * 100).toFixed(1)}%)`;
    }
    healthSlider.addEventListener('input', () => {
      try {
        const percent = Number(healthSlider.value) / 100;
        panelSettings.healthPercent = Number(healthSlider.value);
        savePanelSettings();
        const current = bridge.getBattleHealth(healthSelect.value);
        const result = bridge.setBattleHealth(healthSelect.value, percent * current.maximum);
        healthState.textContent = `${healthSelect.value === 'player' ? 'Player' : 'Opponent'} health: ${result.current} / ${result.maximum} (${(percent * 100).toFixed(1)}%)`;
      } catch (error) { healthState.textContent = error.message || String(error); }
    });
    healthSelect.addEventListener('change', () => {
      panelSettings.healthSide = healthSelect.value;
      savePanelSettings();
      try { refreshBattleHealth(); }
      catch (error) { healthState.textContent = error.message || String(error); }
    });
    const healthButtons = document.createElement('div');
    healthButtons.className = 'buttons';
    battleSection.appendChild(healthButtons);
    addButton(healthButtons, 'Refill selected health', () => {
      const result = bridge.refillBattleHealth(healthSelect.value);
      healthSlider.value = '100';
      healthState.textContent = `${healthSelect.value === 'player' ? 'Player' : 'Opponent'} health: ${result.current} / ${result.maximum} (100.0%)`;
      report(`${healthSelect.value === 'player' ? 'Player' : 'Opponent'} health refilled to ${result.maximum}.`);
    }, 'primary');
    addButton(healthButtons, 'Empty selected health', () => {
      const result = bridge.setBattleHealth(healthSelect.value, 0);
      healthSlider.value = '0';
      healthState.textContent = `${healthSelect.value === 'player' ? 'Player' : 'Opponent'} health: ${result.current} / ${result.maximum} (0.0%)`;
      report(`${healthSelect.value === 'player' ? 'Player' : 'Opponent'} health emptied.`);
    }, 'warn');
    addButton(healthButtons, 'Refresh health', () => {
      refreshBattleHealth();
      report('Battle health display refreshed.');
    });


    const damageSection = section('Damage controls');
    const multiplierRow = document.createElement('div');
    multiplierRow.className = 'entry';
    damageSection.appendChild(multiplierRow);
    const multiplierInput = document.createElement('input');
    multiplierInput.type = 'number';
    multiplierInput.min = '1';
    multiplierInput.max = '1000';
    multiplierInput.step = '1';
    multiplierInput.value = String(damageMultiplier);
    multiplierInput.setAttribute('aria-label', 'Opponent damage multiplier');
    multiplierRow.appendChild(multiplierInput);
    addButton(multiplierRow, 'Set multiplier', () => {
      const value = Number(multiplierInput.value);
      if (!Number.isSafeInteger(value) || value < 1 || value > 1000) {
        throw new Error('Enter a whole-number multiplier from 1 to 1,000.');
      }
      damageMultiplier = value;
      panelSettings.damageMultiplier = value;
      savePanelSettings();
      const battle = currentBattle();
      installDamageHook(battle);
      damageBoostEnabled = true;
      oneHitEnabled = false;
      report(`Opponent damage multiplier enabled: ${damageMultiplier}×.`);
    }, 'primary');

    const damageButtons = document.createElement('div');
    damageButtons.className = 'buttons';
    damageSection.appendChild(damageButtons);
    addButton(damageButtons, 'Toggle one-hit mode', () => {
      const battle = currentBattle();
      installDamageHook(battle);
      oneHitEnabled = !oneHitEnabled;
      if (oneHitEnabled) damageBoostEnabled = false;
      report(`One-hit mode: ${oneHitEnabled ? 'ON' : 'OFF'}. Player damage to the opponent is amplified through the game's health handler.`);
    }, 'primary');
    addButton(damageButtons, 'Disable damage boost', () => {
      damageBoostEnabled = false;
      oneHitEnabled = false;
      report('Damage multiplier and one-hit mode disabled.');
    });

    const damageHint = document.createElement('div');
    damageHint.className = 'hint';
    damageHint.textContent = 'Damage controls affect negative health changes applied to the opponent. One-hit mode is experimental; verify it in a normal fight before relying on it.';
    damageSection.appendChild(damageHint);

    const resources = section('Resources');
    amountEntry(resources, 'Add gold', amount => p.jxa(amount));
    amountEntry(resources, 'Add gems', amount => p.ixa(amount, 7));
    const allResources = document.createElement('div');
    allResources.className = 'buttons';
    resources.appendChild(allResources);
    addButton(allResources, '+1M gold +1M gems', () => {
      p.jxa(1000000);
      p.ixa(1000000, 7);
      report('Added 1,000,000 gold and 1,000,000 gems.');
    }, 'primary');

    // Equipment controls deliberately separate equipping from acquiring/unlocking.
    // Equip calls the game's inventory manager with saveInventory=false; it does
    // not create an inventory record. The separate Acquire button uses B3a().
    const equipment = section('Equipment');
    const equipmentHint = document.createElement('div');
    equipmentHint.className = 'hint';
    equipmentHint.textContent = 'Set Equipment Level lets you enter an exact level for any owned item, equipped or not. Upgrade Selected Item remains available to advance one available tier. Acquire / unlock only and Equip Only remain separate actions.';
    equipment.appendChild(equipmentHint);

    const categorySelect = document.createElement('select');
    categorySelect.setAttribute('aria-label', 'Equipment category');
    const equipmentCategories = [
      { label: 'Weapon', type: 'Weapon', defaultName: 'Fists' },
      { label: 'Armor', type: 'Armor', defaultName: 'Body' },
      { label: 'Helmet', type: 'Helm', defaultName: 'Head' },
      { label: 'Ranged weapon', type: 'Ranged', defaultName: 'NoRanged' },
      { label: 'Magic', type: 'Magic', defaultName: 'NoMagic' }
    ];
    equipmentCategories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.type;
      option.textContent = category.label;
      categorySelect.appendChild(option);
    });
    equipment.appendChild(categorySelect);

    const itemSelect = document.createElement('select');
    itemSelect.setAttribute('aria-label', 'Select equipment item');
    equipment.appendChild(itemSelect);

    const selectedItemStatus = document.createElement('div');
    selectedItemStatus.className = 'hint';
    equipment.appendChild(selectedItemStatus);

    function catalogItems(type) {
      const catalog = bridge.getCatalog && bridge.getCatalog();
      const all = catalog && Array.isArray(catalog.hn) ? catalog.hn : [];
      return all.filter(item => item && item.type === type && item.name)
        .slice().sort((a, b) => a.name.localeCompare(b.name));
    }

    function refreshEquipmentItems() {
      const category = equipmentCategories.find(entry => entry.type === categorySelect.value) || equipmentCategories[0];
      const catalog = bridge.getCatalog && bridge.getCatalog();
      const items = catalogItems(category.type);
      const names = new Set(items.map(item => item.name));
      if (catalog && typeof catalog.$b === 'function') {
        const defaultItem = catalog.$b(category.defaultName);
        if (defaultItem && !names.has(defaultItem.name)) items.unshift(defaultItem);
      }
      const current = p.o.Ca && p.o.Ca.Gd(category.type);
      itemSelect.replaceChildren();
      if (!items.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No items found in game catalog';
        itemSelect.appendChild(option);
        selectedItemStatus.textContent = 'The item catalog is not ready or this category is unavailable.';
        return;
      }
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        const owned = p.o.ya && p.o.ya.Uj(item.name);
        option.textContent = `${item.name}${current && current.name === item.name ? ' — equipped' : ''}${owned && owned.rd() > 0 ? ' — owned' : ''}`;
        itemSelect.appendChild(option);
      });
      if (current && names.has(current.name)) itemSelect.value = current.name;
      else if (items[0]) itemSelect.value = items[0].name;
      updateSelectedItemStatus();
    }

    function updateSelectedItemStatus() {
      const catalog = bridge.getCatalog && bridge.getCatalog();
      const item = catalog && catalog.$b(itemSelect.value);
      if (!item) {
        selectedItemStatus.textContent = 'Select an item from the game catalog.';
        return;
      }
      const record = p.o.ya && p.o.ya.Uj(item.name);
      const equipped = p.o.Ca && p.o.Ca.Gd(item.type);
      if (record && record.rd() > 0 && typeof record.Hu === 'function') record.Hu(p.o.bb());
      const nextUpgrade = record && record.rd() > 0 ? record.Ui : null;
      selectedItemStatus.textContent = `Selected: ${item.name}\nInventory: ${record && record.rd() > 0 ? 'owned' : 'not owned'} · Equipped: ${equipped && equipped.name === item.name ? 'yes' : 'no'}\nUpgrade level: ${record && record.rd() > 0 ? record.Fe : '—'} · Next upgrade: ${nextUpgrade ? nextUpgrade.Wg : 'unavailable'}`;
    }

    categorySelect.addEventListener('change', refreshEquipmentItems);
    itemSelect.addEventListener('change', updateSelectedItemStatus);
    refreshEquipmentItems();

    const equipmentButtons = document.createElement('div');
    equipmentButtons.className = 'buttons';
    equipment.appendChild(equipmentButtons);
    addButton(equipmentButtons, 'Upgrade selected item', () => {
      const name = itemSelect.value;
      if (!name) throw new Error('Select an equipment item first.');
      const result = bridge.upgradeEquipment(name);
      report(`Upgraded ${result.name} from level ${result.previous} to ${result.current}. ${result.equipped ? 'It is currently equipped.' : 'It is not equipped; the upgrade is saved in your inventory.'}`);
      refreshEquipmentItems();
    }, 'primary');

    const equipmentLevelRow = document.createElement('div');
    equipmentLevelRow.className = 'entry';
    equipment.appendChild(equipmentLevelRow);
    const equipmentLevelInput = document.createElement('input');
    equipmentLevelInput.type = 'number';
    equipmentLevelInput.min = '0';
    equipmentLevelInput.max = String(p.o && Array.isArray(p.o.oC) ? p.o.oC.length : 52);
    equipmentLevelInput.step = '1';
    equipmentLevelInput.value = '1';
    equipmentLevelInput.setAttribute('aria-label', 'Exact equipment level');
    equipmentLevelRow.appendChild(equipmentLevelInput);
    addButton(equipmentLevelRow, 'Set selected item level', () => {
      const name = itemSelect.value;
      if (!name) throw new Error('Select an equipment item first.');
      const level = Number(equipmentLevelInput.value);
      if (!Number.isSafeInteger(level)) throw new Error('Enter a whole-number equipment level.');
      const result = bridge.setEquipmentLevel(name, level);
      report(`Set ${result.name} from level ${result.previous} to level ${result.current}. ${result.equipped ? 'It is currently equipped.' : 'It is not equipped; the new level is saved in your inventory.'}`);
      refreshEquipmentItems();
    }, 'primary');

    addButton(equipmentButtons, 'Equip Only', () => {
      const catalog = bridge.getCatalog && bridge.getCatalog();
      const item = catalog && catalog.$b(itemSelect.value);
      if (!item) throw new Error('Select a valid item first.');
      if (item.type !== categorySelect.value) throw new Error('Selected item does not match the chosen equipment slot.');
      if (!p.o.ya || typeof p.o.ya.ip !== 'function') throw new Error('Equipment setter is unavailable.');
      // false is intentional: do not mark/add an inventory record as equipped.
      p.o.ya.ip(item, false);
      if (p.o.Ca && typeof p.o.Ca.Pm === 'function') p.o.Ca.Pm();
      p.o.save();
      report(`Equipped ${item.name} without acquiring or unlocking it. If the game rejects unowned equipment, it may revert.`);
      refreshEquipmentItems();
    }, 'primary');

    addButton(equipmentButtons, 'Acquire / unlock only', () => {
      const catalog = bridge.getCatalog && bridge.getCatalog();
      const item = catalog && catalog.$b(itemSelect.value);
      if (!item) throw new Error('Select a valid item first.');
      if (typeof p.B3a !== 'function') throw new Error("The game acquire-item routine is unavailable.");
      const result = p.B3a(item);
      p.o.save();
      if (result === false) throw new Error('The game did not acquire this item.');
      report(`Acquired ${item.name}. This action does not equip it.`);
      refreshEquipmentItems();
    });

    const enchantmentSection = section('Enchantments');
    const enchantmentHint = document.createElement('div');
    enchantmentHint.className = 'hint';
    enchantmentHint.textContent = 'Applying an enchantment requires the selected item to already exist in your inventory. This will not acquire or equip the item.';
    enchantmentSection.appendChild(enchantmentHint);

    const enchantItemSelect = document.createElement('select');
    enchantItemSelect.setAttribute('aria-label', 'Owned item to enchant');
    enchantmentSection.appendChild(enchantItemSelect);
    const enchantmentSelect = document.createElement('select');
    enchantmentSelect.setAttribute('aria-label', 'Select enchantment');
    enchantmentSection.appendChild(enchantmentSelect);

    function refreshEnchantments() {
      const inventory = p.o.ya && Array.isArray(p.o.ya.items) ? p.o.ya.items : [];
      const prior = enchantItemSelect.value;
      enchantItemSelect.replaceChildren();
      inventory.filter(record => record && record.ib && record.rd() > 0 && record.ib.type !== 'Decorate')
        .sort((a, b) => a.ab().localeCompare(b.ab())).forEach(record => {
          const option = document.createElement('option');
          option.value = record.ab();
          option.textContent = `${record.ab()} (${record.rd()} owned)`;
          enchantItemSelect.appendChild(option);
        });
      if ([...enchantItemSelect.options].some(option => option.value === prior)) enchantItemSelect.value = prior;

      const manager = bridge.getEnchantments && bridge.getEnchantments();
      const definitions = manager && Array.isArray(manager.n4) ? manager.n4 : [];
      const oldEnchantment = enchantmentSelect.value;
      enchantmentSelect.replaceChildren();
      definitions.filter(enchantment => enchantment && enchantment.name)
        .slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(enchantment => {
          const option = document.createElement('option');
          option.value = enchantment.name;
          option.textContent = enchantment.name;
          enchantmentSelect.appendChild(option);
        });
      if ([...enchantmentSelect.options].some(option => option.value === oldEnchantment)) enchantmentSelect.value = oldEnchantment;
      if (!enchantItemSelect.options.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No owned items found';
        enchantItemSelect.appendChild(option);
      }
      if (!enchantmentSelect.options.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No enchantments found';
        enchantmentSelect.appendChild(option);
      }
    }
    refreshEnchantments();

    const enchantButtons = document.createElement('div');
    enchantButtons.className = 'buttons';
    enchantmentSection.appendChild(enchantButtons);
    addButton(enchantButtons, 'Apply enchantment', () => {
      const record = p.o.ya && p.o.ya.Uj(enchantItemSelect.value);
      if (!record || record.rd() <= 0 || !record.Gv) {
        throw new Error('That item is not in your saved inventory. Acquire it separately first if desired.');
      }
      const manager = bridge.getEnchantments && bridge.getEnchantments();
      const enchantment = manager && typeof manager.vn === 'function' ? manager.vn(enchantmentSelect.value) : null;
      if (!enchantment) throw new Error('Selected enchantment definition was not found.');
      if (typeof record.RYa !== 'function') throw new Error("The item enchantment handler is unavailable.");
      record.RYa([enchantment], p.o.bb());
      p.o.save();
      report(`Applied ${enchantment.name} to ${record.ab()}. Existing enchantments are retained unless the game replaces an incompatible one.`);
      refreshEnchantments();
    }, 'primary');

    const refreshInventoryButton = document.createElement('div');
    refreshInventoryButton.className = 'buttons';
    enchantmentSection.appendChild(refreshInventoryButton);
    addButton(refreshInventoryButton, 'Refresh item lists', () => {
      refreshEquipmentItems();
      refreshEnchantments();
      report('Equipment and enchantment lists refreshed.');
    });

    const energySection = section('Energy');
    const energyState = document.createElement('div');
    energyState.className = 'hint';
    energySection.appendChild(energyState);
    const energyEntry = document.createElement('div');
    energyEntry.className = 'entry';
    energySection.appendChild(energyEntry);
    const energyInput = document.createElement('input');
    energyInput.type = 'number';
    energyInput.step = '1';
    energyInput.min = '0';
    energyInput.max = String(Math.max(0, p.o.Kr));
    energyInput.value = String(Number.isSafeInteger(panelSettings.energyTarget) && panelSettings.energyTarget >= 0 ? panelSettings.energyTarget : p.o.gk);
    energyInput.setAttribute('aria-label', 'Target energy');
    energyEntry.appendChild(energyInput);
    energyInput.addEventListener('change', () => {
      const value = Number(energyInput.value);
      if (Number.isSafeInteger(value) && value >= 0) { panelSettings.energyTarget = value; savePanelSettings(); }
    });
    const energyTimerHint = document.createElement('div');
    energyTimerHint.className = 'hint';
    energySection.appendChild(energyTimerHint);
    function refreshEnergyDisplay() {
      const energy = bridge.getEnergy ? bridge.getEnergy() : { current: p.o.gk, maximum: p.o.Kr };
      const timer = bridge.getEnergyTimer ? bridge.getEnergyTimer() : { current: energy.current, maximum: energy.maximum, remaining: 0 };
      const starterPackRemaining = bridge.getStarterPackTimer ? bridge.getStarterPackTimer() : 0;
      energyInput.max = String(energy.maximum);
      energyState.textContent = `Current energy: ${energy.current} / ${energy.maximum}`;
      energyTimerHint.textContent = `Refill countdown: ${Math.max(0, timer.remaining)} seconds. Starter Pack offer countdown: ${starterPackRemaining} seconds (display only).`;
    }
    addButton(energyEntry, 'Set energy', () => {
      if (!bridge.setEnergy) throw new Error('Energy setter is unavailable.');
      const result = bridge.setEnergy(Number(energyInput.value));
      energyInput.value = String(result.current);
      panelSettings.energyTarget = result.current;
      savePanelSettings();
      refreshEnergyDisplay();
      report(`Energy set to ${result.current} / ${result.maximum}.`);
    }, 'primary');
    const energyTimerButtons = document.createElement('div');
    energyTimerButtons.className = 'buttons';
    energySection.appendChild(energyTimerButtons);
    addButton(energyTimerButtons, 'Skip energy refill', () => {
      if (!bridge.skipEnergyTimer) throw new Error('Energy refill control is unavailable.');
      bridge.skipEnergyTimer();
      energyInput.value = String(p.o.gk);
      refreshEnergyDisplay();
      report('Energy refilled to maximum; the refill wait is no longer needed.');
    }, 'primary');
    let infiniteEnergyEnabled = false;
    const infiniteEnergyButton = addButton(energyTimerButtons, 'Infinite energy: OFF', () => {
      const requested = !infiniteEnergyEnabled;
      infiniteEnergyEnabled = bridge.setInfiniteEnergy(requested);
      panelSettings.infiniteEnergy = infiniteEnergyEnabled;
      savePanelSettings();
      infiniteEnergyButton.textContent = `Infinite energy: ${infiniteEnergyEnabled ? 'ON' : 'OFF'}`;
      infiniteEnergyButton.className = infiniteEnergyEnabled ? 'primary' : '';
      report(`Infinite energy ${infiniteEnergyEnabled ? 'enabled' : 'disabled'}. Your preference is saved while the userscript is installed; disabling/removing the userscript stops the effect.`);
    });
    if (panelSettings.infiniteEnergy === true) {
      try {
        infiniteEnergyEnabled = bridge.setInfiniteEnergy(true);
      } catch (error) {
        infiniteEnergyEnabled = false;
        panelSettings.infiniteEnergy = false;
        savePanelSettings();
        report(`Could not restore Infinite Energy: ${error.message || error}`, true);
      }
    }
    infiniteEnergyButton.textContent = `Infinite energy: ${infiniteEnergyEnabled ? 'ON' : 'OFF'}`;
    infiniteEnergyButton.className = infiniteEnergyEnabled ? 'primary' : '';
    const infiniteEnergyHint = document.createElement('div');
    infiniteEnergyHint.className = 'hint';
    infiniteEnergyHint.textContent = 'When ON, energy costs are ignored. The ON/OFF preference is saved across game reloads while this userscript is enabled. Disabling/removing the userscript stops the effect; re-enabling it restores the saved preference.';
    energySection.appendChild(infiniteEnergyHint);
    refreshEnergyDisplay();

    const statsSection = section('Individual stats');
    const statsHint = document.createElement('div');
    statsHint.className = 'hint';
    statsHint.textContent = 'Choose a stat to override its value. Reset selected stat removes the override and recalculates it from your current level, equipment, and other game modifiers.';
    statsSection.appendChild(statsHint);
    const statSelect = document.createElement('select');
    statSelect.setAttribute('aria-label', 'Player stat');
    statsSection.appendChild(statSelect);
    const statEntry = document.createElement('div');
    statEntry.className = 'entry';
    statsSection.appendChild(statEntry);
    const statInput = document.createElement('input');
    statInput.type = 'number';
    statInput.step = 'any';
    statInput.setAttribute('aria-label', 'New stat value');
    statEntry.appendChild(statInput);
    const statButtons = document.createElement('div');
    statButtons.className = 'buttons';
    statsSection.appendChild(statButtons);
    const statState = document.createElement('div');
    statState.className = 'hint';
    statsSection.appendChild(statState);
    let statRecords = [];
    function refreshStatList(keepSelection = true) {
      const previous = statSelect.value;
      statRecords = bridge.getStats ? bridge.getStats() : [];
      statSelect.replaceChildren();
      statRecords.forEach(stat => {
        const option = document.createElement('option');
        option.value = stat.name;
        option.textContent = stat.label === stat.name ? stat.name : `${stat.label} (${stat.name})`;
        statSelect.appendChild(option);
      });
      if (keepSelection && statRecords.some(stat => stat.name === previous)) statSelect.value = previous;
      updateStatDisplay();
    }
    function updateStatDisplay() {
      const stat = statRecords.find(item => item.name === statSelect.value);
      if (!stat) {
        statInput.value = '';
        statState.textContent = 'No visible player stats were found.';
        return;
      }
      statInput.value = String(stat.value);
      statState.textContent = `Current value: ${stat.value}${stat.format ? ` (${stat.format})` : ''} · ${stat.overridden ? 'Custom override active' : 'Calculated from level/equipment'}`;
    }
    statSelect.addEventListener('change', updateStatDisplay);
    addButton(statButtons, 'Set stat value', () => {
      if (!bridge.setStat) throw new Error('Stat editing is unavailable in this game build.');
      const stat = statRecords.find(item => item.name === statSelect.value);
      if (!stat) throw new Error('Select a stat first.');
      if (statInput.value.trim() === '' || !Number.isFinite(Number(statInput.value))) throw new Error('Enter a valid number.');
      const result = bridge.setStat(stat.name, Number(statInput.value));
      refreshStatList();
      statSelect.value = stat.name;
      updateStatDisplay();
      report(`${stat.label} set to ${result}.`);
    }, 'primary');
    addButton(statButtons, 'Reset selected stat', () => {
      if (!bridge.resetStat) throw new Error('Stat reset is unavailable in this game build.');
      const stat = statRecords.find(item => item.name === statSelect.value);
      if (!stat) throw new Error('Select a stat first.');
      const result = bridge.resetStat(stat.name);
      refreshStatList();
      statSelect.value = stat.name;
      updateStatDisplay();
      report(`${stat.label} recalculated from level, equipment, and game modifiers: ${result}.`);
    });
    const statRefreshButtons = document.createElement('div');
    statRefreshButtons.className = 'buttons';
    statsSection.appendChild(statRefreshButtons);
    addButton(statRefreshButtons, 'Refresh stats', () => {
      refreshStatList();
      report('Player stats refreshed.');
    });
    addButton(statRefreshButtons, 'Reset all stat overrides', () => {
      if (!confirm('Reset every custom stat override? All listed stats will be recalculated from level, equipment, and game modifiers.')) return;
      if (!bridge.resetAllStats) throw new Error('Stat reset is unavailable in this game build.');
      bridge.resetAllStats();
      refreshStatList();
      report('All custom stat overrides were removed; stats were recalculated from your current progression and equipment.');
    }, 'warn');
    refreshStatList(false);

    const timerSection = section('Timers');
    const duelTimerHint = document.createElement('div');
    duelTimerHint.className = 'hint';
    timerSection.appendChild(duelTimerHint);
    const duelTimerButtons = document.createElement('div');
    duelTimerButtons.className = 'buttons';
    timerSection.appendChild(duelTimerButtons);
    function refreshDuelTimerDisplay() {
      const duel = bridge.getDuelCooldown ? bridge.getDuelCooldown() : { remaining: 0 };
      duelTimerHint.textContent = duel.remaining > 0
        ? `Duel cooldown remaining: ${duel.remaining} seconds`
        : 'Duel cooldown: ready (or no active cooldown detected)';
    }
    addButton(duelTimerButtons, 'Skip Duel cooldown', () => {
      if (!bridge.skipDuelCooldown) throw new Error('Duel cooldown control is unavailable.');
      bridge.skipDuelCooldown();
      refreshDuelTimerDisplay();
      report('The game’s built-in Duel timer reset was applied.');
    }, 'primary');

    const timerEntry = document.createElement('div');
    timerEntry.className = 'entry';
    timerSection.appendChild(timerEntry);
    const timerSelect = document.createElement('select');
    timerSelect.setAttribute('aria-label', 'Individual timer');
    timerEntry.appendChild(timerSelect);
    const skipTimerButton = addButton(timerEntry, 'Skip selected timer', () => {
      const name = timerSelect.value;
      if (!name) throw new Error('No individual timer is selected.');
      if (!bridge.skipTimer) throw new Error('Individual timer controls are unavailable.');
      bridge.skipTimer(name);
      refreshTimerList();
      report(`Skipped timer: ${name}.`);
    });
    const timerRefreshRow = document.createElement('div');
    timerRefreshRow.className = 'buttons';
    timerSection.appendChild(timerRefreshRow);
    function refreshTimerList() {
      const previous = timerSelect.value;
      const timers = bridge.getTimers ? bridge.getTimers() : [];
      timerSelect.replaceChildren();
      if (!timers.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No individual timers found';
        timerSelect.appendChild(option);
        skipTimerButton.disabled = true;
      } else {
        timers.forEach(timer => {
          const option = document.createElement('option');
          option.value = timer.name;
          option.textContent = `${timer.name} (${timer.remaining}s remaining)`;
          timerSelect.appendChild(option);
        });
        skipTimerButton.disabled = false;
        if (timers.some(timer => timer.name === previous)) timerSelect.value = previous;
      }
    }
    addButton(timerRefreshRow, 'Refresh timer list', () => {
      refreshTimerList();
      refreshDuelTimerDisplay();
      report('Timer list refreshed.');
    });
    refreshTimerList();
    refreshDuelTimerDisplay();

    // Shop deliveries are stored on inventory records, not in the general
    // Timers XML node. The game's delivery processor completes both making
    // and upgrade jobs when their DeliveryTime is moved to the current time.
    const shopTimerSection = section('Shop making & upgrades');
    const shopTimerHint = document.createElement('div');
    shopTimerHint.className = 'hint';
    shopTimerHint.textContent = 'These are separate from quest/event timers. The list includes active item-making deliveries and equipment upgrades.';
    shopTimerSection.appendChild(shopTimerHint);
    const shopTimerSelect = document.createElement('select');
    shopTimerSelect.setAttribute('aria-label', 'Shop making or upgrade timer');
    shopTimerSection.appendChild(shopTimerSelect);
    const shopTimerButtons = document.createElement('div');
    shopTimerButtons.className = 'buttons';
    shopTimerSection.appendChild(shopTimerButtons);
    const completeShopTimerButton = addButton(shopTimerButtons, 'Complete selected job', () => {
      const name = shopTimerSelect.value;
      if (!name) throw new Error('No active making or upgrade job is selected.');
      if (!bridge.skipDeliveryTimer) throw new Error('Shop delivery timer controls are unavailable.');
      bridge.skipDeliveryTimer(name);
      refreshShopTimers();
      report(`Completed shop job: ${name}.`);
    }, 'primary');
    addButton(shopTimerButtons, 'Complete all jobs', () => {
      const timers = bridge.getDeliveryTimers ? bridge.getDeliveryTimers() : [];
      if (!timers.length) { report('No active making or upgrade jobs were found.'); return; }
      if (!confirm(`Complete all ${timers.length} active making/upgrade jobs?`)) return;
      const count = bridge.skipAllDeliveryTimers();
      refreshShopTimers();
      report(`Completed ${count} shop making/upgrade job(s).`);
    }, 'warn');
    function refreshShopTimers() {
      const previous = shopTimerSelect.value;
      const timers = bridge.getDeliveryTimers ? bridge.getDeliveryTimers() : [];
      shopTimerSelect.replaceChildren();
      if (!timers.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No active making or upgrade timers';
        shopTimerSelect.appendChild(option);
        completeShopTimerButton.disabled = true;
      } else {
        timers.forEach(timer => {
          const option = document.createElement('option');
          option.value = timer.name;
          option.textContent = `${timer.kind}: ${timer.name} (${timer.remaining}s remaining)`;
          shopTimerSelect.appendChild(option);
        });
        completeShopTimerButton.disabled = false;
        if (timers.some(timer => timer.name === previous)) shopTimerSelect.value = previous;
      }
    }
    addButton(shopTimerButtons, 'Refresh shop timers', () => {
      refreshShopTimers();
      report('Shop making and upgrade timers refreshed.');
    });
    refreshShopTimers();

    const progression = section('Progression');
    const progressButtons = document.createElement('div');
    progressButtons.className = 'buttons';
    progression.appendChild(progressButtons);
    addButton(progressButtons, 'Level up once', () => {
      const didLevel = p.o.BMa(p.o.hA());
      report(didLevel ? 'Level-up applied.' : 'The game did not report a level change.');
    }, 'primary');

    const levelEntry = document.createElement('div');
    levelEntry.className = 'entry';
    progression.appendChild(levelEntry);
    const levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.step = '1';
    levelInput.min = '1';
    levelInput.max = String(Math.max(1, p.o.oC.length));
    levelInput.value = String(p.o.bb());
    levelInput.setAttribute('aria-label', 'Target player level');
    levelEntry.appendChild(levelInput);
    addButton(levelEntry, 'Set level', () => {
      const target = Number(levelInput.value);
      const maximum = Math.max(1, p.o.oC.length);
      const current = p.o.bb();
      if (!Number.isSafeInteger(target) || target < 1 || target > maximum) {
        throw new Error(`Enter a whole-number level from 1 to ${maximum}.`);
      }
      if (target === current) {
        report(`Already at level ${target}.`);
        return;
      }
      if (target < current && !confirm(`Lower your level from ${current} to ${target}? Experience will reset to 0. Separate unlock/story records are not intentionally cleared, but equipment level requirements may change.`)) return;
      p.o.HL(target);
      p.o.Fs = 0;
      p.o.AF('Experience', 0);
      if (p.o.ya && typeof p.o.ya.Iu === 'function') p.o.ya.Iu();
      if (p.o.ya && typeof p.o.ya.Szb === 'function') p.o.ya.Szb(p.o.bb());
      const powerSync = Ma.get();
      if (powerSync && typeof powerSync.lna === 'function') powerSync.lna();
      const power = p.F();
      if (power && typeof power.Zzb === 'function') power.Zzb(p.o.bb());
      if (p.o.FS && typeof p.o.FS.Z === 'function') p.o.FS.Z();
      if (p.o.Bia && typeof p.o.Bia.Z === 'function') p.o.Bia.Z();
      report(`Player level set to ${target}. Experience reset to 0. Separate unlock/story records were not intentionally changed.`);
    }, 'primary');
    addButton(progressButtons, 'Unlock zones + weapons', () => {
      if (!bridge.unlock || typeof bridge.unlock.Uyb !== 'function') throw new Error('Unlock routine unavailable.');
      bridge.unlock.Uyb();
      report('Unlock routine ran. Check the game to see which items were unlocked.');
    }, 'primary');
    const progressionHint = document.createElement('div');
    progressionHint.className = 'hint';
    progressionHint.textContent = `Set Level accepts 1–${Math.max(1, p.o.oC.length)}. Downgrading resets XP to 0 and refreshes level-based equipment/perk requirements; it does not intentionally clear separate zone/story unlock records.`;
    progression.appendChild(progressionHint);

    const achievementsSection = section('Achievements');
    const achievementHint = document.createElement('div');
    achievementHint.className = 'hint';
    achievementHint.textContent = 'Choose an achievement to mark it completed in the game save. Refresh the list to update completion status.';
    achievementsSection.appendChild(achievementHint);
    const achievementSelect = document.createElement('select');
    achievementSelect.setAttribute('aria-label', 'Achievement to unlock');
    achievementSelect.style.width = '100%';
    achievementSelect.style.margin = '6px 0';
    achievementsSection.appendChild(achievementSelect);
    const achievementButtons = document.createElement('div');
    achievementButtons.className = 'buttons';
    achievementsSection.appendChild(achievementButtons);
    function refreshAchievementList() {
      if (!bridge.getAchievements) throw new Error('Achievement list is unavailable.');
      const achievements = bridge.getAchievements();
      const previous = achievementSelect.value;
      achievementSelect.replaceChildren();
      achievements.forEach(achievement => {
        const option = document.createElement('option');
        option.value = achievement.name;
        option.textContent = `${achievement.completed ? '✓ ' : ''}${achievement.name}${achievement.completed ? ' (completed)' : ''}`;
        achievementSelect.appendChild(option);
      });
      if (achievements.some(item => item.name === previous)) achievementSelect.value = previous;
      if (!achievements.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No achievements found';
        achievementSelect.appendChild(option);
      }
      return achievements;
    }
    addButton(achievementButtons, 'Unlock selected', () => {
      const name = achievementSelect.value;
      if (!name) throw new Error('Select an achievement first.');
      bridge.unlockAchievement(name);
      refreshAchievementList();
      achievementSelect.value = name;
      report(`Achievement marked completed: ${name}.`);
    }, 'primary');
    addButton(achievementButtons, 'Refresh list', () => {
      const achievements = refreshAchievementList();
      report(`Achievement list refreshed (${achievements.length} found).`);
    });
    addButton(achievementButtons, 'Unlock all', () => {
      const achievements = bridge.getAchievements();
      const remaining = achievements.filter(item => !item.completed);
      if (!remaining.length) {
        report('All achievements are already marked completed.');
        return;
      }
      if (!confirm(`Mark all ${remaining.length} remaining achievements as completed? This will update your saved game progress.`)) return;
      remaining.forEach(item => bridge.unlockAchievement(item.name));
      refreshAchievementList();
      report(`Marked ${remaining.length} achievements completed.`);
    }, 'warn');
    refreshAchievementList();

    const checkpoints = section('Time-travel checkpoints');
    const checkpointHint = document.createElement('div');
    checkpointHint.className = 'hint';
    checkpointHint.textContent = 'A checkpoint stores the active warrior profile, including its level, inventory, currencies, equipment, unlock flags, and recorded progress. Restoring replaces that profile and reloads the game. Keep several checkpoints before major changes.';
    checkpoints.appendChild(checkpointHint);
    const checkpointName = document.createElement('input');
    checkpointName.type = 'text';
    checkpointName.maxLength = 40;
    checkpointName.placeholder = 'Checkpoint name (e.g. Before Titan)';
    checkpointName.setAttribute('aria-label', 'Checkpoint name');
    checkpoints.appendChild(checkpointName);
    const checkpointSelect = document.createElement('select');
    checkpointSelect.setAttribute('aria-label', 'Saved checkpoint');
    checkpoints.appendChild(checkpointSelect);
    const checkpointButtons = document.createElement('div');
    checkpointButtons.className = 'buttons';
    checkpoints.appendChild(checkpointButtons);
    const CHECKPOINT_KEY = 'sf2_custom_cheat_checkpoints_v1';
    function readCheckpoints() {
      try {
        const value = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || '[]');
        return Array.isArray(value) ? value.filter(x => x && typeof x.xml === 'string' && typeof x.name === 'string') : [];
      } catch (_) { return []; }
    }
    function writeCheckpoints(items) {
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(items));
    }
    function refreshCheckpoints(selectedId) {
      const items = readCheckpoints();
      checkpointSelect.replaceChildren();
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} — ${new Date(item.created).toLocaleString()}`;
        checkpointSelect.appendChild(option);
      });
      if (selectedId && [...checkpointSelect.options].some(o => o.value === selectedId)) checkpointSelect.value = selectedId;
      if (!items.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No checkpoints saved';
        checkpointSelect.appendChild(option);
      }
    }
    refreshCheckpoints();
    addButton(checkpointButtons, 'Create checkpoint', () => {
      if (!bridge.getCheckpointXml || !bridge.game || !bridge.game.Wu) throw new Error('The active profile snapshot method is unavailable.');
      const items = readCheckpoints();
      const xml = bridge.getCheckpointXml();
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: checkpointName.value.trim() || `Checkpoint ${items.length + 1}`,
        created: Date.now(),
        xml
      };
      items.push(entry);
      while (items.length > 5) items.shift();
      writeCheckpoints(items);
      refreshCheckpoints(entry.id);
      report(`Checkpoint “${entry.name}” saved. The five most recent checkpoints are retained.`);
    }, 'primary');
    addButton(checkpointButtons, 'Restore checkpoint', () => {
      const entry = readCheckpoints().find(item => item.id === checkpointSelect.value);
      if (!entry) throw new Error('Select a saved checkpoint first.');
      if (!confirm(`Restore “${entry.name}” from ${new Date(entry.created).toLocaleString()}? This replaces the active warrior profile with that earlier snapshot. Current unsaved progress after that checkpoint will be lost.`)) return;
      if (!bridge.restoreCheckpoint) throw new Error('The profile restore method is unavailable.');
      bridge.restoreCheckpoint(entry.xml);
      report(`Restored “${entry.name}”. Reloading the game…`);
      setTimeout(() => location.reload(), 700);
    }, 'warn');
    addButton(checkpointButtons, 'Delete checkpoint', () => {
      const items = readCheckpoints();
      const index = items.findIndex(item => item.id === checkpointSelect.value);
      if (index < 0) throw new Error('Select a checkpoint first.');
      const removed = items.splice(index, 1)[0];
      writeCheckpoints(items);
      refreshCheckpoints();
      report(`Deleted checkpoint “${removed.name}”.`);
    });

    const battleReadoutHint = document.createElement('div');
    battleReadoutHint.className = 'hint';
    battleReadoutHint.textContent = 'Live battle telemetry appears only during a fight. This readout shows the current fight type, round, frame, and actor availability. No unverified health or Hard-meter values are displayed or modified.';
    battleSection.appendChild(battleReadoutHint);
    const battleReadout = document.createElement('div');
    battleReadout.className = 'status';
    battleReadout.textContent = 'No battle data loaded.';
    battleSection.appendChild(battleReadout);
    addButton(battleSection, 'Refresh battle telemetry', () => {
      if (!bridge.getBattleDiagnostics) throw new Error('Battle diagnostics are unavailable.');
      const data = bridge.getBattleDiagnostics();
      if (!data.active) {
        battleReadout.textContent = 'No active fight. Start a battle, then refresh.';
        return;
      }
      battleReadout.textContent = `Type: ${data.battleType}\nRound: ${data.round == null ? '—' : data.round}\nFrame: ${data.frame == null ? '—' : data.frame}\nPlayer actor: ${data.playerReady ? 'Ready' : 'Unavailable'}\nOpponent actor: ${data.opponentReady ? 'Ready' : 'Unavailable'}`;
      report('Battle telemetry refreshed.');
    });

    const saveTools = section('Profile backup & transfer');
    const saveHint = document.createElement('div');
    saveHint.className = 'hint';
    saveHint.textContent = 'Export a complete profile snapshot as an XML file. Import replaces the active profile, so create a checkpoint first. Only import a backup you trust.';
    saveTools.appendChild(saveHint);
    const backupButtons = document.createElement('div');
    backupButtons.className = 'buttons';
    saveTools.appendChild(backupButtons);
    addButton(backupButtons, 'Export profile XML', () => {
      if (!bridge.getCheckpointXml) throw new Error('Profile export is unavailable.');
      const xml = bridge.getCheckpointXml();
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sf2-profile-${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      report('Profile XML export started.');
    }, 'primary');
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.xml,application/xml,text/xml';
    importInput.setAttribute('aria-label', 'Choose profile XML backup');
    saveTools.appendChild(importInput);
    addButton(backupButtons, 'Import profile XML', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) throw new Error('Choose an XML backup file first.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup file is larger than 10 MB.');
      const xml = await file.text();
      if (!/^\s*<\?xml|^\s*<\w+/i.test(xml)) throw new Error('The selected file does not look like an XML profile backup.');
      if (!confirm(`Import “${file.name}”? This replaces the active profile. Create a checkpoint first; unsaved progress may be lost.`)) return;
      if (!bridge.restoreCheckpoint) throw new Error('Profile import is unavailable.');
      bridge.restoreCheckpoint(xml);
      report('Profile imported. Reloading the game…');
      setTimeout(() => location.reload(), 700);
    }, 'warn');

    const advanced = section('Advanced');
    addButton(advanced, 'Reset game progress', () => {
      if (!confirm('This calls the game reset routine and may erase your progress. Continue?')) return;
      p.Z0a();
      report('Reset routine called.');
    }, 'warn');
    const warning = document.createElement('div');
    warning.className = 'hint';
    warning.textContent = 'Built against the captured SF2 v1.1.33 game bundle. Infinite energy is a runtime toggle; its ON/OFF preference is saved by the panel and restored only when the userscript runs. Back up your profile before importing or restoring saves.';
    advanced.appendChild(warning);

    close.addEventListener('click', () => {
      panel.remove();
      const reopen = document.createElement('button');
      reopen.id = 'sf2-custom-cheat-reopen';
      reopen.textContent = 'SF2 Cheats';
      Object.assign(reopen.style, {
        position: 'fixed', top: '72px', right: '18px', zIndex: '2147483646',
        padding: '9px 12px', border: '1px solid #40516d', borderRadius: '9px',
        color: '#fff', background: '#1b2940', cursor: 'pointer', font: '13px system-ui,sans-serif'
      });
      reopen.addEventListener('click', () => { reopen.remove(); document.body.appendChild(panel); });
      document.body.appendChild(reopen);
    });

    // Drag the panel by its header.
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.target === close) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      panel.style.left = `${Math.max(0, drag.left + event.clientX - drag.x)}px`;
      panel.style.top = `${Math.max(0, drag.top + event.clientY - drag.y)}px`;
      panel.style.right = 'auto';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });

    document.body.appendChild(panel);
    report('Connected. Custom panel v3.2 is ready.');
  }
})();
