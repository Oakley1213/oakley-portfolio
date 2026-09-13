/* ============================================================
   Oakley Portfolio — main.js
   三個頁面共用（index / project-rightcode / project-virtuosi）
   每個功能都會先檢查元素存不存在，所以同一支檔案可以直接共用。
   ============================================================ */

/* ---------- 0. 圖片載入失敗就退回佔位框 ----------------------
   CSS 用 .ph:has(img) 判斷「這格有圖了」，所以圖抓不到時
   必須把 <img> 整個移除，佔位框（或替代文字）才會重新出現。
   用捕獲階段監聽，因為 img 的 error 事件不會冒泡。
   ------------------------------------------------------------ */
window.addEventListener('error', (e) => {
  const el = e.target;
  if (el && el.tagName === 'IMG' && el.closest('.ph')) {
    el.remove();
  }
}, true);


/* ---------- 1. 手機選單（只有首頁有） ------------------------ */
(function navMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    nav.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (e) => {
    if (e.target.closest('.nav__link')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();


/* ---------- 2. 導覽列背景（捲動後才浮現毛玻璃） -------------- */
(function stickyHead() {
  const head = document.querySelector('.site-head');
  if (!head) return;

  const onScroll = () => head.classList.toggle('is-stuck', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ---------- 3. 捲動進度軌 ------------------------------------
   用 transform: scaleY() 驅動，不改 height，捲動時不會觸發 reflow。
   顏色由 <body data-project> 在 CSS 決定，這裡不碰。
   ------------------------------------------------------------ */
(function scrollRail() {
  const fill = document.querySelector('.rail__fill');
  if (!fill) return;

  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    fill.style.setProperty('--progress', progress.toFixed(4));
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });
  update();
})();


/* ---------- 4. 導覽列 active 狀態（首頁的錨點） -------------- */
(function activeNav() {
  const links = [...document.querySelectorAll('.nav__link')]
    .filter((a) => a.getAttribute('href')?.startsWith('#'));
  const targets = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!targets.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => {
        a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  targets.forEach((t) => io.observe(t));
})();


/* ---------- 4.5 手機示範影片：進入視野才播放 -------------------
   HTML 裡刻意不寫 autoplay——寫了六支影片會在載入時一起開跑。
   改由 IntersectionObserver 決定：
   - 影片本身 ≥ 50% 進入可視範圍才播放，離開就暫停。
   - 同時有多支達標時，只播放露出比例最高的那一支。
   - play() 被瀏覽器擋下（低耗電模式等）時靜靜吞掉，版面不受影響。
   - prefers-reduced-motion 時完全不自動播放，只停在第一幀。
   ------------------------------------------------------------ */
(function deviceVideos() {
  const videos = [...document.querySelectorAll('.device__video')];
  if (!videos.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // 自動播放政策要求靜音；屬性之外再用 JS 設一次，保險
  videos.forEach((v) => { v.muted = true; v.defaultMuted = true; });

  /* preload="metadata" 不保證畫出第一幀（Chrome 常是一片底色）。
     往前 seek 一點點會強迫解碼一幀，暫停狀態就有畫面可看。 */
  const showFirstFrame = (v) => {
    const nudge = () => { if (v.currentTime === 0) { try { v.currentTime = 0.001; } catch (_) { /* ignore */ } } };
    if (v.readyState >= 1) nudge();
    else v.addEventListener('loadedmetadata', nudge, { once: true });
  };

  const safePlay = (v) => {
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  const ratios = new Map();

  const sync = () => {
    let best = null;
    let bestRatio = 0;
    ratios.forEach((r, v) => {
      if (r >= 0.5 && r > bestRatio) { best = v; bestRatio = r; }
    });
    const allowed = best && !reduce.matches && !document.hidden;

    videos.forEach((v) => {
      if (v !== best || !allowed) { if (!v.paused) v.pause(); }
    });
    if (allowed) safePlay(best);
  };

  if (!('IntersectionObserver' in window)) {
    videos.forEach(showFirstFrame);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      if (entry.isIntersecting) showFirstFrame(entry.target);
    });
    sync();
  }, { threshold: [0, 0.5, 0.75, 1] });

  videos.forEach((v) => io.observe(v));

  // 切到背景分頁就暫停，回來再續播；使用者中途改動作偏好也照辦
  document.addEventListener('visibilitychange', sync);
  if (typeof reduce.addEventListener === 'function') reduce.addEventListener('change', sync);
})();


/* ---------- 5. 進場動畫 --------------------------------------
   不在 HTML 裡逐個標記 data-reveal，改成用選擇器批次掛上，
   之後增刪區塊不用維護標記。
   ------------------------------------------------------------ */
(function reveal() {
  const selectors = [
    '.hero > .container > *',
    '.page-hero > .container > *',
    '.section__head',
    '.stage__head',
    '.pcard',
    '.factbar',
    '.figure',
    '.grid',
    '.compare',
    '.gallery',
    '.stat-row',
    '.pull-quote',
    '.pillars',
    '.iteration',
    '.anno',
    '.feature-row',
    '.swatches',
    '.type-scale',
    '.prose',
    '.btn-row',
    '.about__grid',
    '.contact__links',
  ];

  const all = [...document.querySelectorAll(selectors.join(','))];

  // 避免巢狀：父層已經要淡入的話，子層就不再各自淡入一次
  const items = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));

  items.forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
  });

  const show = (el) => el.classList.add('is-in');

  if (!('IntersectionObserver' in window)) {
    items.forEach(show);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        show(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  items.forEach((el) => io.observe(el));

  /* 保險絲：內容永遠不會卡在 opacity:0。
     IntersectionObserver 在背景分頁不會觸發，若使用者是用「開新分頁」
     的方式打開作品集，回到分頁時可能整頁空白——這是作品集最不能出的錯。
     所以補兩道：切回分頁時掃一次、最後再無條件全開。 */
  const sweep = () => {
    items.forEach((el) => {
      if (el.classList.contains('is-in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { show(el); io.unobserve(el); }
    });
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sweep();
  });
  window.addEventListener('pageshow', sweep);

  setTimeout(() => items.forEach(show), 5000);
})();
