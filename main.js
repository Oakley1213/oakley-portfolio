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


/* ---------- 4.5 互動原型：點擊才載入 -------------------------
   Figma embed 很重（等於載入整個 Figma 應用），一進頁就掛 iframe
   會拖慢整頁，也會替所有訪客種第三方 cookie。
   所以先放靜態封面，使用者點了才換成真的 iframe。
   ------------------------------------------------------------ */
(function protoEmbed() {
  document.querySelectorAll('.proto').forEach((box) => {
    const btn = box.querySelector('.proto__launch');
    const src = box.dataset.proto;
    if (!btn || !src) return;

    btn.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = box.dataset.protoTitle || '互動原型';
      frame.loading = 'lazy';
      frame.allowFullscreen = true;
      // 只給它需要的權限
      frame.setAttribute('allow', 'fullscreen');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      box.replaceChildren(frame);
      frame.focus({ preventScroll: true });
    }, { once: true });
  });
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
