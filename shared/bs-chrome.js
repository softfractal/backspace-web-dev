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
    // The corner ‹ control names what it will DO, and on pages with their
    // own depth that changes with the level (see navBack). Keyed because
    // an aria-label is user-facing text and nothing may preclude CN.
    navHome:   'Home',
    navBack:   'Back',
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
    // ── The five non-anchor items run the EXPAND-DOWNWARD model (the
    // company, Aug 25, frames 1-4): a sub-list opens inside the MENU, and
    // the right side is a STACK OF PLATES that each expand in place. No
    // window, no form — that treatment belongs to CONTACT US alone.
    // These lorem keys stand in for the real copy. The manifest in
    // support.html lists KEYS, so the real content replaces these strings
    // (or points at new keys) with no code change.
    supLoremSub1:  'lorem ipsum dolor',
    supLoremSub2:  'consectetur adipiscing',
    supLoremSub3:  'sed do eiusmod tempor',
    supLoremSub4:  'incididunt ut labore',
    supLoremSub5:  'magna aliqua enim',
    supLoremRow1:  'lorem ipsum dolor sit amet?',
    supLoremRow2:  'consectetur adipiscing elit?',
    supLoremRow3:  'sed do eiusmod tempor incididunt?',
    supLoremRow4:  'ut labore et dolore magna aliqua?',
    supLoremRow5:  'quis nostrud exercitation ullamco?',
    supLoremRow6:  'duis aute irure dolor in reprehenderit?',
    supLoremBody:    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    // ── /hardware (the product page, OASIS) — phase one, Eric's Aug 28
    // rulings. Labels from the six B-1 frames (read from true-aspect
    // renders; outlined SVGs carry no strings). Class names, families,
    // finishes and colors are MANIFEST DATA behind these keys — the real
    // catalog is a copy edit, no code change. The frames' lowercase
    // "cart" and static prices are on the do-not-port list and have no
    // keys here.
    hardwareTitle:   'BACKSPACE — Hardware',
    hwOasis:         'OASIS',
    hwClassDesk:     'desk',
    hwClassModule:   'module',
    hwClassKeyboard: 'keyboard',
    hwClassMouse:    'mouse',
    hwClassLight:    'light',
    hwClassPowerbank:'powerbank',
    hwClassWatercup: 'watercup',
    hwClassHeadset:  'headset',
    hwClassSpeakers: 'speakers',
    // The eight unreal classes preview as coming-soon (Eric, Aug 28 —
    // the locked-classes game pattern).
    hwComingSoon:    'COMING SOON...',
    hwComingSoonSub: 'This class joins the OASIS catalog soon.',
    hwIntroduction:  'INTRODUCTION',
    hwCustom:        'CUSTOM',
    hwIntroOverview: 'overview',
    hwIntroDesign:   'industrial design',
    hwIntroSpecs:    'specifications',
    hwIntroEco:      'ecosystem',
    hwIntroSupport:  'support',
    hwSubSize:       'size',
    hwSubDesktop:    'desktop',
    hwSubDesklegs:   'desklegs',
    hwSecMaterials:  'materials',
    hwSecColor:      'color',
    // The size panel's heads and field label — the design team's own
    // copy (Eric, Aug 28 fourth word, p2 reference).
    hwSecSize:       'options',
    hwSecCustomSize: 'customize',
    hwFldEnterSize:  'enter the size you want:',
    // Material families + finishes — PLACEHOLDER catalog (manifest confirm
    // owed); the finish carries the metal/roughness preset (Eric, Aug 28:
    // metallic and roughness come as presets; structures built now).
    hwMatSteel:      'stainless steel',
    hwMatAluminum:   'aluminum alloy',
    hwMatWalnut:     'walnut wood',
    hwFinBrushed:    'brushed',
    hwFinPVD:        'PVD',
    hwFinPowder:     'powder-coated',
    hwFinNatural:    'natural oiled',
    hwFinLacquer:    'matte lacquer',
    // Color rows — the reference screenshot's own set (Eric, Aug 28, p1).
    hwColSilver:     'metallic silver',
    hwColBW:         'black & white',
    hwColRed:        'red',
    hwColOrange:     'orange',
    hwColYellow:     'yellow',
    hwColGreen:      'green',
    hwSizeCompact:   'compact',
    hwSizeStandard:  'standard',
    hwSizeWide:      'wide',
    hwSizeStudio:    'studio',
    hwFldLength:     'length',
    hwFldWidth:      'width',
    hwUnitCM:        'CM',
    hwUnitIN:        'IN',
    hwInvalidSize:   'Enter both dimensions within range.',
    // THE CART ROW (Eric, Aug 28, second word — supersedes the same-day
    // phase-2 hold for the ROW alone): the tray is phase one; the
    // dedicated FULL CART PAGE stays a coming page (the cart circle and
    // the view-cart/checkout controls deny to marked seams until it and
    // the commerce ruling land). The frames' lowercase "cart" stays on
    // the do-not-port list — the certified casing ships.
    hwAddToCart:     'add to cart',
    hwCart:          'CART',
    hwCartTotal:     'total',
    hwCheckout:      'checkout',
    hwViewCart:      'view cart',
    hwPlateLorem:    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
    // ── /cart (the dedicated cart page — Eric's sixth word, Aug 28).
    // Labels from the B-2 frames (outlined; read from true-aspect
    // renders). Prices, shipping, tax, promo and kickstarter are SEAMS:
    // the static $4141/$2499/$3499 are the on-record do-not-port bugs.
    cartTitle:        'BACKSPACE — Cart',
    cartCrumb:        'CART',
    cartCheckoutCrumb:'CHECKOUT',
    cartOrderSummary: 'ORDER SUMMARY',
    cartItems:        'items',
    cartItemDeskTitle:'The OASIS DESK (Pre-order)',
    cartSpecSize:     'size',
    cartSpecOptions:  'options',
    cartEstimated:    'Estimated Completion:',   // revived Aug 31: the production-date bar's label
    cartKickOrderNo:  'Kickstarter order number',
    cartKickstarter:  'KICKSTARTER',
    cartKickNote:     'Also available on kickstarter',
    cartPromo:        'promo code',
    cartApply:        'apply',
    cartTotal:        'total',
    cartSubtotal:     'subtotal',
    cartShipping:     'shipping',
    cartTax:          'tax',
    cartCheckout:     'checkout',
    // ── the checkout state (Eric's word, Aug 31: the window-expansion
    // mechanism — placements from the checkout frame group, mechanism
    // from the account note group). cartEstimated above is DORMANT: the
    // estimated-completion tab left the page by the same word.
    coShippingHead:  'shipping address',
    coBillingHead:   'billing address',
    coPaymentHead:   'payment',
    coCreditCard:    'credit card',
    coFasterHead:    'Faster Checkout',
    coAddressBook:   'address book',
    coAddNew:        'add new',
    coSave:          'save',
    coDelete:        'delete',
    coFullName:      'full name',
    coPhone:         'phone number',
    coPostal:        'postal code',
    coCountry:       'country / region',
    coCity:          'city',
    coStreet:        'street address',
    coCompanyLine:   'company, apartment, suite, etc. (optional)',
    coUseShipping:   'Use the shipping address as the billing address',
    coCardNumber:    'card number',
    coCardName:      "Cardholder's Name",
    coCardExp:       'Expiration Date (MM / YY)',
    coWalletG:       'G Pay',
    coWalletPaypal:  'PayPal',
    coWalletShop:    'shop',
    coCardMC:        'mastercard',
    coCardAmex:      'amex',
    coCardVisa:      'visa',
    coCardUnion:     'unionpay'
  },
  zh: { /* populated when CN content lands; lookups fall back to en */ },
  ja: {},
  es: {},
  fr: {}   /* French joins the picker (Eric, Sept 3); copy falls back to en until it lands */
};
// ISO 639-1 codes (the mockup's SP corrected to ES per Eric). Offering all
// five in the picker is the ratified design (FR added Sept 3); only EN
// carries content yet.
var LANGS = ['en','zh','ja','es','fr'];
var LANG_ATTR = { en:'en', zh:'zh-CN', ja:'ja', es:'es', fr:'fr' };
var lang = 'en';
function T(key){ return (STR[lang] && STR[lang][key]) || STR.en[key] || key; }
// Every visible string flows from a key — the data-str render pass pages
// run at boot, on locale swaps, and over freshly built DOM (factored from
// /support with the trio, Aug 28).
function renderStrings(root){
  var els = (root || document).querySelectorAll('[data-str]');
  for (var i = 0; i < els.length; i++){
    els[i].textContent = T(els[i].getAttribute('data-str'));
  }
}

var SECTIONS = ['hardware','software','community','support'];

// ── Routes — real pages, real history ─────────────────────────────────────
// Production serves clean paths (/software); the local python server and
// file:// serve sibling .html files. Resolved once at boot.
var HTMLISH = /\.html$/i.test(location.pathname) || location.protocol === 'file:';
// ROUTES.hardware (Eric's product phase, Aug 28): the one-line flip — every
// page's HARDWARE denial becomes a commit, zero page edits (ratified grammar).
// ROUTES.cart (Eric's sixth word, Aug 28): the dedicated cart page —
// a DESTINATION, not a section (the away pill stays four). Its landing
// flips the utility cart circle and /hardware's view-cart seam to
// commits, house-wide, zero page edits.
var ROUTES = HTMLISH
  ? { home: 'home.html', hardware: 'hardware.html', software: 'software.html', community: 'community.html', support: 'support.html', cart: 'cart.html' }
  : { home: '/', hardware: '/hardware', software: '/software', community: '/community', support: '/support', cart: '/cart' };

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
  _rzTimer = setTimeout(function(){ PAGE.onFontsReady(); fitOpenPills(); }, 150);   // re-measure hook (+ the expansion floor)
});

// ── Utility cluster — markup identical to the certified static DOM,
// injected so both pages render byte-identical chrome. ───────────────────
function buildUtilityCluster(){
  var mount = document.getElementById('bs-icons');
  if (!mount) return;
  mount.innerHTML =
    '<div class="bs-hit"><div class="bs-pill bs-pill--text" id="bs-pill-lang">' +
      '<button class="bs-head" id="bs-lang" type="button" aria-label="Language" aria-haspopup="true" aria-expanded="false">EN</button>' +
      '<div class="bs-tray" id="bs-lang-tray"></div>' +
    '</div></div>' +
    '<div class="bs-hit"><div class="bs-pill bs-pill--slider" id="bs-pill-sound">' +
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
    '<div class="bs-hit"><div class="bs-pill bs-pill--glyph" id="bs-pill-account">' +
      '<button class="bs-head" id="bs-account" type="button" aria-label="Account" aria-haspopup="true" aria-expanded="false">' +
        '<img src="assets/ui/icon-figma-person.png" alt="" aria-hidden="true">' +
      '</button>' +
      '<div class="bs-tray">' +
        '<button class="bs-tray-item bs-type-3" id="bs-acct-signin" type="button" aria-label="Sign in">' +
          '<img src="assets/ui/bs_icon_signin.png" alt="" aria-hidden="true">' +
        '</button>' +
        '<button class="bs-tray-item bs-type-3" id="bs-acct-details" type="button" aria-label="Account details">' +
          '<img src="assets/ui/bs_icon_account_details.png" alt="" aria-hidden="true">' +
        '</button>' +
        '<button class="bs-tray-item bs-type-3" id="bs-acct-orders" type="button" aria-label="Order lookup">' +
          '<img src="assets/ui/bs_icon_order_lookup.png" alt="" aria-hidden="true">' +
        '</button>' +
      '</div>' +
    '</div></div>';
}

// ── Pills — hover grows the circle into a capsule; touch taps the head to
// open first; a tap outside closes everything. ───────────────────────────
/* THE EXPANSION FLOOR (Eric, Sept 3): before a pill opens, find the nearest
   visible content below its head inside its own column (text runs, images,
   inputs — never the chrome, never the stage canvas) and cap the open
   height so the pill's bottom edge sits --bs-pill-gap above it. The gap is
   the standard; the height adapts to the page and the window. A capped
   list pill's tray scrolls as it always does — scrollability is the list
   variants' own property (Eric, Sept 3), the cap only shortens the same
   container; the volume track just shortens.
   Below one tray row the cap stops shrinking — a page whose content sits
   that high must move it. Re-fitted on resize while open. */
function pillFloor(pill){
  var pr = pill.getBoundingClientRect(), head = pill.querySelector('.bs-head');
  var yTop = (head ? head.getBoundingClientRect().bottom : pr.top);
  var x0 = pr.left, x1 = pr.right, floor = window.innerHeight;
  function consider(r){ if (r.width <= 0 || r.height <= 0) return; if (r.right <= x0 || r.left >= x1 || r.top < yTop) return; if (r.top < floor) floor = r.top; }
  function chrome(el){ return !!el.closest('#bs-icons, #bs-corner, #bs-cursor, #bs-haptic, #bs-wordmark'); }
  function visible(el){ return el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true; }
  var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
  while ((n = tw.nextNode())) {
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    var el = n.parentElement; if (!el || chrome(el) || !visible(el)) continue;
    var rg = document.createRange(); rg.selectNodeContents(n);
    var rects = rg.getClientRects(); for (var i = 0; i < rects.length; i++) consider(rects[i]);
  }
  var boxes = document.querySelectorAll('img, svg, input, textarea, select, video');
  for (var j = 0; j < boxes.length; j++) { if (chrome(boxes[j]) || !visible(boxes[j])) continue; consider(boxes[j].getBoundingClientRect()); }
  // DRAWN BOXES ARE CONTENT TOO (Eric, Sept 3: "divider lines are still
  // contents") — any element that paints a background, a border, a shadow
  // or an image (the cart's 0.5px rule and rail, plates, windows). The page
  // grounds (boxes covering most of the viewport) and the stage canvas are
  // not content.
  var all = document.body.getElementsByTagName('*'), area = window.innerWidth * window.innerHeight;
  for (var k = 0; k < all.length; k++) {
    var b = all[k]; if (b.tagName === 'CANVAS' || b.tagName === 'SCRIPT' || b.tagName === 'STYLE' || chrome(b)) continue;
    var br = b.getBoundingClientRect(); if (br.width <= 0 || br.height <= 0 || br.width * br.height > area * 0.6) continue;
    if (br.right <= x0 || br.left >= x1 || br.top < yTop || br.top >= floor) continue;   // cheap rejects before the style read
    if (!visible(b)) continue;
    var cs = getComputedStyle(b);
    var painted = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
      ((parseFloat(cs.borderTopWidth) || parseFloat(cs.borderBottomWidth) || parseFloat(cs.borderLeftWidth) || parseFloat(cs.borderRightWidth)) && cs.borderTopColor !== 'rgba(0, 0, 0, 0)');
    if (painted) consider(br);
  }
  return floor;
}
/* A length token resolved to px by the engine itself (the tokens nest calc()
   — --icons-scale is calc(var(--ui-scale) * 1.25) — so a regex cannot read
   them): a hidden ruler inside the pill takes the token as its height and
   reports the used value. */
var _ruler = null;
function tokenPx(el, name, wrap){
  if (!_ruler) { _ruler = document.createElement('div'); _ruler.setAttribute('aria-hidden', 'true'); _ruler.style.cssText = 'position:absolute;left:0;top:0;width:0;visibility:hidden;pointer-events:none;'; }
  if (_ruler.parentNode !== el) el.appendChild(_ruler);
  _ruler.style.height = wrap ? wrap.replace('$', 'var(' + name + ')') : 'var(' + name + ')';
  return parseFloat(getComputedStyle(_ruler).height) || 0;
}
function fitPill(pill){
  var want = tokenPx(pill, '--bs-pill-h'); if (!want) return;                       // the standard open height
  var gap = tokenPx(pill, '--bs-pill-gap'), headH = tokenPx(pill, '--icons-scale', 'calc(35px * $)');
  var rowH = tokenPx(pill, pill.classList.contains('bs-pill--glyph') ? '--bs-pill-row-glyph' : '--bs-pill-row-text');   // the cap's floor: the head + one row
  var top = pill.getBoundingClientRect().top;
  var avail = pillFloor(pill) - gap - top;
  var cap = Math.min(want, Math.max(headH + rowH, avail));
  if (cap < want - 0.5) { pill.style.setProperty('--open-h-cap', cap.toFixed(2) + 'px'); pill.classList.add('is-capped'); }
  else { pill.style.removeProperty('--open-h-cap'); pill.classList.remove('is-capped'); }
}
function fitOpenPills(){ var open = document.querySelectorAll('.bs-pill.is-open'); for (var i = 0; i < open.length; i++) fitPill(open[i]); }
function bindPill(pillEl, headEl){
  var pill = pillEl, head = headEl;
  function open(){
    if (!pill.classList.contains('is-open')){
      fitPill(pill);                                            // the expansion floor, before the height transition starts
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
  trayItems(iconLock).forEach(function(b, i){ b.classList.toggle('kb-hover', i === trayIdx); if (i === trayIdx && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); });
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
    // A FOCUSED FIELD OWNS ITS KEYS (Aug 31, found by the checkout
    // forms): with the caret in an input/textarea, every key but
    // Escape belongs to typing — W/S/A/D and the arrows must never be
    // eaten by the machine mid-word. Escape stays above: the ladder's
    // field rung is the blur.
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
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
    // A scrollable pill tray under the pointer scrolls natively (the pill component / the expansion floor).
    var tray = e.target && e.target.closest && e.target.closest('.bs-tray'); if (tray && tray.scrollHeight > tray.clientHeight + 1) return;
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
/* THE HOTNESS LAW (Eric, Sept 2-3, 2026 — supersedes rule 6's whole-word
   equation and its fitted curves). Every bloom item glows at the hotness
   of the hardware class-menu item `desk` (near-halo 50.6 lit at its 12 rung, re-solved Sept 3). The pair's
   CSS declares one ring set; each element gets ONE number, --bloom-g
   (intensity, in copies of the tight rings; see the css law block §6).
   The values below were SOLVED BY MEASUREMENT on the real pages by the
   harness (reports/tools/resolve_all.js): the root of hotness(g) = 50.6
   per string. Per-surface defaults live in the CSS; this table refines
   them per string. Strings not in the table keep the surface default
   (a locale swap re-runs the harness; the runtime canvas solver is the
   next step once calibrated). Re-runs at every STR render. */
var BLOOM = {   // every value re-solved LIVE under THE GLOW IS D (Eric, Sept 7): the 0-3px band = the house 50.56 at the frame, dpr 2; 300 = the hover column, 600 = the selected standing glow
  menu:      { 300: { module: 1.7, keyboard: 1.55, mouse: 1.7, light: 1.7, powerbank: 1.521, watercup: 1.554, headset: 1.506, speakers: 1.498, desk: 1.633, FAQ: 1.552, WARRANTY: 1.36, 'RETURN & REFUND POLICY': 1.5, 'PRODUCT GUIDES': 1.5, 'BUSINESS REQUEST': 1.386, 'CONTACT US': 1.605 },
          600: { desk: 0.874, module: 0.846, keyboard: 0.82, mouse: 0.867, light: 0.866, powerbank: 0.819, watercup: 0.827, headset: 0.824, speakers: 0.819, 'CONTACT US': 0.77, FAQ: 0.769, WARRANTY: 0.722, 'RETURN & REFUND POLICY': 0.738, 'PRODUCT GUIDES': 0.728, 'BUSINESS REQUEST': 0.7 } },
  menuHome:  { HARDWARE: 0.7, SOFTWARE: 0.714, COMMUNITY: 0.73, SUPPORT: 0.734 },   // /home's special menu, 600 at rest
  capsule:   { 300: { SOFTWARE: 1.4, COMMUNITY: 1.437, SUPPORT: 1.451, HARDWARE: 1.305 },
             600: { HARDWARE: 0.689, SUPPORT: 0.735, SOFTWARE: 0.711, COMMUNITY: 0.725 } },
  social:    { Instagram: 1.369, YouTube: 1.565, TikTok: 1.697, X: 2.457, Discord: 1.5, Facebook: 1.44 },   // /community, Light
  lang:      { EN: 2.22, ZH: 2.506, JA: 2.7, ES: 2.381, FR: 2.411 },   // the language head + rows, 8×icons WideLight
  sub:       { 300: { overview: 1.653, 'industrial design': 1.631, specifications: 1.61, ecosystem: 1.542, support: 1.7, size: 1.757, desktop: 1.497, desklegs: 1.449 },
         600: { overview: 0.85, 'industrial design': 0.836, specifications: 0.806, ecosystem: 0.813, support: 0.85, size: 0.918, desktop: 0.825, desklegs: 0.799 } },   // /hardware's product children; /support's lorem children carry the CSS defaults
  head:      { INTRODUCTION: 0.779, CUSTOM: 0.784 },   // INTRODUCTION / CUSTOM at 14, 600
  traylabel: { 300: { CART: 2.211 },
               600: { CART: 0.917 } },   // CART: collapsed Light / expanded SemiBold
  option:    { 'product consulting': 0.869, 'order & delivery': 0.9, 'warranty & repair': 0.9, 'returns & refunds': 0.9, 'business & wholesale': 0.865 },   // /support's window options
  door:      { 'fill out form': 2.354 },   // the form door's label
  plate:     { 'support@pressbackspace.com': 1.925 },   // the support address plate
  crumb:     { CHECKOUT: 1.8 },   // /cart's away crumb
  glyph:     { 'corner-back': 0.951, 'corner-fwd-closed': 1.045, 'bs-sound': 1.207, 'bs-cart': 0.762, 'bs-account': 0.869, 'Sign in': 0.755, 'Account details': 0.705, 'Order lookup': 0.712 },   // the glyphs' filter chain — the BAKE's source (tools/glyph-bake → assets/ui/glyph-lit; each g solved so the HALO under the lifted glyph reads the house number in the page — re-solved Sept 7 on the halo-only bitmaps); not applied at runtime
  hwopt:     { 300: { compact: 1.878, wide: 1.909, studio: 1.903, 'aluminum alloy': 1.969, 'walnut wood': 1.854, PVD: 2.049, 'powder-coated': 1.754, 'metallic silver': 1.893, red: 2.048, orange: 1.739, yellow: 1.875, green: 1.739, standard: 1.802, 'stainless steel': 1.795, brushed: 1.9, 'black & white': 1.9 },
           600: { compact: 0.95, standard: 0.916, wide: 0.985, studio: 0.95, 'stainless steel': 0.917, 'aluminum alloy': 0.95, 'walnut wood': 0.931, brushed: 0.926, PVD: 0.974, 'powder-coated': 0.9, 'metallic silver': 0.95, 'black & white': 0.933, red: 1.068, orange: 0.915, yellow: 0.95, green: 0.936 } },   // the customization options, per string
  platetitle: { 300: {}, 600: {} },   // lorem placeholders — the CSS defaults stand
  unit:      { 300: { IN: 3.162, CM: 2.579 },
          600: { CM: 1.281, IN: 1.515 } }   // the unit toggle
};
var BLOOM_SCOPE = [
  ['.bs-item', function(el){ return document.body.getAttribute('data-bs-page') === 'home' ? 'menuHome' : 'menu'; }],
  ['.site-primary-nav__link', 'capsule'], ['.bs-social-link', 'social'], ['.bs-tray-item, #bs-lang', 'lang'],
  ['.bs-subitem', 'sub'], ['.hw-head', 'head'], ['.hw-tray-label', 'traylabel'],
  ['.bs-option', 'option'], ['.sup-door-label', 'door'], ['.ct-crumb-btn', 'crumb'], ['.hw-opt', 'hwopt'], ['.bs-plate-title', 'platetitle'], ['.hw-unit button', 'unit'], ['.sup-plate', 'plate']
];
function bloomOne(el, surface){
  if (el.querySelector('img')) return;                            // glyph heads are handled by id below
  var table = BLOOM[typeof surface === 'function' ? surface(el) : surface] || {};
  if (table[300] || table[600]) table = table[getComputedStyle(el).fontWeight === '600' ? 600 : 300] || {};   // weight-keyed surfaces
  var key = (el.textContent || '').trim();
  if (Object.prototype.hasOwnProperty.call(table, key)) el.style.setProperty('--bloom-g', String(table[key]));
  else el.style.removeProperty('--bloom-g');                       // the surface (or state) default in the CSS stands
}
function normalizeBloom(){
  BLOOM_SCOPE.forEach(function(pair){
    var els = document.querySelectorAll(pair[0]);
    for (var i = 0; i < els.length; i++) bloomOne(els[i], pair[1]);
  });
  var glyphs = [['#bs-sound img', 'bs-sound'], ['#bs-cart img', 'bs-cart'], ['#bs-account img', 'bs-account'],
                ['.site-round-button svg', 'corner-back']];
  glyphs.forEach(function(g){ var el = document.querySelector(g[0]); if (el && BLOOM.glyph[g[1]]) el.style.setProperty('--bloom-g', String(BLOOM.glyph[g[1]])); });
  var trayImgs = document.querySelectorAll('.bs-tray-item img');
  for (var j = 0; j < trayImgs.length; j++) { var key = trayImgs[j].parentElement.getAttribute('aria-label') || ''; if (BLOOM.glyph[key]) trayImgs[j].style.setProperty('--bloom-g', String(BLOOM.glyph[key])); }
}
/* The old name stays as an alias: /hardware, /support and /cart call it
   after building their lists. Lists built later (panels, trays, sub-lists
   on demand) are covered by the observer: any childList mutation
   re-runs the pass, debounced. Writing --bloom-g is an attribute
   mutation, not childList, so the observer cannot feed itself. */

/* THE HALO IS A SPRITE (Eric, Sept 7) — see the css banner. The
   manifest is the bake's (tools/glyph-bake/bake_glyphs.js): per glyph its
   selector, css box and halo margin; the sprite is (box + 2·margin) wide
   is the HALO ONLY, sized from the bake's integer clip and placed from the glyph's recorded offset in it, under the glyph (z -1), from the rects (an svg has no
   offsetWidth), sub-pixel. Re-bake whenever a glyph's --bloom-g or the
   filter chain changes. */
var GLYPH_SPRITES = {"corner-back": {"sel": ".site-round-button svg", "w": 25.88, "h": 25.88, "margin": 22, "ox": 22.234, "oy": 22.641, "cw": 71, "ch": 71, "file": "assets/ui/glyph-lit/corner-back-lit.png"}, "corner-fwd": {"sel": ".site-primary-nav__forward-button svg", "w": 25.88, "h": 25.88, "margin": 22, "ox": 22.578, "oy": 22.641, "cw": 71, "ch": 71, "file": "assets/ui/glyph-lit/corner-fwd-lit.png"}, "bs-sound": {"sel": "#bs-sound img", "w": 25.88, "h": 25.88, "margin": 22, "ox": 22.5, "oy": 22.641, "cw": 71, "ch": 71, "file": "assets/ui/glyph-lit/bs-sound-lit.png"}, "bs-cart": {"sel": "#bs-cart img", "w": 22.5, "h": 22.5, "margin": 22, "ox": 22.531, "oy": 22.328, "cw": 68, "ch": 67, "file": "assets/ui/glyph-lit/bs-cart-lit.png"}, "bs-account": {"sel": "#bs-account img", "w": 25.88, "h": 25.88, "margin": 22, "ox": 22.188, "oy": 22.641, "cw": 71, "ch": 71, "file": "assets/ui/glyph-lit/bs-account-lit.png"}, "acct-signin": {"sel": "#bs-acct-signin img", "w": 25.88, "h": 25.88, "margin": 22, "ox": 22.188, "oy": 22.641, "cw": 71, "ch": 71, "file": "assets/ui/glyph-lit/acct-signin-lit.png"}, "acct-details": {"sel": "#bs-acct-details img", "w": 25.88, "h": 25.88, "margin": 22, "ox": 22.188, "oy": 22.266, "cw": 71, "ch": 71, "file": "assets/ui/glyph-lit/acct-details-lit.png"}, "acct-orders": {"sel": "#bs-acct-orders img", "w": 25.88, "h": 25.88, "margin": 22, "ox": 22.188, "oy": 22.891, "cw": 71, "ch": 71, "file": "assets/ui/glyph-lit/acct-orders-lit.png"}};
function mountGlyphSprites(){
  Object.keys(GLYPH_SPRITES).forEach(function(id){
    var m = GLYPH_SPRITES[id]; var el = document.querySelector(m.sel); if (!el || el.parentElement.querySelector('img.bs-lit')) return;
    var host = el.parentElement; var img = document.createElement('img');
    img.className = 'bs-lit'; img.src = m.file; img.alt = ''; img.setAttribute('aria-hidden', 'true');
    function place(){
      var gr = el.getBoundingClientRect(), hr = host.getBoundingClientRect(); var w = gr.width || m.w, h = gr.height || m.h, s = w / m.w;
      // PIXEL-TRUE (Eric, Sept 7 — "it seems to grow"): the bake's clip is integer CSS px and the glyph sits at (ox, oy) inside it;
      // sized from the clip and placed from the offset, the bitmap lands 1:1 on device pixels at the frame viewport — sizing it
      // from the glyph box stretched it 1.0128× and shifted it .7px. (The bitmap is the halo only now; the glyph itself never moves.)
      var ox = m.ox != null ? m.ox : m.margin, oy = m.oy != null ? m.oy : m.margin, cw = m.cw || (m.w + 2 * m.margin), ch = m.ch || (m.h + 2 * m.margin);
      var hc = getComputedStyle(host), bl = parseFloat(hc.borderLeftWidth) || 0, bt = parseFloat(hc.borderTopWidth) || 0;   // the padding box by the border's computed width (clientLeft rounds a .3px border to 1 at dpr 2 — half a px off)
      img.style.width = (cw * s) + 'px'; img.style.height = (ch * s) + 'px';
      img.style.left = (gr.left - hr.left - bl - ox * s) + 'px'; img.style.top = (gr.top - hr.top - bt - oy * s) + 'px'; }
    host.appendChild(img); place(); window.addEventListener('resize', place);
  });
}
function normalizeWordGlow(){ normalizeBloom(); }
var _bloomT = null;
function watchBloom(){
  if (!window.MutationObserver) return;
  new MutationObserver(function(records){
    var structural = false;
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === 'attributes') {                               // a class change: re-solve THAT element (its weight may have changed: selected = 600)
        var el = r.target; if (el.nodeType !== 1) continue;
        for (var k = 0; k < BLOOM_SCOPE.length; k++) if (el.matches && el.matches(BLOOM_SCOPE[k][0])) { bloomOne(el, BLOOM_SCOPE[k][1]); break; }
      } else structural = true;
    }
    if (structural && !_bloomT) _bloomT = setTimeout(function(){ _bloomT = null; normalizeBloom(); }, 40);
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
}
/* THE EMISSION AREA (Eric, Sept 3): the accordion's inner clip exists for
   the travel only. When a sub-list's open transition ends the wrap takes
   .is-settled (the css releases the clip so the glow is not cut); the
   moment .is-on leaves, .is-settled leaves with it — before the collapse
   paints — so the travel is clipped again. */
function bindSublistClip(){
  document.addEventListener('transitionend', function(e){
    var w = e.target; if (!w.classList || !w.classList.contains('bs-sublist-wrap') || e.propertyName !== 'grid-template-rows') return;
    if (w.classList.contains('is-on')) w.classList.add('is-settled');
  });
  if (!window.MutationObserver) return;
  new MutationObserver(function(records){
    for (var i = 0; i < records.length; i++) { var w = records[i].target; if (w.classList && w.classList.contains('bs-sublist-wrap') && !w.classList.contains('is-on') && w.classList.contains('is-settled')) w.classList.remove('is-settled'); }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
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
    if (e.pointerType && e.pointerType !== 'mouse') { if (el.classList.contains('is-on')) el.classList.remove('is-on'); return; }
    el.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    if (!el.classList.contains('is-on')) el.classList.add('is-on');   // an unchanged class re-set still queues a mutation record — both observers were firing on every pointer move (Sept 5)
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
    b.className = 'bs-tray-item bs-type-3';   // THE STATE TYPES: a language row is TYPE 3
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

  // Cart — COMMITS to the cart page (Eric's sixth word landed it);
  // on the cart page itself it is the current destination and denies
  // (the away-nav current-section grammar). Bound on the hit pad so
  // clicks in the vicinity count; the shake lands on the button.
  (function(){
    var cart = document.getElementById('bs-cart');
    (cart.closest('.bs-hit') || cart).addEventListener('click', function(){
      wake();
      if (PAGE_ID === 'cart' || !ROUTES.cart){ denyOn(cart); return; }
      if (clickOk()) commitNavigate('cart');
    });
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
  normalizeBloom();      // THE HOTNESS LAW — boot pass (page markup is live by now)
  mountGlyphSprites();   // THE HALO IS A SPRITE (Sept 7) — after the cluster and the corner exist
  watchBloom();          // …and every later render (panels, trays, sub-lists); class changes re-solve the element (selected = 600)
  bindSublistClip();     // the accordion clip is for the travel only (the emission area, Sept 3)
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

/* ══════════════════════════════════════════════════════════════════════════
   THE THREE FACTORINGS (product phase, Aug 28 2026) — the ratified
   second-consumer trigger fired: /hardware consumes what /support built
   page-side. Factored in the handoff's order (1. plate stack + sub-list
   accordion · 2. click-to-open ladder · 3. form subsystem), DEFAULT-
   RATIFIED AND LABELED: Eric's initiation reply answered every queue item
   except this one; the stated default (ratify all three) executes per the
   collection contract, and one word strikes any of them back out.
   The code is /support's own, moved verbatim where it was already
   house-generic and parameterized only where the page owned a choice.
   CSS halves live in bs-chrome.css under the same banner.
   ══════════════════════════════════════════════════════════════════════════ */

// ── 1a. The sub-list accordion — each menu item owns a SLOT; its sub-list
// lives inside that slot (a collapsed sibling would still collect the
// menu grid's gap). Structure is data: items = [{ key, subs?: [{key}] }];
// every string renders through data-str. Callbacks own page state; the
// builder owns only wiring (touch-guarded hover, wake, stopPropagation on
// sub clicks — /support's certified event order, moved verbatim).
function buildSlots(menuEl, items, cb){
  var menuItems = [], subWraps = [], subEls = [];
  items.forEach(function(it, idx){
    var slot = document.createElement('div');
    slot.className = 'bs-menu-slot';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bs-item' + (cb.itemType === null ? '' : ' ' + (cb.itemType || 'bs-type-1'));   // THE STATE TYPES: a section menu item is TYPE 1 unless the page says otherwise (null = untyped)
    if (cb.itemId) b.id = cb.itemId(idx);
    var span = document.createElement('span');
    span.className = 'bs-nav-label';
    span.setAttribute('data-str', it.key);
    b.appendChild(span);
    b.addEventListener('mouseenter', function(){
      if (_touchInput) return;
      wake();
      cb.onFocus(idx);
    });
    b.addEventListener('mouseleave', function(){
      if (_touchInput) return;
      cb.onBlur(idx);
    });
    b.addEventListener('click', function(){ wake(); cb.onClick(idx); });
    slot.appendChild(b);
    var ss = it.subs || null;
    if (ss){
      var wrap = document.createElement('div');
      wrap.className = 'bs-sublist-wrap';
      var list = document.createElement('div');
      list.className = 'bs-sublist';
      var mine = [];
      ss.forEach(function(sub, sIdx){
        var sb = document.createElement('button');
        sb.type = 'button';
        sb.className = 'bs-subitem ' + (cb.subType || 'bs-type-2');   // THE STATE TYPES: a child built here is TYPE 2 (/support's children)
        sb.setAttribute('data-str', sub.key);
        sb.tabIndex = -1;
        sb.addEventListener('mouseenter', function(){
          if (!_touchInput) sb.classList.add('kb-hover');
        });
        sb.addEventListener('mouseleave', function(){ sb.classList.remove('kb-hover'); });
        sb.addEventListener('click', function(e){
          e.stopPropagation();
          wake();
          cb.onSub(idx, sIdx);
        });
        list.appendChild(sb);
        mine.push(sb);
      });
      wrap.appendChild(list);
      slot.appendChild(wrap);
      subWraps.push(wrap);
      subEls.push(mine);
    } else {
      subWraps.push(null);
      subEls.push(null);
    }
    menuEl.appendChild(slot);
    menuItems.push(b);
  });
  return { items: menuItems, subWraps: subWraps, subEls: subEls };
}

// ── 1b. The plate stack — the right-hand detail column whose rows expand
// DOWNWARD in place (0fr→1fr on --pop-motion). rows = [{ key, body }].
// Phrasing content only: the plate is a <button>, so spans throughout and
// the CSS gives them their boxes (/support's own note, moved with it).
function buildPlates(stackEl, rows, cb){
  stackEl.innerHTML = '';
  var rowEls = [];
  if (!rows) return rowEls;
  rows.forEach(function(r, i){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bs-plate bs-type-2';   // THE STATE TYPES: an entry plate is TYPE 2 (its title follows through the plate rules)
    btn.setAttribute('aria-expanded', 'false');
    var title = document.createElement('span');
    title.className = 'bs-plate-title';
    title.setAttribute('data-str', r.key);
    var body = document.createElement('span');
    body.className = 'bs-plate-body';
    var clip = document.createElement('span');       // the overflow clip
    var copy = document.createElement('span');
    copy.className = 'bs-plate-copy';
    copy.setAttribute('data-str', r.body);
    clip.appendChild(copy);
    body.appendChild(clip);
    btn.appendChild(title);
    btn.appendChild(body);
    btn.addEventListener('mouseenter', function(){
      if (!_touchInput) btn.classList.add('kb-hover');
    });
    btn.addEventListener('mouseleave', function(){ btn.classList.remove('kb-hover'); });
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      wake();
      cb.onToggle(i);
    });
    stackEl.appendChild(btn);
    rowEls.push(btn);
  });
  return rowEls;
}

// ── 2. The click-to-open ladder's walker — ONE instrumented function,
// one honest level per press (house law). rungs = [{ name, when(), step() }]
// in descent order; the first live rung steps. Esc, the level-aware corner
// ‹ and door #1 all walk THIS, so they can never disagree. The page reads
// .last() for its devState.
function makeLadder(rungs){
  var last = null;
  return {
    back: function(){
      for (var i = 0; i < rungs.length; i++){
        if (rungs[i].when()){
          last = rungs[i].name;
          rungs[i].step();
          return true;
        }
      }
      return false;
    },
    last: function(){ return last; }
  };
}

// ── 3. The form subsystem's checks — the house validation grammar
// (/support's submit loop, factored): first offending control back, or
// null. Denial is the caller's job (denyOn + focus — nothing fails
// silently). The email test is the one /support certified.
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateFields(els){
  for (var i = 0; i < els.length; i++){
    var f = els[i];
    var v = (f.value || '').trim();
    var okEmail = (f.type !== 'email') || EMAIL_RE.test(v);
    if (!v || !okEmail) return f;
  }
  return null;
}

// ── THE CART STORE — one truth for the row and the page (Eric's sixth
// word; factored at its second consumer). localStorage-backed, LABELED
// DEFAULT pending a persistence ruling: carts conventionally survive
// visits; the versioned schema keeps stale shapes harmless, and every
// touch is try/catch — storage may be denied. Item shape:
// { id, classKey, css, sel, qty, checked } — checked items are the
// ones that check out (the triangle grammar).
var CART_STORE_KEY = 'bs-cart-v1';
var cartStore = {
  load: function(){
    try {
      var d = JSON.parse(localStorage.getItem(CART_STORE_KEY));
      if (d && d.v === 1 && Array.isArray(d.items)) return d.items;
    } catch (e) {}
    return [];
  },
  save: function(items){
    try { localStorage.setItem(CART_STORE_KEY, JSON.stringify({ v: 1, items: items })); } catch (e) {}
  },
  key: CART_STORE_KEY   // pages follow the one truth on restore + cross-tab
};

// ── Shared measurement primitives (the measured-never-hardcoded law) ─────
// Cap-midpoint solve: a marker dot aligns to the TEXT's cap midpoint, from
// real font metrics — never to the line box (leading + divider padding
// both move it, measured on /support). Returns null on engines without
// the metrics so the CSS fallback stays in charge.
var _mctx = null;
function capMid(el){
  if (!_mctx) _mctx = document.createElement('canvas').getContext('2d');
  var cs = getComputedStyle(el);
  _mctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  var cap = _mctx.measureText('H');
  var lh = parseFloat(cs.lineHeight);
  var fa = cap.fontBoundingBoxAscent, fd = cap.fontBoundingBoxDescent;
  var ca = cap.actualBoundingBoxAscent;
  if (!isFinite(lh) || !isFinite(fa) || !isFinite(fd) || !isFinite(ca)) return null;
  return (lh - (fa + fd)) / 2 + fa - ca / 2;     // line-box top -> cap midpoint
}
// List pitch, measured from the first two live rows (item top -> next
// item top) so wheel triggers follow any spacing tune.
function measureListPitch(els, fallback){
  if (els.length > 1){
    var a = els[0].getBoundingClientRect(), b = els[1].getBoundingClientRect();
    var p = b.top - a.top;
    if (p > 0) return p;
  }
  return fallback;
}

// ── Export ────────────────────────────────────────────────────────────────
window.BSChrome = {
  init: init,
  T: T, STR: STR, SECTIONS: SECTIONS, ROUTES: ROUTES,
  SoundBus: SoundBus,
  wake: wake, hapticTick: hapticTick,
  shakeEl: shakeEl, denyOn: denyOn, clickOk: clickOk,
  // Pages that BUILD rule-6 scope elements and fill them after init
  // (support's sub-lists render their STR labels at boot, after the
  // init-time pass saw them empty) re-solve here. setLang already
  // re-runs it for locale swaps.
  normalizeWordGlow: normalizeWordGlow,   // alias (rule 6's name)
  normalizeBloom: normalizeBloom,
  fitPills: fitOpenPills,                  // the expansion floor: re-fit open pills after a page relayout
  bindPill: bindPill,
  renderStrings: renderStrings,
  // The factored trio (Aug 28) + the measurement primitives they lean on.
  buildSlots: buildSlots,
  buildPlates: buildPlates,
  makeLadder: makeLadder,
  validateFields: validateFields,
  capMid: capMid,
  measureListPitch: measureListPitch,
  cartStore: cartStore,
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
