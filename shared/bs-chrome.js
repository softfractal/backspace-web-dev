/* ══════════════════════════════════════════════════════════════════════════
   backspace — SHARED CHROME (engine half of the pair), v1.1.
   FACTORING RATIFIED (Eric, Aug 23 2026, community-phase decision batch):
   the shared pair is law; home.html supersedes backspace_home.html as the
   shipped homepage, and the certified v3 file stays archived as the frozen
   witness. Originally built as the Aug 21 GM addendum Part B deliverable 1.
   The machine here is the certified port from
   backspace_home.html (v3): one focus variable, the C14/trough wheel
   bridge verbatim (constants untouched — DO NOT retune here), honest 1:1
   touch, pill commit-lock keyboard model, shake denial, four-event sound
   bus with the retry-safe unlock latch, ISO-keyed i18n.

   Pages mount this file and register their surfaces through BSChrome.init:
   the page owns its primary surface (home: the vertical menu; software:
   the corner rail) and its commit/back semantics; the chrome owns the
   tokensless machinery both pages share. Every seam is a named PAGE hook —
   the certified code paths run unchanged around them.
   ══════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ── Content + i18n ────────────────────────────────────────────────────────
// STR is the i18n surface: EN shipped, CN/JA/ES slots fall back. ALL
// visible strings on every page route through keys — nothing may
// architecturally preclude CN (Chill Duan Sans is the CJK partner; verify
// subsets before CN copy lands — gate open).
var STR = {
  en: {
    hardware:  'HARDWARE',
    software:  'SOFTWARE',
    community: 'COMMUNITY',
    support:   'SUPPORT',
    homeTitle: 'backspace',
    softwareTitle: 'BACKSPACE — Software',
    // /software coming-soon copy — text verbatim from the witness build's
    // A-2 SOFTWARE-01 layer config (figmaNodeId 1:183 / 1:184).
    softwareComingSoon: 'COMING SOON...',
    softwareComingSoonSub: 'Manage your devices, update firmware, and personalize your workspace through one seamless app.',
    // /community — labels verbatim from the witness's A-3 COMMUNITY layer
    // config (figmaNodeIds 1:214-1:219; the registry titles the scene
    // "BACKSPACE - Community" — em dash per the shipped title convention).
    // Platform names are brand marks and stay untranslated unless the
    // company rules a per-locale platform set (CN seam: these keys).
    communityTitle:  'BACKSPACE — Community',
    socialInstagram: 'Instagram',
    socialYouTube:   'YouTube',
    socialTikTok:    'TikTok',
    socialX:         'X',
    socialDiscord:   'Discord',
    socialFacebook:  'Facebook',
    // Third-party airlock (witness external-overlay markup, verbatim; the
    // Continue action is the Aug 23 extension Eric ratified with the slug
    // build). {p} is the platform slot — locales may reorder around it.
    extKicker:   'THIRD PARTY',
    extTitle:    'CONTINUE TO {p}',
    extPending:  'External destination pending.',
    extContinue: 'Continue',
    extCancel:   'Cancel',
    // ── /support (page four) — labels from the design team's A-4 / 1-1 /
    // 1-2 / 1-3 frames. This page was never built in the demo site, so the
    // frames are VISUAL REFERENCE mixed with the shipped pages' own
    // grammar (RULED — Eric, Aug 24), not an exact-value port.
    // ERRATA LAW: the 1-3 frame reads "emile address" — a typo. The key
    // below ships the CORRECT string; the typo is filed to the design
    // team and never appears in the markup.
    supportTitle:    'BACKSPACE — Support',
    supContact:      'CONTACT US',
    supFaq:          'FAQ',
    supWarranty:     'WARRANTY',
    supReturn:       'RETURN & REFUND POLICY',
    supGuides:       'PRODUCT GUIDES',
    supBusiness:     'BUSINESS REQUEST',
    // The right rail — LOCK-side furniture (Eric, Aug 24: frame 1-1 shows
    // it too early; on hover only the excerpt window exists).
    supRailIntro:    'For product support, order questions, warranty help, or general customer service, please contact us at:',
    supEmail:        'support@pressbackspace.com',
    supEmailCopy:    'Copy the support address',
    supEmailCopied:  'copied',
    supRailReturns:  'For any questions about returns, refunds, or exchanges, please contact our support team.',
    supFormCta:      'fill out form',
    // The window.
    supReqType:      'request type',
    supFldName:      'user name',
    supFldEmail:     'email address',
    supFldCountry:   'country code',
    supFldPhone:     'contact number',
    supFldSubject:   'subject',
    supFldModel:     'product model',
    supFldRequests:  'my requests',
    supFormNote:     'You can also submit a support request and our team will get back to you as soon as possible',
    supSubmit:       'Submit',
    // Submit is a LABELED STUB pending the wiring ruling (endpoint /
    // mailto / disabled-until-go-live). The copy is honest about it —
    // nothing pretends to have sent.
    supSubmitPending:'Submissions open at launch — nothing was sent.',
    supInvalid:      'Complete the marked fields.',
    // Request-type options — PLACEHOLDER SET. Only "product consulting"
    // is evidenced in the frames (drawn twice — an artifact, one option);
    // the real list is a manifest confirm and swaps in here.
    supReqConsulting:'product consulting',
    supReqOrder:     'order & delivery',
    supReqWarranty:  'warranty & repair',
    supReqReturns:   'returns & refunds',
    supReqBusiness:  'business & wholesale',
    // The five non-anchor items ride the SAME ladder with placeholder
    // content (Eric, Aug 24). Real copy swaps in at these keys — no code
    // changes.
    supLoremExcerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    supLoremBody:    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
  },
  zh: { /* populated when CN content lands; lookups fall back to en */ },
  ja: {},
  es: {}
};
// ISO 639-1 codes (the mockup's SP corrected to ES per Eric). Offering all
// four in the picker is the ratified design; only EN carries content yet.
var LANGS = ['en','zh','ja','es'];
var LANG_ATTR = { en:'en', zh:'zh-CN', ja:'ja', es:'es' };
var lang = 'en';
function T(key){ return (STR[lang] && STR[lang][key]) || STR.en[key] || key; }

var SECTIONS = ['hardware','software','community','support'];

// ── Routes — real pages, real history ─────────────────────────────────────
// Production serves clean paths (/software); the local python server and
// file:// serve sibling .html files. Resolved once at boot.
var HTMLISH = /\.html$/i.test(location.pathname) || location.protocol === 'file:';
var ROUTES = HTMLISH
  ? { home: 'home.html', software: 'software.html', community: 'community.html', support: 'support.html' }
  : { home: '/', software: '/software', community: '/community', support: '/support' };

// Commit-arrival vs cold boot (Part B deliverable 3): the committing page
// stamps a same-tab flag before real navigation; the arriving page
// consumes it exactly once. Absent flag = cold boot (deep link) — no
// entrance choreography, nothing to pop.
var ARRIVAL_KEY = 'bs-nav-from';
function commitNavigate(section){
  var to = ROUTES[section];
  if (!to) return false;
  try { sessionStorage.setItem(ARRIVAL_KEY, PAGE_ID); } catch (e) {}
  location.assign(to);
  return true;
}
function consumeArrival(){
  var v = null;
  try {
    v = sessionStorage.getItem(ARRIVAL_KEY);
    sessionStorage.removeItem(ARRIVAL_KEY);
  } catch (e) {}
  return v;
}

// ── Page seam ─────────────────────────────────────────────────────────────
var PAGE_ID = 'home';
// Defaults are inert; init() overlays the page's hooks. Certified code
// paths call these exactly where backspace_home.html read its own state.
var PAGE = {
  isLocked:      function(){ return false; },   // home: committed !== null
  denyLocked:    function(){},                  // home: shake the locked item
  goBack:        function(){},                  // Escape at the bottom of the chrome ladder
  escapeFromRail:function(){},                  // Esc from the icon rail (home: cursor to menu)
  enterAtPrimary:function(){},                  // Enter with no rail cursor
  verticalStep:  function(down){},              // W/S outside the rail
  railVertical:  function(down){},              // W/S while the rail cursor is set
  horizontalCold:function(dir){},               // A/D with no cursor anywhere
  wheelStep:     function(dir){ return false; },// the wheel bridge's stepper
  // WHEEL OWNERSHIP SEAM (support, Aug 24): a page surface with its OWN
  // native scroll — the locked support panel — must keep the wheel. The
  // bridge asks BEFORE it preventDefaults; true = hands off entirely (no
  // step, no deny, no swallowed gesture). Default inert, so the certified
  // path for every existing page is unchanged.
  wheelNative:   function(e){ return false; },
  wheelPitch:    function(){ return 55; },      // measured trigger pitch
  clearPrimary:  function(){},                  // one cursor: rail claims → primary clears
  idleReset:     function(){},                  // attract: everything pops back in
  onLangChange:  function(){},
  onFontsReady:  function(){},
  devState:      function(){ return {}; }
};

// ── State ─────────────────────────────────────────────────────────────────
// ONE focus variable per rail, and the cursor lives on exactly one rail at
// a time. Hover and the keyboard cursor are the same state.
var _touchInput = false;   // sticky: any touch seen → hover suppression

// ── Sound bus — four events, files land later ─────────────────────────────
// RETRY-SAFE latch: `unlocked` only sets once the context actually runs —
// a hover or Escape cannot burn the unlock.
var SoundBus = {
  ctx: null, unlocked: false, muted: false, samples: {}, volume: 0.7,
  unlock: function(){
    if (this.unlocked) return;
    var self = this;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC){ this.unlocked = true; return; }
      if (!this.ctx) this.ctx = new AC();
      var arm = function(){
        if (!self.unlocked && self.ctx.state === 'running'){
          self.unlocked = true;
          self.play('ambient');
        }
      };
      if (this.ctx.state === 'running'){ arm(); return; }
      this.ctx.resume().then(arm).catch(function(){});
    } catch (e) {}
  },
  play: function(name){
    if (this.muted || !this.ctx) return;
    var s = this.samples[name];           // detent | deny | commit | ambient
    if (!s) return;                       // stub: sound engineer's files bind here
  }
};

function hapticTick(){
  var h = document.getElementById('bs-haptic');
  if (h) { try { h.click(); } catch (e) {} }
}

// ── Shake denial — restart-safe, strand-safe ──────────────────────────────
function shakeEl(el){
  if (!el) return;
  // Cancel the previous invocation's fallback timer FIRST — a stale timer
  // from denial #1 firing ~0-50ms into denial #2's animation clips the new
  // shake and that denial reads as silent.
  if (el._bsShakeT){ clearTimeout(el._bsShakeT); el._bsShakeT = null; }
  el.classList.remove('bs-shake');
  void el.offsetWidth;
  el.classList.add('bs-shake');
  var clean = function(){ el.classList.remove('bs-shake'); };
  el.addEventListener('animationend', function h(){
    clean();
    el.removeEventListener('animationend', h);
  }, { once: true });
  // If the animation is ever elided, animationend never fires — the guard
  // class must not strand or every later denial goes silent.
  el._bsShakeT = setTimeout(function(){ el._bsShakeT = null; clean(); }, 450);
}
function denyOn(el){ shakeEl(el); SoundBus.play('deny'); }

// One commit/back per 400ms window (journal canon) — a double-click's
// second click must not instantly toggle back out.
var _clickAt = 0;
function clickOk(){
  var n = Date.now();
  if (n - _clickAt < 400) return false;
  _clickAt = n;
  return true;
}

// ── Attract / idle ────────────────────────────────────────────────────────
var IDLE_MS = 60000;
var _idleTimer = null;
function armIdle(){
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(function(){
    if (!PAGE.isLocked()){ PAGE.idleReset(); }   // idle → everything pops back in
    // Lock dwell (home: the airlock): keep the clock alive so a browser-
    // gesture exit still resets afterward.
    else armIdle();
  }, IDLE_MS);
}
function wake(){
  SoundBus.unlock();
  armIdle();
}

// ── UI scale — the demo's --ui-scale, derived from the 1920×1080 design
// frame; every ported px value multiplies by it. ─────────────────────────
function setScale(){
  var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  s = Math.max(0.7, Math.min(1.4, s));
  document.documentElement.style.setProperty('--ui-scale', s);
}
var _rzTimer = null;
window.addEventListener('resize', function(){
  setScale();
  clearTimeout(_rzTimer);
  _rzTimer = setTimeout(function(){ PAGE.onFontsReady(); }, 150);   // re-measure hook
});

// ── Utility cluster — markup identical to the certified static DOM,
// injected so both pages render byte-identical chrome. ───────────────────
function buildUtilityCluster(){
  var mount = document.getElementById('bs-icons');
  if (!mount) return;
  mount.innerHTML =
    '<div class="bs-hit"><div class="bs-pill" id="bs-pill-lang" style="--open-h: calc(157px * var(--icons-scale))">' +
      '<button class="bs-head" id="bs-lang" type="button" aria-label="Language" aria-haspopup="true" aria-expanded="false">EN</button>' +
      '<div class="bs-tray" id="bs-lang-tray"></div>' +
    '</div></div>' +
    '<div class="bs-hit"><div class="bs-pill" id="bs-pill-sound" style="--open-h: calc(209px * var(--icons-scale))">' +
      '<button class="bs-head" id="bs-sound" type="button" aria-label="Sound" aria-haspopup="true" aria-expanded="false">' +
        '<img src="assets/ui/icon-figma-brand-awareness.png" alt="" aria-hidden="true">' +
      '</button>' +
      '<div class="bs-tray">' +
        '<div id="bs-vol-track" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="70" aria-orientation="vertical">' +
          '<div id="bs-vol-fill"></div>' +
        '</div>' +
      '</div>' +
    '</div></div>' +
    '<div class="bs-hit"><button class="bs-round" id="bs-cart" type="button" aria-label="Cart">' +
      '<img src="assets/ui/icon-cart-checkout.svg" alt="" aria-hidden="true">' +
    '</button></div>' +
    '<div class="bs-hit"><div class="bs-pill" id="bs-pill-account" style="--open-h: calc(178px * var(--icons-scale))">' +
      '<button class="bs-head" id="bs-account" type="button" aria-label="Account" aria-haspopup="true" aria-expanded="false">' +
        '<img src="assets/ui/icon-figma-person.png" alt="" aria-hidden="true">' +
      '</button>' +
      '<div class="bs-tray">' +
        '<button class="bs-tray-item" id="bs-acct-signin" type="button" aria-label="Sign in">' +
          '<img src="assets/ui/bs_icon_signin.png" alt="" aria-hidden="true">' +
        '</button>' +
        '<button class="bs-tray-item" id="bs-acct-details" type="button" aria-label="Account details">' +
          '<img src="assets/ui/bs_icon_account_details.png" alt="" aria-hidden="true">' +
        '</button>' +
        '<button class="bs-tray-item" id="bs-acct-orders" type="button" aria-label="Order lookup">' +
          '<img src="assets/ui/bs_icon_order_lookup.png" alt="" aria-hidden="true">' +
        '</button>' +
      '</div>' +
    '</div></div>';
}

// ── Pills — hover grows the circle into a capsule; touch taps the head to
// open first; a tap outside closes everything. ───────────────────────────
function bindPill(pillEl, headEl){
  var pill = pillEl, head = headEl;
  function open(){
    if (!pill.classList.contains('is-open')){
      pill.classList.add('is-open');
      head.setAttribute('aria-expanded', 'true');
      if (api.onOpenChange) api.onOpenChange(true);
    }
  }
  var api;
  function close(){
    // A LOCKED pill (Enter-expanded) ignores the ambient close paths —
    // hover-leave and focus-out. Only unlockPill()/forceClose dissolve it.
    if (api && api.lockHold) return;
    if (pill.classList.contains('is-open')){
      pill.classList.remove('is-open');
      head.setAttribute('aria-expanded', 'false');
      if (api.onOpenChange) api.onOpenChange(false);
    }
  }
  // Hover binds on the .bs-hit pad — the mouse vicinity, wider than the
  // visible pill (Eric: like the menu's hit areas). Controls without a
  // pad (the corner pill) bind on the element itself, per the witness.
  var hit = pill.closest('.bs-hit') || pill;
  hit.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') open(); });
  hit.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') close(); });
  pill.addEventListener('focusin', open);
  pill.addEventListener('focusout', function(e){ if (!pill.contains(e.relatedTarget)) close(); });
  api = {
    el: pill, head: head, open: open, close: close,
    lockHold: false,
    onOpenChange: null,
    forceClose: function(){
      api.lockHold = false;
      if (pill.classList.contains('is-open')){
        pill.classList.remove('is-open');
        head.setAttribute('aria-expanded', 'false');
        if (api.onOpenChange) api.onOpenChange(false);
      }
    },
    isOpen: function(){ return pill.classList.contains('is-open'); },
    // Touch: the first tap on the head only EXPANDS. Returns true when it
    // consumed the tap, so the head's own action waits for the second.
    touchOpenConsumed: function(){
      if (_touchInput && !this.isOpen()){ open(); return true; }
      return false;
    }
  };
  return api;
}

// ── The rail — the horizontal home of the one cursor ─────────────────────
// The cursor lives on exactly one rail at a time: the page's primary
// surface and this rail each clear the other. The cursored control renders
// as its hover state (expandable pills open under it via Enter; plain
// controls glow), so keyboard and mouse stay pixel-identical.
// Controls: { headEl, pill, trayAxis: 'y'|'x', activate() }. Pages may
// prepend leading controls (the away corner) ahead of the utility four.
var ICONS = [];
var iconIdx = -1;
// The pill LOCK (Eric's rule): the bar cursor only GLOWS a head — Enter
// expands its pill and locks it, remapping the tray axis inside (the
// commit-lock pattern: contexts lock and controls re-map). Esc pops the
// lock. Without the lock the trays would be unreachable by keyboard.
var iconLock = null;   // index of the Enter-locked pill, or null
var trayIdx  = -1;     // sub-cursor inside the locked pill's tray (list pills)
function trayItems(i){
  var c = ICONS[i];
  if (c.trayItems) return c.trayItems();
  return Array.prototype.slice.call(c.pill.el.querySelectorAll('.bs-tray-item'));
}
function renderTray(){
  if (iconLock === null) return;
  if (ICONS[iconLock].headEl.id === 'bs-sound'){
    document.getElementById('bs-vol-track').classList.add('kb-hover');   // the slider arms as a whole
    return;
  }
  trayItems(iconLock).forEach(function(b, i){ b.classList.toggle('kb-hover', i === trayIdx); });
}
function lockPill(i){
  var c = ICONS[i];
  if (!c.pill) return false;
  iconLock = i;
  c.pill.lockHold = true;
  c.pill.open();
  trayIdx = 0;
  renderTray();
  SoundBus.play('commit');
  hapticTick();
  return true;
}
function unlockPill(){
  if (iconLock === null) return;
  var c = ICONS[iconLock];
  if (c.headEl.id === 'bs-sound') document.getElementById('bs-vol-track').classList.remove('kb-hover');
  else trayItems(iconLock).forEach(function(b){ b.classList.remove('kb-hover'); });
  c.pill.forceClose();
  iconLock = null;
  trayIdx = -1;
}
function trayStep(dir){
  if (ICONS[iconLock].headEl.id === 'bs-sound'){
    // The volume tray is a slider, not a list: W/↑ louder, S/↓ quieter.
    setVolume(SoundBus.volume + (dir < 0 ? 0.05 : -0.05));
    SoundBus.play('detent'); hapticTick();
    return;
  }
  var items = trayItems(iconLock);
  var next = Math.max(0, Math.min(items.length - 1, trayIdx + dir));
  if (next === trayIdx) return;   // ends clamp silently
  trayIdx = next;
  renderTray();
  SoundBus.play('detent'); hapticTick();
}
function setIconFocus(i){
  if (i === iconIdx) return;
  if (iconLock !== null) unlockPill();   // moving the cursor dissolves the lock
  var prev = iconIdx;
  iconIdx = i;
  if (prev >= 0) ICONS[prev].headEl.classList.remove('kb-hover');
  if (i >= 0){
    PAGE.clearPrimary();                             // one cursor — the primary pops back in
    ICONS[i].headEl.classList.add('kb-hover');       // GLOW only — Enter expands
    if (ICONS[i].pill) ICONS[i].pill.el.classList.add('kb-hover');
    SoundBus.play('detent');
    hapticTick();
  }
  if (prev >= 0 && ICONS[prev].pill) ICONS[prev].pill.el.classList.remove('kb-hover');
}
function iconStep(dir){
  var next = Math.max(0, Math.min(ICONS.length - 1, (iconIdx < 0 ? 0 : iconIdx) + dir));
  setIconFocus(next);   // ends clamp silently — no wrap
}
function bindRailHover(){
  // Mouse parity: hovering a head puts the cursor there; leaving the
  // control clears it (the pill's own hover open/close is idempotent
  // alongside).
  ICONS.forEach(function(c, i){
    var hit = c.headEl.closest('.bs-hit') || (c.pill ? c.pill.el : c.headEl);
    hit.addEventListener('mouseenter', function(){
      if (_touchInput || PAGE.isLocked()) return;
      setIconFocus(i);
    });
    hit.addEventListener('pointerleave', function(e){
      if (e.pointerType !== 'mouse') return;
      if (iconIdx === i) setIconFocus(-1);
    });
  });
}

// ── Keyboard — game keys; every hover has a keyboard twin ─────────────────
function bindKeyboard(){
  document.addEventListener('keydown', function(e){
    var key = e.key;
    // The UTILITY buttons own their own keys (Tab-focused lang/sound/cart/
    // account activate natively). Primary-nav surfaces (the menu, the
    // corner) belong to the machine: their keys flow through — and the
    // machine's preventDefault on Enter suppresses the native double-
    // activation a focused button would otherwise add.
    if (e.target && e.target.closest && e.target.closest('#bs-icons')) return;
    // Browser/OS chords are not menu input.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (key === 'Escape'){
      e.preventDefault(); wake();
      if (!PAGE.isLocked() && iconLock !== null){ unlockPill(); return; }                    // locked pill → bar (one level)
      if (!PAGE.isLocked() && iconIdx >= 0){ setIconFocus(-1); PAGE.escapeFromRail(); return; } // rail → primary (one level)
      PAGE.goBack();
      return;
    }
    if (key === 'Enter'){
      e.preventDefault(); wake();
      if (PAGE.isLocked()) return;    // Enter only OPENS; Esc/back are the sole closers
      if (iconIdx >= 0){
        if (iconLock !== null){
          // Inside a locked pill: Enter activates the sub-cursor's target
          // (the volume pill's action is the head's own mute toggle).
          if (ICONS[iconLock].headEl.id === 'bs-sound') ICONS[iconLock].headEl.click();
          else { var ti = trayItems(iconLock)[trayIdx]; if (ti) ti.click(); }
          return;
        }
        if (ICONS[iconIdx].pill){ lockPill(iconIdx); return; }   // expandable: Enter expands + LOCKS
        if (ICONS[iconIdx].activate){ ICONS[iconIdx].activate(); return; }
        ICONS[iconIdx].headEl.click();                            // plain control: Enter activates
        return;
      }
      PAGE.enterAtPrimary();
      return;
    }
    if (key==='w'||key==='W'||key==='ArrowUp'||key==='s'||key==='S'||key==='ArrowDown'){
      e.preventDefault(); wake();
      if (PAGE.isLocked()){ PAGE.denyLocked(); return; }
      var down = (key==='s'||key==='S'||key==='ArrowDown');
      if (iconLock !== null){
        // LOCKED: the tray's own axis steps; a foreign axis refuses loudly
        // (axes never double-book).
        if ((ICONS[iconLock].trayAxis || 'y') === 'y'){ trayStep(down ? 1 : -1); }
        else { var lh = ICONS[iconLock].headEl; if (!lh.classList.contains('bs-shake')) denyOn(lh); }
        return;
      }
      if (iconIdx >= 0){ PAGE.railVertical(down); return; }
      PAGE.verticalStep(down);
      return;
    }
    if (key==='a'||key==='A'||key==='ArrowLeft'||key==='d'||key==='D'||key==='ArrowRight'){
      // A/D are the HORIZONTAL axis — they drive the rail (and a locked
      // horizontal tray) and nothing else.
      var right = (key==='d'||key==='D'||key==='ArrowRight');
      if (iconLock !== null && !PAGE.isLocked()){
        e.preventDefault(); wake();
        if ((ICONS[iconLock].trayAxis || 'y') === 'x'){ trayStep(right ? 1 : -1); return; }
        // The rail is frozen while a vertical pill is locked — locks
        // refuse loudly.
        var lockedHead = ICONS[iconLock].headEl;
        if (!lockedHead.classList.contains('bs-shake')) denyOn(lockedHead);
        return;
      }
      if (iconIdx >= 0 && !PAGE.isLocked()){
        e.preventDefault(); wake();
        iconStep(right ? 1 : -1);
        return;
      }
      if (!PAGE.isLocked()){ e.preventDefault(); wake(); PAGE.horizontalCold(right ? 1 : -1); return; }
      wake();
      return;
    }
    wake();
  });
}

// ── Wheel bridge — PORTED MECHANICALLY from the softfractal build ─────────
// C14 lineage, trough-re-acceleration variant (SHIP, promoted 2026-08-09).
// Constants calibrated on seven real device captures — they describe the
// trackpad's event stream, not the surface, and transfer unchanged. DO NOT
// retune here; derivations live in the source build.
var WHEEL_MAX_STEPS     = 1;
var WHEEL_QUIET_MS      = 30;
var WHEEL_LONG_MS       = 250;
var WHEEL_FADE_HITS     = 4;
var WHEEL_NOTCH_PX      = 40;
var WHEEL_STEP_RATIO    = 1.0;  // trigger = measured menu pitch × this
var WHEEL_RA_MULT       = 1.8;
var WHEEL_RA_FLOOR      = 8;
var WHEEL_TROUGH_MIN    = 10;
var WHEEL_COAST_MIN_MS  = 170;  // TIME, never an event count
var WHEEL_RA_SUSTAIN    = 2;
var WHEEL_STEP_FLOOR_MS = 150;
var wheelSteps=0, wheelAccum=0, wheelLastMag=0, wheelFades=0, wheelCoasting=false,
    wheelLastT=-1e9, wheelTrough=0, wheelCoastRun=0, wheelCoastT0=0, wheelRaRun=0,
    wheelLastStepT=-1e9, wheelNowT=0;

function wheelStepOne(dir){
  if (wheelSteps >= WHEEL_MAX_STEPS) return false;   // budget spent — walls stay live
  if (!PAGE.wheelStep(dir)) return false;             // wall/lock — no budget, no stamp
  wheelSteps++;
  wheelLastStepT = wheelNowT;
  return true;
}

function bindWheel(){
  window.addEventListener('wheel', function(e){
    // ctrl+wheel / pinch is the browser's ZOOM, not menu input — pass
    // through before the bridge can misread it.
    if (e.ctrlKey) return;
    // The page may own this wheel outright (a locked panel's native
    // scroll) — asked BEFORE preventDefault, or the scroll is already dead.
    if (PAGE.wheelNative(e)) return;
    e.preventDefault();
    wake();
    if (PAGE.isLocked()){ PAGE.denyLocked(); return; }
    var px = e.deltaY;
    if (e.deltaMode === 1) px *= 16;
    else if (e.deltaMode === 2) px *= window.innerHeight;
    // e.timeStamp = when the INPUT happened — a stalled main thread (low
    // power) cannot distort the measured cadence.
    var t = (e.timeStamp != null) ? e.timeStamp : performance.now();
    wheelNowT = t;
    // ZERO-DELTA KEEPALIVE: fingers down but stationary still emit events —
    // they must refresh the clock or a mid-gesture hold reads as a real
    // pause and the release momentum steps a second time.
    if (!px){ wheelLastT = t; return; }
    var mag = Math.abs(px);
    var gap = t - wheelLastT; wheelLastT = t;
    if (gap >= WHEEL_LONG_MS){                    // real pause → fully from rest
      wheelSteps=0; wheelAccum=0; wheelLastMag=0; wheelFades=0;
      wheelCoasting=false; wheelTrough=0; wheelRaRun=0;
    } else if (gap >= WHEEL_QUIET_MS && (wheelCoasting || wheelLastMag <= 0)){
      // Deliberately does NOT clear wheelTrough — clearing it here is the
      // low-power lockup (the trough zeroes before the re-accel test reads
      // it and the sticky coast swallows every following swipe).
      wheelSteps=0; wheelAccum=0;
    }
    var wasRest = (wheelLastMag <= 0);            // captured BEFORE the update
    // TIME-FREE GESTURE BOUNDARY: momentum only decays — once the coast is
    // ESTABLISHED, the tail's floor is a reference a new push must clear.
    var _tr = Math.max(wheelTrough, WHEEL_TROUGH_MIN);
    var raHit = (wheelCoasting && wheelTrough > 0 &&
                 (t - wheelCoastT0) >= WHEEL_COAST_MIN_MS &&
                 (t - wheelLastStepT) >= WHEEL_STEP_FLOOR_MS &&
                 mag >= _tr * WHEEL_RA_MULT && mag >= _tr + WHEEL_RA_FLOOR &&
                 mag > wheelLastMag);             // MUST BE RISING
    wheelRaRun = raHit ? wheelRaRun + 1 : 0;      // a spike breaks its own run
    var reaccel = (wheelRaRun >= WHEEL_RA_SUSTAIN);
    // Decay tracking runs BEFORE the budget check so it sees every event.
    // The rise branch does NOT clear wheelCoasting — STICKY COAST.
    if (mag > wheelLastMag + 1){ wheelFades = 0; }
    else if (mag < wheelLastMag - 1){ wheelFades++; }
    wheelLastMag = mag;
    if (wheelFades >= WHEEL_FADE_HITS){ if (!wheelCoasting){ wheelCoasting = true; wheelCoastRun = 0; wheelCoastT0 = t; } }
    if (wheelCoasting){ wheelCoastRun++;
      wheelTrough = (wheelTrough > 0 ? Math.min(wheelTrough, mag) : mag); }
    if (reaccel){ wheelSteps=0; wheelAccum=0; wheelTrough=0; wheelCoastT0=t;
                  wheelCoasting=false; wheelFades=0; wheelCoastRun=0; wheelRaRun=0; }

    if (wheelSteps >= WHEEL_MAX_STEPS) return;                       // 1. budget spent
    if (e.deltaMode !== 0){ wheelStepOne(px > 0 ? 1 : -1); return; } // discrete line/page notch
    if (wasRest && wheelAccum === 0 && mag >= WHEEL_NOTCH_PX){       // 2. mouse notch from rest
      wheelStepOne(px > 0 ? 1 : -1); return;
    }
    if (wheelCoasting) return;                                       // 3. swallow the tail
    wheelAccum += px;                                                // 4. bank the travel
    var trigger = PAGE.wheelPitch() * WHEEL_STEP_RATIO;
    while (Math.abs(wheelAccum) >= trigger){
      var wdir = wheelAccum > 0 ? 1 : -1;
      if (!wheelStepOne(wdir)){ wheelAccum = 0; break; }             // wall or budget → drop the bank
      wheelAccum -= wdir * trigger;
    }
  }, { passive: false });
}

// ── Touch bridge — journal port ───────────────────────────────────────────
// ACCUMULATE, not gesture-lock: finger travel is honest 1:1 with no
// momentum tail — a long deliberate drag SHOULD walk (uncapped by design).
// Bound to the surfaces the page names: users grab the thing they're
// looking at. The LOCK lives here in the JS guard, not in touch-action.
var TOUCH_STEP_RATIO = 1.0;
var TOUCH_CLAIM_PX   = 10;
function bindTouchDrum(el){
  if (!el) return;
  var t0 = null, owned = false;
  el.addEventListener('touchstart', function(e){
    // NEVER preventDefault on touchstart — it kills the synthetic click.
    _touchInput = true;
    owned = false;
    if (e.touches.length !== 1){ t0 = null; return; }
    t0 = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchmove', function(e){
    if (t0 === null || e.touches.length !== 1) return;
    var dy = t0 - e.touches[0].clientY;
    if (!owned && Math.abs(dy) < TOUCH_CLAIM_PX) return;   // still a tap candidate
    e.preventDefault();                                     // claimed
    if (!owned){ owned = true; wake(); }
    if (PAGE.isLocked()){ PAGE.denyLocked(); return; }
    var pitch = PAGE.wheelPitch() * TOUCH_STEP_RATIO;
    if (Math.abs(dy) >= pitch){
      PAGE.wheelStep(dy > 0 ? 1 : -1);     // one item per pitch of travel
      t0 = e.touches[0].clientY;           // re-base → a long drag walks
    }
  }, { passive: false });
  var end = function(){ t0 = null; owned = false; };
  el.addEventListener('touchend', end, { passive: true });
  el.addEventListener('touchcancel', end, { passive: true });
}

// ── Language / volume / account / cart — certified bindings ───────────────
var pillLang, pillSound, pillAccount;
function setLang(code){
  lang = code;
  document.getElementById('bs-lang').textContent = code.toUpperCase();
  var live = Object.keys(STR[code] || {}).length > 0;
  document.documentElement.setAttribute('lang', live ? LANG_ATTR[code] : 'en');
  buildLangTray();
  PAGE.onLangChange(T);
  normalizeWordGlow();
}
/* WHOLE-WORD NORMALIZATION (Eric, Aug 23 — glow law rule 6, equation
   form; supersedes the same-day 1-char bucket). Smaller text icons
   carry ONE glow intensity regardless of letter count. Per element and
   state the machine solves
       raw(n) = P - D*e^(-k(n-1))          uncompensated contour light
       fp(n)  = P' - D'*e^(-k'(n-1))       light at full comp paste
       f      = clamp((T - raw)/(fp - raw), 0, 1)
   and writes f into --wg-fr/--wg-fh; the word tokens' comp rings scale
   by it. Constants are FITTED (rmse <= 1.4 on 2-4 words per length,
   ui-.7 reference) per context: the row/capsule face and the tray
   face have different summation curves. T is each context's ratified
   norm (row: the long-word plateau; tray: its live 2-char level — the
   token-emission anchor surface stays byte-stable). The selector list
   IS the ruling's scope — the homepage main menu is excluded by the
   ruling; img-holding elements glow whole-element via the filter chain
   already and are skipped. Re-runs at every STR render so locale swaps
   re-solve; CJK gets its own constants when CN copy lands (Latin
   curves do not transfer). Dataset + residuals: reports/glow_audit.md. */
var GLOW_EQ = {
  row: {
    rest:  { raw: {P:34.79, D:9.64,  k:0.20}, fp: {P:45.83,  D:13.46, k:0.46}, T:32.0 },
    hover: { raw: {P:85.6,  D:35.82, k:0.34}, fp: {P:123.34, D:47.97, k:0.58}, T:81.3 }
  },
  tray: {
    rest:  null,   // tray texts carry no resting glow (structural, on record)
    hover: { raw: {P:82.48, D:46.48, k:1.00}, fp: {P:127.02, D:67.48, k:1.02}, T:65.53 }
  }
};
function glowF(eq, n){
  if (!eq) return 0;
  var e = function(c){ return c.P - c.D * Math.exp(-c.k * (n - 1)); };
  var raw = e(eq.raw), fp = e(eq.fp);
  if (fp - raw < 0.001) return 0;
  return Math.max(0, Math.min(1, (eq.T - raw) / (fp - raw)));
}
function normalizeWordGlow(){
  var els = document.querySelectorAll('.bs-social-link, .site-primary-nav__link, .bs-tray-item, #bs-lang');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.querySelector('img')) continue;
    var n = (el.textContent || '').trim().length;
    if (!n) continue;
    var ctx = (el.id === 'bs-lang' || el.classList.contains('bs-tray-item')) ? GLOW_EQ.tray : GLOW_EQ.row;
    el.style.setProperty('--wg-fr', glowF(ctx.rest, n).toFixed(3));
    el.style.setProperty('--wg-fh', glowF(ctx.hover, n).toFixed(3));
  }
}

/* THE DOM CURSOR — the page renders the two-ring cursor itself (fixed
   element on the pointer) because CSS cursor bitmaps over 32px are
   suppressed at viewport edges (fallback keyword = the OS hand Eric
   saw on the strip and the social row). `cursor: none` binds only
   under the .bs-cursor-live class added HERE, so a dead script leaves
   the CSS-cursor fallback layer in charge — never an invisible
   pointer. Mouse only: touch and pen never see it; leaving the window
   hides it. ONE STATE for now — the +/link variant is parked (Eric,
   Aug 23); reviving it = the closest('[data-cursor-link]') toggle
   here + the .is-link rules in the css. */
function bootDomCursor(){
  if (window.matchMedia && matchMedia('(hover: none)').matches) return;
  var el = document.createElement('div');
  el.id = 'bs-cursor';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  document.documentElement.classList.add('bs-cursor-live');
  function track(e){
    if (e.pointerType && e.pointerType !== 'mouse') { el.classList.remove('is-on'); return; }
    el.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    el.classList.add('is-on');
  }
  document.addEventListener('pointermove', track, { passive: true });
  document.addEventListener('pointerdown', track, { passive: true });
  document.documentElement.addEventListener('mouseleave', function(){ el.classList.remove('is-on'); });
  window.addEventListener('blur', function(){ el.classList.remove('is-on'); });
}
function buildLangTray(){
  var langTray = document.getElementById('bs-lang-tray');
  langTray.innerHTML = '';
  LANGS.forEach(function(code){
    if (code === lang) return;                 // the head IS the current entry
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bs-tray-item';
    b.textContent = code.toUpperCase();
    b.setAttribute('aria-label', 'Switch language: ' + code.toUpperCase());
    b.addEventListener('click', function(){
      wake();
      setLang(code);
      unlockPill();        // a selection dissolves an Enter-lock…
      pillLang.close();    // …and the hover-open case closes normally
    });
    langTray.appendChild(b);
  });
}
function setVolume(v){
  SoundBus.volume = Math.max(0, Math.min(1, v));
  if (SoundBus.volume > 0) SoundBus.muted = false;   // moving the bar unmutes
  syncVolumeUI();
}
function syncVolumeUI(){
  var volFill = document.getElementById('bs-vol-fill');
  var volTrack = document.getElementById('bs-vol-track');
  var soundHead = document.getElementById('bs-sound');
  volFill.style.height = Math.round(SoundBus.volume * 100) + '%';
  volTrack.setAttribute('aria-valuenow', Math.round(SoundBus.volume * 100));
  soundHead.classList.toggle('is-off', SoundBus.muted || SoundBus.volume === 0);
}
function bindUtility(){
  pillLang    = bindPill(document.getElementById('bs-pill-lang'), document.getElementById('bs-lang'));
  pillSound   = bindPill(document.getElementById('bs-pill-sound'), document.getElementById('bs-sound'));
  pillAccount = bindPill(document.getElementById('bs-pill-account'), document.getElementById('bs-account'));

  var langHead = document.getElementById('bs-lang');
  buildLangTray();
  langHead.addEventListener('click', function(){ wake(); pillLang.touchOpenConsumed(); });

  // Volume — the mockup's bar: a white capsule fill anchored at the
  // bottom, height = level. Click/drag sets it; ↑/↓ nudge it when
  // focused; the head toggles mute (slash).
  var volTrack = document.getElementById('bs-vol-track');
  var soundHead = document.getElementById('bs-sound');
  function volFromPointer(e){
    var r = volTrack.getBoundingClientRect();
    if (r.height <= 0) return;
    setVolume(1 - (e.clientY - r.top) / r.height);
  }
  var _volDragging = false;
  volTrack.addEventListener('pointerdown', function(e){
    e.preventDefault();
    _volDragging = true;
    try { volTrack.setPointerCapture(e.pointerId); } catch (err) {}
    wake();
    volFromPointer(e);
  });
  volTrack.addEventListener('pointermove', function(e){ if (_volDragging) volFromPointer(e); });
  var _volEnd = function(){ _volDragging = false; };
  volTrack.addEventListener('pointerup', _volEnd);
  volTrack.addEventListener('pointercancel', _volEnd);
  volTrack.addEventListener('keydown', function(e){
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown'){
      e.preventDefault(); e.stopPropagation();
      wake();
      setVolume(SoundBus.volume + (e.key === 'ArrowUp' ? 0.05 : -0.05));
    }
  });
  soundHead.addEventListener('click', function(){
    wake();
    if (pillSound.touchOpenConsumed()) return;
    SoundBus.muted = !SoundBus.muted;
    syncVolumeUI();
  });
  syncVolumeUI();

  // Account — expands into sign-in / account details / order lookup
  // (Eric's icons). All three are commerce-realm stubs today: they deny
  // loudly.
  ['bs-acct-signin', 'bs-acct-details', 'bs-acct-orders'].forEach(function(id){
    var b = document.getElementById(id);
    b.addEventListener('click', function(){ wake(); denyOn(b); });
  });
  document.getElementById('bs-account').addEventListener('click', function(){
    wake();
    pillAccount.touchOpenConsumed();
  });

  // Cart — redirects to the cart page when it exists; denies meanwhile.
  // (Bound on the hit pad so clicks in the vicinity count; the shake
  // still lands on the visible button.)
  (function(){
    var cart = document.getElementById('bs-cart');
    (cart.closest('.bs-hit') || cart).addEventListener('click', function(){ wake(); denyOn(cart); });
  })();
}

// ── Outside-press sweep ───────────────────────────────────────────────────
function bindSweep(extraRoots){
  document.addEventListener('pointerdown', function(e){
    // A press outside the cluster dissolves an Enter-lock first (close()
    // is lock-guarded, so the unlock must come before the sweep), then
    // closes the hover-open pills and clears the rail cursor.
    var roots = [document.getElementById('bs-icons')].concat(extraRoots || []);
    var inCluster = roots.some(function(r){ return r && r.contains(e.target); });
    if (iconLock !== null && !inCluster) unlockPill();
    ICONS.forEach(function(c){
      if (c.pill && !c.pill.el.contains(e.target)) c.pill.close();
    });
    if (iconIdx >= 0 && !inCluster) setIconFocus(-1);
  }, { passive: true });
  // Any tap counts for attract + audio unlock (retry-safe).
  document.addEventListener('pointerdown', function(){ wake(); }, { passive: true });
}

// ── Init ──────────────────────────────────────────────────────────────────
function init(config){
  PAGE_ID = config.page || 'home';
  // Pages declare data-bs-page statically (page-conditional chrome rules
  // must hold at FIRST paint); this only backstops a missing declaration.
  if (!document.body.hasAttribute('data-bs-page')) document.body.setAttribute('data-bs-page', PAGE_ID);
  for (var k in config.hooks || {}){ PAGE[k] = config.hooks[k]; }

  buildUtilityCluster();
  bindUtility();

  ICONS = (config.leadingControls || []).concat([
    { headEl: document.getElementById('bs-lang'),    pill: pillLang,    trayAxis: 'y' },
    { headEl: document.getElementById('bs-sound'),   pill: pillSound,   trayAxis: 'y' },
    { headEl: document.getElementById('bs-cart'),    pill: null },
    { headEl: document.getElementById('bs-account'), pill: pillAccount, trayAxis: 'y' }
  ]);
  bindRailHover();
  bindKeyboard();
  bindWheel();
  (config.touchSurfaces || []).forEach(bindTouchDrum);
  bindSweep(config.sweepRoots || []);

  setScale();
  normalizeWordGlow();   // whole-word rule 6 — boot pass (page markup is live by now)
  bootDomCursor();       // the page-rendered cursor (see the CSS block's law comment)
  // Boot sits in attract (screen dormant, prompt on, nothing pre-lit);
  // wake() arms the idle clock on first input. Re-measure once the
  // webfonts land.
  if (document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ PAGE.onFontsReady(); });
  }

  // Dev hook — `?dev` exposes state for instrumented/headless captures
  // (softfractal precedent: the LOGGING build variant).
  if (/[?&]dev\b/.test(location.search)){
    window.__bs = {
      state: function(){
        var s = PAGE.devState() || {};
        s.iconIdx = iconIdx; s.iconLock = iconLock; s.trayIdx = trayIdx;
        s.volume = SoundBus.volume; s.muted = SoundBus.muted; s.lang = lang;
        s.page = PAGE_ID;
        return s;
      }
    };
  }
}

// ── Export ────────────────────────────────────────────────────────────────
window.BSChrome = {
  init: init,
  T: T, STR: STR, SECTIONS: SECTIONS, ROUTES: ROUTES,
  SoundBus: SoundBus,
  wake: wake, hapticTick: hapticTick,
  shakeEl: shakeEl, denyOn: denyOn, clickOk: clickOk,
  bindPill: bindPill,
  rail: {
    focus: setIconFocus,
    step: iconStep,
    lock: lockPill,
    unlock: unlockPill,
    index: function(){ return iconIdx; },
    lockIndex: function(){ return iconLock; },
    count: function(){ return ICONS.length; },
    isTouch: function(){ return _touchInput; }
  },
  nav: {
    commit: commitNavigate,
    consumeArrival: consumeArrival
  }
};

})();
