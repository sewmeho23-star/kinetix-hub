// @ts-nocheck
/**
 * ============================================================================
 * KINETIX HUB — VANILLA ES6+ APPLICATION ENGINE

/**
 * ============================================================================
 * KINETIX HUB — VANILLA ES6+ APPLICATION ENGINE
 * Architecture: Pure HTML5 + Tailwind CSS (CDN) + Vanilla JS (ES6+)
 * Backend: Supabase JS SDK v2 (CDN) with RLS & Storage
 * PDF Engine: Mozilla PDF.js (CDN) strictly on <canvas>
 * Monetization: Android WebView AdMob Bridge + Web Ad Network Hooks
 * ============================================================================
 */

/* --------------------------------------------------------------------------
 * 1. SUPABASE CONFIGURATION PLACEHOLDERS
 * Replace these two constants with your Supabase Project URL and Anon Key
 * from: Supabase Dashboard -> Project Settings -> API
 * -------------------------------------------------------------------------- */
const SUPABASE_URL = 'https://cvgfddawxfjuvhvxzrsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Z2ZkZGF3eGZqdXZodnh6cnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MTY2NjMsImV4cCI6MjExMDA5MjY2M30.3t0ujWplfb1sBJCncA2niO60EpG_hYNH0rq5GG35qrw';

const IS_SUPABASE_CONFIGURED =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_URL.includes('YOUR_SUPABASE_URL') &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

const supabaseClient =
  IS_SUPABASE_CONFIGURED && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/* --------------------------------------------------------------------------
 * 2. PDF.JS WORKER INITIALIZATION
 * -------------------------------------------------------------------------- */
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* --------------------------------------------------------------------------
 * 3. APPLICATION STATE & DEMO FALLBACK CATALOG
 * Used automatically when Supabase placeholders are unconfigured so the
 * preview remains 100% functional out of the box.
 * -------------------------------------------------------------------------- */
const DEMO_SEED = {
  apps: [
    {
      id: 'demo-app-1',
      title: 'Vault File Guard',
      version: '2.4.1',
      size: '18.4 MB',
      description:
        'Hardware-backed encrypted file locker and APK integrity verifier built for Android 10+ devices.',
      icon_url: '/images/app-vault.jpg',
      apk_url: '#demo-apk-vault-2.4.1.apk',
      downloads_count: 1420,
    },
    {
      id: 'demo-app-2',
      title: 'Kinetix Reader Companion',
      version: '1.9.0',
      size: '11.2 MB',
      description:
        'Lightweight offline document cache and WebView bridge utility with zero background telemetry.',
      icon_url: '',
      apk_url: '#demo-apk-companion-1.9.0.apk',
      downloads_count: 864,
    },
    {
      id: 'demo-app-3',
      title: 'NetPulse Inspector',
      version: '3.1.0',
      size: '14.8 MB',
      description:
        'Local-first DNS, TLS certificate, and bandwidth latency diagnostic suite for mobile engineers.',
      icon_url: '',
      apk_url: '#demo-apk-netpulse-3.1.0.apk',
      downloads_count: 615,
    },
  ],
  books: [
    {
      id: 'demo-book-1',
      title: 'Mobile Systems Architecture',
      author: 'Elena Vance',
      description:
        'Patterns for offline-first PWAs, WebView bridges, and deterministic state management on constrained hardware.',
      page_count: 3,
      cover_url: '/images/book-architecture.jpg',
      pdf_url: 'demo://architecture',
      reads_count: 932,
    },
    {
      id: 'demo-book-2',
      title: 'Applied Client Security & RLS',
      author: 'Marcus Sterling',
      description:
        'Practical handbook on PostgreSQL Row Level Security, canvas-only document protection, and token hygiene.',
      page_count: 3,
      cover_url: '/images/book-security.jpg',
      pdf_url: 'demo://security',
      reads_count: 1184,
    },
  ],
  media: [
    {
      id: 'demo-media-1',
      type: 'photo',
      title: 'Architectural Hardware Bench',
      caption:
        'Anodized mobile test devices calibrated against printed floorplan schematics in natural daylight.',
      media_url: '/images/media-studio.jpg',
      thumbnail_url: '/images/media-studio.jpg',
      duration: '4K Photo',
      views_count: 540,
    },
    {
      id: 'demo-media-2',
      type: 'video',
      title: 'Studio Build Walkthrough',
      caption:
        'Protected HTML5 video stream demonstrating Android WebView responsive breakpoints and canvas rendering.',
      media_url: '/media/studio-walkthrough.mp4',
      thumbnail_url: '/images/media-studio.jpg',
      duration: '00:05',
      views_count: 790,
    },
  ],
};

const state = {
  activeTab: 'apps', // 'apps' | 'books' | 'media'
  mediaFilter: 'all', // 'all' | 'photo' | 'video'
  searchQuery: '',
  apps: [],
  books: [],
  media: [],
  analyticsCount: 0,
  adminSession: null, // Supabase Auth session or { sandbox: true }
  isAdminAuthorized: false,
  deferredInstallPrompt: null,
  pdf: {
    doc: null,
    pageNum: 1,
    pageCount: 1,
    scale: 1.25,
    renderTask: null,
    isOpen: false,
  },
  ads: {
    lastInterstitialAt: 0,
    cooldownMs: 30000, // 30s policy-safe cooldown between interstitials
    pendingCallback: null,
  },
};

/* --------------------------------------------------------------------------
 * 4. AD MONETIZATION BRIDGE (ADMOB ANDROID WEBVIEW + WEB AD NETWORKS)
 * -------------------------------------------------------------------------- */
/**
 * Triggers an interstitial ad before executing the user's gated action
 * (opening a PDF book or starting an APK download).
 *
 * Android WebView Integration (Kotlin/Java):
 *   webView.addJavascriptInterface(AdMobBridge(this), "AndroidBridge")
 *   // Inside AdMobBridge.showInterstitialAd():
 *   // Show AdMob InterstitialAd, then on AdClosed call:
 *   // webView.evaluateJavascript("window.onNativeAdClosed && window.onNativeAdClosed()", null)
 *
 * @param {Function} onComplete - Action executed once ad closes or cooldown applies
 * @param {string} context - Descriptive event tag ('pdf_open' | 'apk_download')
 */
window.triggerInterstitialAd = function triggerInterstitialAd(
  onComplete,
  context = 'action'
) {
  const safeExecute = () => {
    if (typeof onComplete === 'function') {
      onComplete();
    }
  };

  const now = Date.now();
  const withinCooldown =
    now - state.ads.lastInterstitialAt < state.ads.cooldownMs;

  if (withinCooldown) {
    safeExecute();
    return;
  }

  state.ads.lastInterstitialAt = now;
  trackAnalyticsEvent('ad_impression', 'ad', context);

  // 1. Native Android WebView AdMob Bridge
  if (
    window.AndroidBridge &&
    typeof window.AndroidBridge.showInterstitialAd === 'function'
  ) {
    state.ads.pendingCallback = safeExecute;
    try {
      window.AndroidBridge.showInterstitialAd(context);
      // Safety timeout fallback in case native wrapper fails to notify JS
      setTimeout(() => {
        if (state.ads.pendingCallback) {
          const cb = state.ads.pendingCallback;
          state.ads.pendingCallback = null;
          cb();
        }
      }, 6000);
      return;
    } catch {
      state.ads.pendingCallback = null;
    }
  }

  // 2. Alternative Android Interface Name
  if (
    window.AdMobInterface &&
    typeof window.AdMobInterface.showInterstitial === 'function'
  ) {
    state.ads.pendingCallback = safeExecute;
    try {
      window.AdMobInterface.showInterstitial(context);
      return;
    } catch {
      state.ads.pendingCallback = null;
    }
  }

  // 3. Web Ad Network Hook (Adsterra / Monetag Vignette / Popunder)
  if (typeof window.webAdNetworkShowInterstitial === 'function') {
    try {
      window.webAdNetworkShowInterstitial(context);
    } catch {
      // Ignore third-party ad blocker errors cleanly
    }
  }

  // Proceed immediately on standard web/PWA browsers
  safeExecute();
};

/**
 * Invoked by Android WebView native code when an AdMob Interstitial or
 * App-Open ad is dismissed by the user.
 */
window.onNativeAdClosed = function onNativeAdClosed() {
  if (typeof state.ads.pendingCallback === 'function') {
    const cb = state.ads.pendingCallback;
    state.ads.pendingCallback = null;
    cb();
  }
};

/* --------------------------------------------------------------------------
 * 5. SECURITY UTILITIES & VALID IN-MEMORY SAMPLE PDF GENERATOR
 * -------------------------------------------------------------------------- */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapePdfText(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

/**
 * Generates a real, spec-compliant 3-page PDF 1.4 binary (Uint8Array)
 * so Mozilla PDF.js renders crisp vector pages onto <canvas> in Demo Mode
 * with zero external CORS dependencies.
 */
function buildSamplePdfBytes(title, author) {
  const safeTitle = escapePdfText(title);
  const safeAuthor = escapePdfText(author);

  const pageStreams = [
    [
      'BT',
      '/F1 22 Tf 56 730 Td (' + safeTitle + ') Tj',
      '/F2 12 Tf 0 -28 Td (Author: ' + safeAuthor + ') Tj',
      '/F2 11 Tf 0 -42 Td (Chapter 1: Protected Canvas Distribution Architecture) Tj',
      '0 -20 Td (This document is rendered strictly onto an HTML5 canvas surface.) Tj',
      '0 -18 Td (Text selection, right-click extraction, browser printing, and direct) Tj',
      '0 -18 Td (file download links are disabled at the DOM and stylesheet layers.) Tj',
      '0 -32 Td (Key Architectural Safeguards:) Tj',
      '0 -20 Td (1. Zero raw PDF object/embed/iframe nodes in the viewport.) Tj',
      '0 -18 Td (2. Pointer events disabled directly on the canvas element.) Tj',
      '0 -18 Td (3. Print media query suppression when the reader modal is active.) Tj',
      '0 -18 Td (4. Supabase Row Level Security enforced via admin_users allowlist.) Tj',
      'ET',
      '0.15 0.39 0.92 RG 2 w 56 715 m 540 715 l S',
    ].join('\n'),
    [
      'BT',
      '/F1 18 Tf 56 730 Td (Chapter 2: Android WebView & AdMob Integration) Tj',
      '/F2 11 Tf 0 -30 Td (Wrapping a Progressive Web App inside an Android WebView container) Tj',
      '0 -18 Td (allows seamless AdMob Interstitial and App-Open monetization through) Tj',
      '0 -18 Td (the window.triggerInterstitialAd JavaScript bridge.) Tj',
      '0 -28 Td (Policy Compliance Checklist:) Tj',
      '0 -20 Td (- Enforce a 30-second cooldown between interstitial triggers.) Tj',
      '0 -18 Td (- Never fire interstitials unexpectedly during passive scrolling.) Tj',
      '0 -18 Td (- Anchor web banner containers inside non-overlapping layout slots.) Tj',
      '0 -18 Td (- Resume pending navigation cleanly via window.onNativeAdClosed.) Tj',
      'ET',
      '0.2 0.25 0.33 RG 1 w 56 718 m 540 718 l S',
    ].join('\n'),
    [
      'BT',
      '/F1 18 Tf 56 730 Td (Chapter 3: Supabase Storage & RLS Hardening) Tj',
      '/F2 11 Tf 0 -30 Td (Every write operation across apps, books, media, and storage buckets) Tj',
      '0 -18 Td (requires both a valid JWT session and membership in public.admin_users.) Tj',
      '0 -28 Td (Anonymous engagement metrics use a dedicated SECURITY DEFINER RPC) Tj',
      '0 -18 Td (function so visitors never hold UPDATE privileges on content tables.) Tj',
      '0 -48 Td (End of Sample Document — Page 3 of 3) Tj',
      'ET',
      '0.2 0.25 0.33 RG 1 w 56 718 m 540 718 l S',
    ].join('\n'),
  ];

  const objects = [];
  // 1: Catalog, 2: Pages, 3: Font Bold, 4: Font Regular
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [5 0 R 7 0 R 9 0 R] /Count 3 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'
  );
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  );

  // Pages & Content Streams (5/6, 7/8, 9/10)
  pageStreams.forEach((stream, idx) => {
    const pageObjId = 5 + idx * 2;
    const contentObjId = pageObjId + 1;
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/* --------------------------------------------------------------------------
 * 6. DATA LAYER (SUPABASE + LOCAL DEMO FALLBACK)
 * -------------------------------------------------------------------------- */
function getDemoStore() {
  try {
    const raw = localStorage.getItem('kinetix_demo_catalog_v1');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse error
  }
  return structuredClone(DEMO_SEED);
}

function saveDemoStore() {
  try {
    localStorage.setItem(
      'kinetix_demo_catalog_v1',
      JSON.stringify({
        apps: state.apps,
        books: state.books,
        media: state.media,
      })
    );
  } catch {
    // Ignore storage quota error
  }
}

async function loadCatalog() {
  const statusBanner = document.getElementById('feed-status-banner');

  if (!supabaseClient) {
    const demo = getDemoStore();
    state.apps = demo.apps || [];
    state.books = demo.books || [];
    state.media = demo.media || [];
    state.analyticsCount =
      state.apps.reduce((acc, a) => acc + (a.downloads_count || 0), 0) +
      state.books.reduce((acc, b) => acc + (b.reads_count || 0), 0) +
      state.media.reduce((acc, m) => acc + (m.views_count || 0), 0);
    statusBanner.classList.add('hidden');
    renderActiveFeed();
    updateAdminStats();
    return;
  }

  statusBanner.className =
    'mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300';
  statusBanner.textContent = 'Loading catalog from Supabase...';
  statusBanner.classList.remove('hidden');

  try {
    const [appsRes, booksRes, mediaRes] = await Promise.all([
      supabaseClient
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('books')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('media')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (appsRes.error) throw appsRes.error;
    if (booksRes.error) throw booksRes.error;
    if (mediaRes.error) throw mediaRes.error;

    state.apps = appsRes.data || [];
    state.books = booksRes.data || [];
    state.media = mediaRes.data || [];
    state.analyticsCount =
      state.apps.reduce((acc, a) => acc + (a.downloads_count || 0), 0) +
      state.books.reduce((acc, b) => acc + (b.reads_count || 0), 0) +
      state.media.reduce((acc, m) => acc + (m.views_count || 0), 0);

    statusBanner.classList.add('hidden');
    renderActiveFeed();
    updateAdminStats();
  } catch (err) {
    statusBanner.className =
      'mb-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200';
    statusBanner.textContent = `Unable to load catalog: ${err.message || 'Network error'}`;
    statusBanner.classList.remove('hidden');
  }
}

async function trackAnalyticsEvent(eventType, itemType, itemId) {
  const isAndroidWebView =
    Boolean(window.AndroidBridge) || /wv\)/i.test(navigator.userAgent);
  const platform = isAndroidWebView ? 'android_webview' : 'web_pwa';

  if (!supabaseClient) {
    state.analyticsCount += 1;
    updateAdminStats();
    return;
  }

  try {
    await supabaseClient.from('analytics_events').insert({
      event_type: eventType,
      item_type: itemType,
      item_id: String(itemId),
      platform,
    });

    const tableMap = { app: 'apps', book: 'books', media: 'media' };
    if (tableMap[itemType]) {
      await supabaseClient.rpc('increment_item_metric', {
        p_table: tableMap[itemType],
        p_id: itemId,
      });
    }
  } catch {
    // Non-blocking telemetry failure
  }
}

/* --------------------------------------------------------------------------
 * 7. PUBLIC FEED RENDERING (ZERO-PILL METADATA & IMAGE FALLBACKS)
 * -------------------------------------------------------------------------- */
function showToast(message) {
  const el = document.getElementById('toast-notification');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, 3200);
}

function renderActiveFeed() {
  const query = state.searchQuery.trim().toLowerCase();

  if (state.activeTab === 'apps') {
    renderAppsGrid(
      state.apps.filter(
        (app) =>
          !query ||
          app.title.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query)
      )
    );
  } else if (state.activeTab === 'books') {
    renderBooksGrid(
      state.books.filter(
        (book) =>
          !query ||
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query)
      )
    );
  } else {
    renderMediaGrid(
      state.media.filter((item) => {
        const matchesType =
          state.mediaFilter === 'all' || item.type === state.mediaFilter;
        const matchesQuery =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.caption.toLowerCase().includes(query);
        return matchesType && matchesQuery;
      })
    );
  }
}

function renderEmptyState(container, title, subtitle) {
  container.innerHTML = `
    <div class="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-slate-900">
      <p class="font-display text-base font-semibold text-slate-900 dark:text-white">${escapeHtml(title)}</p>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${escapeHtml(subtitle)}</p>
    </div>
  `;
}

function renderAppsGrid(items) {
  const grid = document.getElementById('apps-grid');
  if (!items.length) {
    renderEmptyState(
      grid,
      'No matching applications',
      'Try clearing your search or publish a new APK release from the Admin Portal.'
    );
    return;
  }

  grid.innerHTML = items
    .map((app) => {
      const initials = escapeHtml((app.title || 'A').slice(0, 2).toUpperCase());
      const iconHtml = app.icon_url
        ? `<img src="${escapeHtml(app.icon_url)}" alt="${escapeHtml(app.title)} icon" referrerpolicy="no-referrer" class="h-14 w-14 shrink-0 rounded-xl object-cover bg-slate-100 dark:bg-slate-800" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
           <div class="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-display text-base font-bold text-white dark:bg-brand-700">${initials}</div>`
        : `<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-display text-base font-bold text-white dark:bg-brand-700">${initials}</div>`;

      return `
        <article class="card-surface flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <div>
            <div class="flex items-start gap-4">
              ${iconHtml}
              <div class="min-w-0 flex-1">
                <h2 class="truncate font-display text-base font-bold text-slate-900 dark:text-white">
                  ${escapeHtml(app.title)}
                </h2>
                <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  <span>v${escapeHtml(app.version)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${escapeHtml(app.size)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${Number(app.downloads_count || 0).toLocaleString()} installs</span>
                </div>
              </div>
            </div>
            <p class="mt-3.5 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              ${escapeHtml(app.description)}
            </p>
          </div>

          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              data-download-app="${escapeHtml(app.id)}"
              class="min-h-[44px] w-full rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Download APK
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-download-app]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-download-app');
      const app = state.apps.find((a) => String(a.id) === String(appId));
      if (!app) return;

      window.triggerInterstitialAd(() => {
        app.downloads_count = (app.downloads_count || 0) + 1;
        if (!supabaseClient) saveDemoStore();
        trackAnalyticsEvent('apk_download', 'app', app.id);
        renderActiveFeed();

        if (app.apk_url.startsWith('#demo-apk')) {
          showToast(
            `Preparing ${app.title} v${app.version} APK (connect Supabase Storage for binary delivery).`
          );
        } else {
          const link = document.createElement('a');
          link.href = app.apk_url;
          link.download = `${app.title.replace(/\s+/g, '-').toLowerCase()}-v${app.version}.apk`;
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          link.remove();
          showToast(`Downloading ${app.title} APK...`);
        }
      }, 'apk_download');
    });
  });
}

function renderBooksGrid(items) {
  const grid = document.getElementById('books-grid');
  if (!items.length) {
    renderEmptyState(
      grid,
      'No PDF books available',
      'Try a different search term or upload a PDF book in the Admin Portal.'
    );
    return;
  }

  grid.innerHTML = items
    .map((book) => {
      const coverHtml = book.cover_url
        ? `<img src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)} cover" referrerpolicy="no-referrer" draggable="false" class="protected-media-img h-full w-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
           <div class="hidden h-full w-full flex-col items-center justify-center bg-slate-800 p-6 text-center text-white">
             <span class="font-display text-base font-bold">${escapeHtml(book.title)}</span>
           </div>`
        : `<div class="flex h-full w-full flex-col items-center justify-center bg-slate-800 p-6 text-center text-white">
             <span class="font-display text-base font-bold">${escapeHtml(book.title)}</span>
           </div>`;

      return `
        <article class="card-surface flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
          <div class="protected-surface relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            ${coverHtml}
          </div>
          <div class="flex flex-1 flex-col justify-between p-4">
            <div>
              <h2 class="line-clamp-2 font-display text-base font-bold text-slate-900 dark:text-white">
                ${escapeHtml(book.title)}
              </h2>
              <div class="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span>${escapeHtml(book.author)}</span>
                <span aria-hidden="true">·</span>
                <span class="font-mono tabular-nums">${Number(book.page_count || 1)} pages</span>
              </div>
              <p class="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                ${escapeHtml(book.description)}
              </p>
            </div>

            <button
              type="button"
              data-read-book="${escapeHtml(book.id)}"
              class="mt-4 min-h-[44px] w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-brand-700 dark:hover:bg-brand-600"
            >
              Read Now
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-read-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bookId = btn.getAttribute('data-read-book');
      const book = state.books.find((b) => String(b.id) === String(bookId));
      if (!book) return;

      window.triggerInterstitialAd(() => {
        book.reads_count = (book.reads_count || 0) + 1;
        if (!supabaseClient) saveDemoStore();
        trackAnalyticsEvent('pdf_open', 'book', book.id);
        openPdfReader(book);
      }, 'pdf_open');
    });
  });
}

function renderMediaGrid(items) {
  const grid = document.getElementById('media-grid');
  if (!items.length) {
    renderEmptyState(
      grid,
      'No media items found',
      'Switch filter categories or add photos/videos from the Admin Portal.'
    );
    return;
  }

  grid.innerHTML = items
    .map((item) => {
      const isVideo = item.type === 'video';
      const thumbSrc = item.thumbnail_url || item.media_url;
      const previewMarkup = isVideo
        ? `<div class="relative aspect-video w-full overflow-hidden bg-slate-950">
             <video
               src="${escapeHtml(item.media_url)}"
               poster="${escapeHtml(thumbSrc)}"
               controls
               controlsList="nodownload noplaybackrate"
               disablePictureInPicture
               playsinline
               preload="metadata"
               oncontextmenu="return false;"
               class="h-full w-full object-cover"
             ></video>
           </div>`
        : `<button
             type="button"
             data-open-photo="${escapeHtml(item.id)}"
             aria-label="Open ${escapeHtml(item.title)} in lightbox"
             class="protected-surface group relative block aspect-video w-full overflow-hidden bg-slate-100 text-left focus:outline-none dark:bg-slate-800"
           >
             <img
               src="${escapeHtml(item.media_url)}"
               alt="${escapeHtml(item.title)}"
               referrerpolicy="no-referrer"
               draggable="false"
               class="protected-media-img h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
             />
             <div class="hidden h-full w-full items-center justify-center bg-slate-800 text-xs font-medium text-slate-300">
               Media preview unavailable
             </div>
           </button>`;

      return `
        <article class="card-surface overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
          ${previewMarkup}
          <div class="p-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="truncate font-display text-base font-bold text-slate-900 dark:text-white">
                ${escapeHtml(item.title)}
              </h2>
              <span class="shrink-0 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                ${escapeHtml(isVideo ? item.duration || 'Video' : 'Photo')}
              </span>
            </div>
            <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              ${escapeHtml(item.caption)}
            </p>
            ${
              isVideo
                ? `<button
                     type="button"
                     data-open-video="${escapeHtml(item.id)}"
                     class="mt-3 min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                   >
                     Expand Theater Player
                   </button>`
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-open-photo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open-photo');
      const item = state.media.find((m) => String(m.id) === String(id));
      if (item) openMediaModal(item);
    });
  });

  grid.querySelectorAll('[data-open-video]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open-video');
      const item = state.media.find((m) => String(m.id) === String(id));
      if (item) openMediaModal(item);
    });
  });
}

/* --------------------------------------------------------------------------
 * 8. SECURE IN-APP CANVAS PDF.JS READER (STRICT NO-DOWNLOAD / NO-PRINT)
 * -------------------------------------------------------------------------- */
function preventProtectedEvent(e) {
  if (state.pdf.isOpen || !document.getElementById('media-lightbox-modal').classList.contains('hidden')) {
    e.preventDefault();
    return false;
  }
  return true;
}

function handleProtectedKeydown(e) {
  if (!state.pdf.isOpen) return;

  const key = (e.key || '').toLowerCase();
  const isMod = e.ctrlKey || e.metaKey;

  // Block Save (S), Print (P), Copy (C), View Source (U), Select All (A)
  if (isMod && ['s', 'p', 'c', 'u', 'a'].includes(key)) {
    e.preventDefault();
    showToast('Saving, copying, and printing are disabled for protected books.');
    return;
  }

  if (key === 'escape') {
    closePdfReader();
  } else if (key === 'arrowright') {
    changePdfPage(state.pdf.pageNum + 1);
  } else if (key === 'arrowleft') {
    changePdfPage(state.pdf.pageNum - 1);
  }
}

async function openPdfReader(book) {
  if (!window.pdfjsLib) {
    showToast('PDF engine is still loading. Please retry.');
    return;
  }

  const modal = document.getElementById('pdf-reader-modal');
  const titleEl = document.getElementById('pdf-reader-title');
  const loadingEl = document.getElementById('pdf-loading-state');
  const canvas = document.getElementById('pdf-canvas');
  const watermarkEl = document.getElementById('pdf-watermark-layer');

  titleEl.textContent = book.title;
  loadingEl.classList.remove('hidden');
  loadingEl.textContent = 'Loading protected canvas document...';
  canvas.classList.add('hidden');
  watermarkEl.className =
    'pointer-events-none absolute inset-0 overflow-hidden rounded-lg watermark-pattern';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('reader-locked', 'overflow-hidden');
  state.pdf.isOpen = true;
  state.pdf.pageNum = 1;
  state.pdf.scale = window.innerWidth < 640 ? 1.0 : 1.35;

  try {
    let sourceConfig;
    if (!book.pdf_url || book.pdf_url.startsWith('demo://')) {
      sourceConfig = { data: buildSamplePdfBytes(book.title, book.author) };
    } else if (book.pdf_url.startsWith('data:')) {
      const base64 = book.pdf_url.split(',')[1];
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      sourceConfig = { data: bytes };
    } else {
      sourceConfig = { url: book.pdf_url };
    }

    const loadingTask = window.pdfjsLib.getDocument(sourceConfig);
    state.pdf.doc = await loadingTask.promise;
    state.pdf.pageCount = state.pdf.doc.numPages;

    document.getElementById('pdf-page-count').textContent = String(
      state.pdf.pageCount
    );
    loadingEl.classList.add('hidden');
    canvas.classList.remove('hidden');

    await renderPdfPage(1);
  } catch (err) {
    loadingEl.textContent = `Unable to render document: ${err.message || 'Invalid PDF source'}`;
  }
}

async function renderPdfPage(num) {
  if (!state.pdf.doc) return;

  const targetPage = Math.max(1, Math.min(num, state.pdf.pageCount));
  state.pdf.pageNum = targetPage;

  document.getElementById('pdf-page-input').value = String(targetPage);
  document.getElementById('pdf-prev-btn').disabled = targetPage <= 1;
  document.getElementById('pdf-next-btn').disabled =
    targetPage >= state.pdf.pageCount;
  document.getElementById('pdf-zoom-label').textContent =
    `${Math.round(state.pdf.scale * 100)}%`;

  if (state.pdf.renderTask) {
    try {
      state.pdf.renderTask.cancel();
    } catch {
      // Ignore cancel race
    }
  }

  const page = await state.pdf.doc.getPage(targetPage);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: state.pdf.scale });

  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderTask = page.render({
    canvasContext: ctx,
    viewport,
  });
  state.pdf.renderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error(err);
    }
  }
}

function changePdfPage(nextPage) {
  if (!state.pdf.doc) return;
  if (nextPage < 1 || nextPage > state.pdf.pageCount) return;
  renderPdfPage(nextPage);
}

function closePdfReader() {
  const modal = document.getElementById('pdf-reader-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('reader-locked', 'overflow-hidden');
  state.pdf.isOpen = false;
  if (state.pdf.doc) {
    state.pdf.doc.destroy();
    state.pdf.doc = null;
  }
}

/* --------------------------------------------------------------------------
 * 9. MEDIA LIGHTBOX & VIDEO MODAL
 * -------------------------------------------------------------------------- */
function openMediaModal(item) {
  const modal = document.getElementById('media-lightbox-modal');
  const titleEl = document.getElementById('media-modal-title');
  const stage = document.getElementById('media-modal-stage');
  const caption = document.getElementById('media-modal-caption');

  titleEl.textContent = item.title;
  caption.textContent = item.caption || '';

  if (item.type === 'video') {
    stage.innerHTML = `
      <video
        src="${escapeHtml(item.media_url)}"
        poster="${escapeHtml(item.thumbnail_url || '')}"
        controls
        autoplay
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsinline
        oncontextmenu="return false;"
        class="max-h-[75vh] w-full max-w-4xl rounded-xl bg-black shadow-2xl"
      ></video>
    `;
  } else {
    stage.innerHTML = `
      <img
        src="${escapeHtml(item.media_url)}"
        alt="${escapeHtml(item.title)}"
        referrerpolicy="no-referrer"
        draggable="false"
        class="protected-media-img max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl"
      />
    `;
  }

  trackAnalyticsEvent('media_view', 'media', item.id);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
}

function closeMediaModal() {
  const modal = document.getElementById('media-lightbox-modal');
  const stage = document.getElementById('media-modal-stage');
  stage.innerHTML = ''; // Stops video playback immediately
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');
}

/* --------------------------------------------------------------------------
 * 10. SECRET ADMIN PORTAL (5 LOGO TAPS OR #admin-portal)
 * -------------------------------------------------------------------------- */
let logoTapCount = 0;
let logoTapTimer = null;

function setupSecretAdminTriggers() {
  const logoBtn = document.getElementById('brand-logo-trigger');

  logoBtn.addEventListener('click', () => {
    logoTapCount += 1;
    clearTimeout(logoTapTimer);

    if (logoTapCount >= 5) {
      logoTapCount = 0;
      openAdminPortal();
      return;
    }

    logoTapTimer = setTimeout(() => {
      logoTapCount = 0;
    }, 2500);
  });

  if (window.location.hash === '#admin-portal') {
    openAdminPortal();
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin-portal') {
      openAdminPortal();
    }
  });
}

async function openAdminPortal() {
  const modal = document.getElementById('admin-portal-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');

  const configNotice = document.getElementById('admin-config-notice');
  const sandboxBox = document.getElementById('admin-sandbox-box');

  if (!supabaseClient) {
    configNotice.classList.remove('hidden');
    sandboxBox.classList.remove('hidden');
  } else {
    configNotice.classList.add('hidden');
    sandboxBox.classList.add('hidden');
    // Check existing session
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
      const isAdmin = await verifyAdminUid(data.session.user.id);
      if (isAdmin) {
        state.adminSession = data.session;
        state.isAdminAuthorized = true;
      }
    }
  }

  syncAdminAuthUI();
}

function closeAdminPortal() {
  const modal = document.getElementById('admin-portal-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');
  if (window.location.hash === '#admin-portal') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

async function verifyAdminUid(uid) {
  if (!supabaseClient || !uid) return false;
  const { data, error } = await supabaseClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle();
  return !error && Boolean(data?.user_id);
}

function syncAdminAuthUI() {
  const authPanel = document.getElementById('admin-auth-panel');
  const workspace = document.getElementById('admin-workspace-panel');
  const signOutBtn = document.getElementById('admin-signout-btn');

  if (state.isAdminAuthorized) {
    authPanel.classList.add('hidden');
    workspace.classList.remove('hidden');
    signOutBtn.classList.remove('hidden');
    updateAdminStats();
    renderAdminManageList();
  } else {
    authPanel.classList.remove('hidden');
    workspace.classList.add('hidden');
    signOutBtn.classList.add('hidden');
  }
}

function updateAdminStats() {
  document.getElementById('stat-apps-count').textContent = String(state.apps.length);
  document.getElementById('stat-books-count').textContent = String(state.books.length);
  document.getElementById('stat-media-count').textContent = String(state.media.length);
  document.getElementById('stat-total-events').textContent = Number(
    state.analyticsCount || 0
  ).toLocaleString();
}

function showAdminFeedback(message, isError = false) {
  const banner = document.getElementById('admin-feedback-banner');
  banner.textContent = message;
  banner.className = isError
    ? 'rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200'
    : 'rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200';
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 4500);
}

/**
 * Uploads a File to Supabase Storage when configured, or reads into a local
 * Data/Object URL in Demo Sandbox Mode.
 */
async function uploadFileAsset(bucketName, file) {
  if (!file) return '';

  if (!supabaseClient) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read local file'));
      reader.readAsDataURL(file);
    });
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${Date.now()}-${cleanName}`;

  const { error } = await supabaseClient.storage
    .from(bucketName)
    .upload(filePath, file, { upsert: false });

  if (error) throw error;

  const { data } = supabaseClient.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
    const active = btn.getAttribute('data-admin-tab') === tabId;
    btn.className = active
      ? 'admin-tab-btn min-h-[40px] flex-1 rounded-lg bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm whitespace-nowrap dark:bg-slate-800 dark:text-white'
      : 'admin-tab-btn min-h-[40px] flex-1 rounded-lg px-3 text-xs font-medium text-slate-600 whitespace-nowrap hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';
  });

  const panelMap = {
    'publish-app': 'form-admin-app',
    'publish-book': 'form-admin-book',
    'publish-media': 'form-admin-media',
    'manage-all': 'panel-admin-manage',
  };

  Object.entries(panelMap).forEach(([key, elId]) => {
    document
      .getElementById(elId)
      .classList.toggle('hidden', key !== tabId);
  });

  if (tabId === 'manage-all') {
    renderAdminManageList();
  }
}

function renderAdminManageList() {
  const listEl = document.getElementById('admin-manage-list');
  const rows = [
    ...state.apps.map((a) => ({ kind: 'app', label: 'App', item: a })),
    ...state.books.map((b) => ({ kind: 'book', label: 'Book', item: b })),
    ...state.media.map((m) => ({
      kind: 'media',
      label: m.type === 'video' ? 'Video' : 'Photo',
      item: m,
    })),
  ];

  if (!rows.length) {
    listEl.innerHTML =
      '<div class="p-6 text-center text-xs text-slate-500">No items published yet.</div>';
    return;
  }

  listEl.innerHTML = rows
    .map(
      ({ kind, label, item }) => `
      <div class="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span class="font-semibold text-brand-700 dark:text-brand-400">${label}</span>
            <span aria-hidden="true">·</span>
            <span class="truncate font-mono">${escapeHtml(item.version || item.author || item.duration || 'Published')}</span>
          </div>
          <p class="truncate font-display text-sm font-bold text-slate-900 dark:text-white">
            ${escapeHtml(item.title)}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-admin-edit="${kind}:${escapeHtml(item.id)}"
            class="min-h-[36px] rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Edit
          </button>
          <button
            type="button"
            data-admin-delete="${kind}:${escapeHtml(item.id)}"
            class="min-h-[36px] rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            Delete
          </button>
        </div>
      </div>
    `
    )
    .join('');

  listEl.querySelectorAll('[data-admin-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [kind, id] = btn.getAttribute('data-admin-edit').split(':');
      populateEditForm(kind, id);
    });
  });

  listEl.querySelectorAll('[data-admin-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const [kind, id] = btn.getAttribute('data-admin-delete').split(':');
      await deleteCatalogItem(kind, id);
    });
  });
}

function populateEditForm(kind, id) {
  if (kind === 'app') {
    const app = state.apps.find((a) => String(a.id) === String(id));
    if (!app) return;
    document.getElementById('app-edit-id').value = app.id;
    document.getElementById('app-title').value = app.title;
    document.getElementById('app-version').value = app.version;
    document.getElementById('app-size').value = app.size;
    document.getElementById('app-description').value = app.description;
    document.getElementById('app-icon-url').value = app.icon_url || '';
    document.getElementById('app-apk-url').value = app.apk_url || '';
    switchAdminTab('publish-app');
  } else if (kind === 'book') {
    const book = state.books.find((b) => String(b.id) === String(id));
    if (!book) return;
    document.getElementById('book-edit-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-description').value = book.description;
    document.getElementById('book-pages').value = String(book.page_count || 1);
    document.getElementById('book-cover-url').value = book.cover_url || '';
    document.getElementById('book-pdf-url').value = book.pdf_url || '';
    switchAdminTab('publish-book');
  } else if (kind === 'media') {
    const media = state.media.find((m) => String(m.id) === String(id));
    if (!media) return;
    document.getElementById('media-edit-id').value = media.id;
    document.getElementById('media-type').value = media.type;
    document.getElementById('media-title').value = media.title;
    document.getElementById('media-caption').value = media.caption;
    document.getElementById('media-duration').value = media.duration || '';
    document.getElementById('media-url').value = media.media_url || '';
    switchAdminTab('publish-media');
  }
}

async function deleteCatalogItem(kind, id) {
  const tableMap = { app: 'apps', book: 'books', media: 'media' };

  if (supabaseClient) {
    const { error } = await supabaseClient
      .from(tableMap[kind])
      .delete()
      .eq('id', id);
    if (error) {
      showAdminFeedback(`Delete failed: ${error.message}`, true);
      return;
    }
    await loadCatalog();
  } else {
    if (kind === 'app') state.apps = state.apps.filter((a) => String(a.id) !== String(id));
    if (kind === 'book') state.books = state.books.filter((b) => String(b.id) !== String(id));
    if (kind === 'media') state.media = state.media.filter((m) => String(m.id) !== String(id));
    saveDemoStore();
    renderActiveFeed();
    updateAdminStats();
  }

  renderAdminManageList();
  showAdminFeedback('Item deleted successfully.');
}

/* --------------------------------------------------------------------------
 * 11. NAVIGATION, THEME, PWA INSTALL & OFFLINE INDICATORS
 * -------------------------------------------------------------------------- */
const SECTION_COPY = {
  apps: {
    heading: 'Android Applications',
    subheading:
      'Verified APK builds ready for direct installation on Android devices.',
  },
  books: {
    heading: 'Protected PDF Library',
    subheading:
      'Editorial monographs rendered exclusively inside our secure read-only canvas viewer.',
  },
  media: {
    heading: 'Curated Media',
    subheading:
      'High-resolution project photography and protected HTML5 stream previews.',
  },
};

function switchPublicTab(tab) {
  state.activeTab = tab;

  document.getElementById('section-heading').textContent =
    SECTION_COPY[tab].heading;
  document.getElementById('section-subheading').textContent =
    SECTION_COPY[tab].subheading;

  document.getElementById('view-apps').classList.toggle('hidden', tab !== 'apps');
  document.getElementById('view-books').classList.toggle('hidden', tab !== 'books');
  document.getElementById('view-media').classList.toggle('hidden', tab !== 'media');
  document
    .getElementById('media-filter-bar')
    .classList.toggle('hidden', tab !== 'media');
  document
    .getElementById('media-filter-bar')
    .classList.toggle('flex', tab === 'media');

  document.querySelectorAll('.desktop-nav-btn').forEach((btn) => {
    const active = btn.getAttribute('data-tab-target') === tab;
    btn.className = active
      ? 'desktop-nav-btn min-h-[40px] whitespace-nowrap shrink-0 border-b-2 border-brand-600 px-1 text-sm font-semibold text-brand-700 transition-colors dark:border-brand-500 dark:text-brand-400'
      : 'desktop-nav-btn min-h-[40px] whitespace-nowrap shrink-0 border-b-2 border-transparent px-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white';
  });

  document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
    const active = btn.getAttribute('data-tab-target') === tab;
    btn.className = active
      ? 'mobile-nav-btn flex h-full flex-col items-center justify-center gap-0.5 text-brand-700 transition-colors dark:text-brand-400'
      : 'mobile-nav-btn flex h-full flex-col items-center justify-center gap-0.5 text-slate-500 transition-colors dark:text-slate-400';
  });

  renderActiveFeed();
}

function setupPWAInstall() {
  const installBtn = document.getElementById('pwa-install-btn');
  const iosModal = document.getElementById('ios-install-modal');
  const iosClose = document.getElementById('ios-install-close');

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  if (!isStandalone && isIOS) {
    installBtn.classList.remove('hidden');
    installBtn.classList.add('flex');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredInstallPrompt = e;
    if (!isStandalone) {
      installBtn.classList.remove('hidden');
      installBtn.classList.add('flex');
    }
  });

  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    installBtn.classList.add('hidden');
    showToast('Kinetix Hub installed.');
  });

  installBtn.addEventListener('click', async () => {
    if (state.deferredInstallPrompt) {
      await state.deferredInstallPrompt.prompt();
      const { outcome } = await state.deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.classList.add('hidden');
      }
      state.deferredInstallPrompt = null;
    } else if (isIOS) {
      iosModal.classList.remove('hidden');
      iosModal.classList.add('flex');
    }
  });

  iosClose.addEventListener('click', () => {
    iosModal.classList.add('hidden');
    iosModal.classList.remove('flex');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration skipped if unsupported in sandboxed context
    });
  }
}

function setupConnectivityBanner() {
  const indicator = document.getElementById('offline-indicator');
  const syncStatus = () => {
    if (navigator.onLine) {
      indicator.classList.add('hidden');
      indicator.classList.remove('flex');
    } else {
      indicator.classList.remove('hidden');
      indicator.classList.add('flex');
    }
  };
  window.addEventListener('online', syncStatus);
  window.addEventListener('offline', syncStatus);
  syncStatus();
}

/* --------------------------------------------------------------------------
 * 12. EVENT WIRING & INITIALIZATION
 * -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Navigation tabs (Desktop + Mobile Bottom Bar)
  document.querySelectorAll('[data-tab-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchPublicTab(btn.getAttribute('data-tab-target'));
    });
  });

  // Search input
  document
    .getElementById('feed-search-input')
    .addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderActiveFeed();
    });

  // Media sub-filters
  document.querySelectorAll('[data-media-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mediaFilter = btn.getAttribute('data-media-filter');
      document.querySelectorAll('.media-filter-btn').forEach((el) => {
        const active = el.getAttribute('data-media-filter') === state.mediaFilter;
        el.className = active
          ? 'media-filter-btn min-h-[36px] rounded-md bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm transition whitespace-nowrap dark:bg-slate-700 dark:text-white'
          : 'media-filter-btn min-h-[36px] rounded-md px-3 text-xs font-medium text-slate-600 transition hover:text-slate-900 whitespace-nowrap dark:text-slate-300 dark:hover:text-white';
      });
      renderActiveFeed();
    });
  });

  // Light / Dark Theme Toggle
  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('kinetix_theme', isDark ? 'dark' : 'light');
  });

  // PDF Canvas Reader Controls & Protection Listeners
  document
    .getElementById('pdf-close-btn')
    .addEventListener('click', closePdfReader);
  document
    .getElementById('pdf-prev-btn')
    .addEventListener('click', () => changePdfPage(state.pdf.pageNum - 1));
  document
    .getElementById('pdf-next-btn')
    .addEventListener('click', () => changePdfPage(state.pdf.pageNum + 1));
  document.getElementById('pdf-zoom-in').addEventListener('click', () => {
    state.pdf.scale = Math.min(2.4, Number((state.pdf.scale + 0.2).toFixed(2)));
    renderPdfPage(state.pdf.pageNum);
  });
  document.getElementById('pdf-zoom-out').addEventListener('click', () => {
    state.pdf.scale = Math.max(0.7, Number((state.pdf.scale - 0.2).toFixed(2)));
    renderPdfPage(state.pdf.pageNum);
  });
  document.getElementById('pdf-page-input').addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) changePdfPage(val);
  });

  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.protected-surface')) {
      e.preventDefault();
    }
  });
  document.addEventListener('dragstart', preventProtectedEvent);
  document.addEventListener('selectstart', preventProtectedEvent);
  document.addEventListener('copy', preventProtectedEvent);
  document.addEventListener('keydown', handleProtectedKeydown);
  window.addEventListener('beforeprint', (e) => {
    if (state.pdf.isOpen) {
      e.preventDefault();
      showToast('Printing is disabled for protected books.');
    }
  });

  // Media Lightbox Modal Close
  document
    .getElementById('media-modal-close')
    .addEventListener('click', closeMediaModal);

  // Admin Portal Setup
  setupSecretAdminTriggers();
  document
    .getElementById('admin-close-btn')
    .addEventListener('click', closeAdminPortal);

  document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchAdminTab(btn.getAttribute('data-admin-tab'));
    });
  });

  // Admin Login Form
  document
    .getElementById('admin-login-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email').value.trim();
      const password = document.getElementById('admin-password').value;
      const errEl = document.getElementById('admin-auth-error');
      errEl.classList.add('hidden');

      if (!supabaseClient) {
        errEl.textContent =
          'Supabase URL & Anon Key placeholders are not configured yet. Use Preview Sandbox below.';
        errEl.classList.remove('hidden');
        return;
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.session) {
        errEl.textContent = error?.message || 'Authentication failed.';
        errEl.classList.remove('hidden');
        return;
      }

      const isAdmin = await verifyAdminUid(data.session.user.id);
      if (!isAdmin) {
        await supabaseClient.auth.signOut();
        errEl.textContent =
          'Access denied: UID is not authorized in public.admin_users.';
        errEl.classList.remove('hidden');
        return;
      }

      state.adminSession = data.session;
      state.isAdminAuthorized = true;
      syncAdminAuthUI();
    });

  // Sandbox Mode Entry (only visible when Supabase placeholders are unconfigured)
  document
    .getElementById('admin-sandbox-btn')
    .addEventListener('click', () => {
      state.adminSession = { sandbox: true };
      state.isAdminAuthorized = true;
      syncAdminAuthUI();
      showAdminFeedback(
        'Sandbox Mode active. Changes persist locally in browser storage.'
      );
    });

  // Admin Sign Out
  document
    .getElementById('admin-signout-btn')
    .addEventListener('click', async () => {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      state.adminSession = null;
      state.isAdminAuthorized = false;
      syncAdminAuthUI();
    });

  // Admin App Form Submit
  document
    .getElementById('form-admin-app')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const editId = document.getElementById('app-edit-id').value;
        const iconFile = document.getElementById('app-icon-file').files[0];
        const apkFile = document.getElementById('app-apk-file').files[0];

        const iconUrl = iconFile
          ? await uploadFileAsset('media-assets', iconFile)
          : document.getElementById('app-icon-url').value.trim();

        const apkUrl = apkFile
          ? await uploadFileAsset('apk-files', apkFile)
          : document.getElementById('app-apk-url').value.trim();

        if (!apkUrl) {
          showAdminFeedback('Provide an APK download link or upload an .apk file.', true);
          return;
        }

        const payload = {
          title: document.getElementById('app-title').value.trim(),
          version: document.getElementById('app-version').value.trim(),
          size: document.getElementById('app-size').value.trim(),
          description: document.getElementById('app-description').value.trim(),
          icon_url: iconUrl,
          apk_url: apkUrl,
        };

        if (supabaseClient) {
          const { error } = editId
            ? await supabaseClient.from('apps').update(payload).eq('id', editId)
            : await supabaseClient.from('apps').insert(payload);
          if (error) throw error;
          await loadCatalog();
        } else {
          if (editId) {
            const idx = state.apps.findIndex((a) => String(a.id) === String(editId));
            if (idx !== -1) state.apps[idx] = { ...state.apps[idx], ...payload };
          } else {
            state.apps.unshift({
              id: `demo-app-${Date.now()}`,
              downloads_count: 0,
              ...payload,
            });
          }
          saveDemoStore();
          renderActiveFeed();
          updateAdminStats();
        }

        e.target.reset();
        document.getElementById('app-edit-id').value = '';
        showAdminFeedback('App release saved successfully.');
      } catch (err) {
        showAdminFeedback(err.message || 'Failed to save app release.', true);
      }
    });

  document.getElementById('app-form-reset').addEventListener('click', () => {
    document.getElementById('form-admin-app').reset();
    document.getElementById('app-edit-id').value = '';
  });

  // Admin PDF Book Form Submit
  document
    .getElementById('form-admin-book')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const editId = document.getElementById('book-edit-id').value;
        const coverFile = document.getElementById('book-cover-file').files[0];
        const pdfFile = document.getElementById('book-pdf-file').files[0];

        const coverUrl = coverFile
          ? await uploadFileAsset('media-assets', coverFile)
          : document.getElementById('book-cover-url').value.trim();

        const pdfUrl = pdfFile
          ? await uploadFileAsset('pdf-books', pdfFile)
          : document.getElementById('book-pdf-url').value.trim();

        if (!pdfUrl) {
          showAdminFeedback('Provide a PDF URL or upload a .pdf file.', true);
          return;
        }

        const payload = {
          title: document.getElementById('book-title').value.trim(),
          author: document.getElementById('book-author').value.trim(),
          description: document.getElementById('book-description').value.trim(),
          page_count: parseInt(document.getElementById('book-pages').value, 10) || 1,
          cover_url: coverUrl,
          pdf_url: pdfUrl,
        };

        if (supabaseClient) {
          const { error } = editId
            ? await supabaseClient.from('books').update(payload).eq('id', editId)
            : await supabaseClient.from('books').insert(payload);
          if (error) throw error;
          await loadCatalog();
        } else {
          if (editId) {
            const idx = state.books.findIndex((b) => String(b.id) === String(editId));
            if (idx !== -1) state.books[idx] = { ...state.books[idx], ...payload };
          } else {
            state.books.unshift({
              id: `demo-book-${Date.now()}`,
              reads_count: 0,
              ...payload,
            });
          }
          saveDemoStore();
          renderActiveFeed();
          updateAdminStats();
        }

        e.target.reset();
        document.getElementById('book-edit-id').value = '';
        showAdminFeedback('PDF book saved successfully.');
      } catch (err) {
        showAdminFeedback(err.message || 'Failed to save PDF book.', true);
      }
    });

  document.getElementById('book-form-reset').addEventListener('click', () => {
    document.getElementById('form-admin-book').reset();
    document.getElementById('book-edit-id').value = '';
  });

  // Admin Media Form Submit
  document
    .getElementById('form-admin-media')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const editId = document.getElementById('media-edit-id').value;
        const mediaFile = document.getElementById('media-file').files[0];

        const mediaUrl = mediaFile
          ? await uploadFileAsset('media-assets', mediaFile)
          : document.getElementById('media-url').value.trim();

        if (!mediaUrl) {
          showAdminFeedback('Provide a media URL or upload a photo/video file.', true);
          return;
        }

        const mediaType = document.getElementById('media-type').value;
        const payload = {
          type: mediaType,
          title: document.getElementById('media-title').value.trim(),
          caption: document.getElementById('media-caption').value.trim(),
          duration: document.getElementById('media-duration').value.trim(),
          media_url: mediaUrl,
          thumbnail_url: mediaType === 'photo' ? mediaUrl : '',
        };

        if (supabaseClient) {
          const { error } = editId
            ? await supabaseClient.from('media').update(payload).eq('id', editId)
            : await supabaseClient.from('media').insert(payload);
          if (error) throw error;
          await loadCatalog();
        } else {
          if (editId) {
            const idx = state.media.findIndex((m) => String(m.id) === String(editId));
            if (idx !== -1) state.media[idx] = { ...state.media[idx], ...payload };
          } else {
            state.media.unshift({
              id: `demo-media-${Date.now()}`,
              views_count: 0,
              ...payload,
            });
          }
          saveDemoStore();
          renderActiveFeed();
          updateAdminStats();
        }

        e.target.reset();
        document.getElementById('media-edit-id').value = '';
        showAdminFeedback('Media item saved successfully.');
      } catch (err) {
        showAdminFeedback(err.message || 'Failed to save media item.', true);
      }
    });

  document.getElementById('media-form-reset').addEventListener('click', () => {
    document.getElementById('form-admin-media').reset();
    document.getElementById('media-edit-id').value = '';
  });

  // Boot sequence
  setupPWAInstall();
  setupConnectivityBanner();
  switchPublicTab('apps');
  loadCatalog();
});
