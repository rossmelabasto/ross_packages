// Shared by repo.rossmel.com and ros.rossmel.com: language, tabs and copy buttons.
// The language is picked in the <head> (see the inline script) before anything paints.

const root = document.documentElement;
const label = { en: 'ES', es: 'EN' };

function setLang(lang) {
  root.dataset.lang = lang;
  root.lang = lang;
  try {
    localStorage.setItem('lang', lang);
  } catch {
    /* private mode: it just won't be remembered */
  }
  for (const b of document.querySelectorAll('.lang')) {
    b.textContent = label[lang];
    b.setAttribute('aria-label', lang === 'en' ? 'Ver en español' : 'View in English');
  }
  const title = document.querySelector(`meta[name="title-${lang}"]`);
  if (title) document.title = title.content;
  // Text that can't hold two <span lang> children: options and placeholders.
  for (const el of document.querySelectorAll('[data-en]')) el.textContent = el.dataset[lang];
  for (const el of document.querySelectorAll('[data-placeholder-en]')) el.placeholder = el.dataset[lang === 'en' ? 'placeholderEn' : 'placeholderEs'];
}

setLang(root.dataset.lang === 'es' ? 'es' : 'en');
for (const b of document.querySelectorAll('.lang')) {
  b.addEventListener('click', () => setLang(root.dataset.lang === 'en' ? 'es' : 'en'));
}

// Each tablist switches only its own panels.
function select(tab) {
  for (const other of tab.parentElement.querySelectorAll('[role="tab"]')) {
    const on = other === tab;
    other.setAttribute('aria-selected', String(on));
    other.tabIndex = on ? 0 : -1;
    document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
  }
}
for (const list of document.querySelectorAll('[role="tablist"]')) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, i) => {
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const next = tabs[(i + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
}

// Open the tab for the visitor's system when the browser gives it away.
const ua = navigator.userAgent;
const pick = /fedora/i.test(ua) ? 'rpm' : /ubuntu|debian/i.test(ua) ? 'deb' : null;
if (pick) for (const tab of document.querySelectorAll(`[role="tab"][data-os="${pick}"]`)) select(tab);

const copyText = { en: ['Copy', 'Copied', 'Select and copy'], es: ['Copiar', 'Copiado', 'Selecciona y copia'] };
for (const block of document.querySelectorAll('.code')) {
  const button = document.createElement('button');
  button.className = 'copy';
  button.type = 'button';
  const show = (i) => (button.textContent = copyText[root.dataset.lang][i]);
  show(0);
  new MutationObserver(() => show(0)).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(block.querySelector('code').textContent);
      show(1);
    } catch {
      show(2);
    }
    setTimeout(() => show(0), 1600);
  });
  block.appendChild(button);
}

// ---------------------------------------------------------------- side menu
// Built from the page: every <section id> with an <h2> (both languages), then the links of the
// header nav ("Go to"). Wide screens show it on the right; narrow ones behind a floating button.
(function sideMenu() {
  const sections = [...document.querySelectorAll('main section[id]')].filter((s) => s.querySelector('h2'));
  const global = document.querySelector('.site-header .nav');
  if (!sections.length && !global) return;
  const menu = document.createElement('nav');
  menu.className = 'toc';
  menu.setAttribute('aria-label', 'Menu');
  const head = (en, es) => {
    const p = document.createElement('p');
    p.className = 'toc-head';
    p.innerHTML = `<span lang="en">${en}</span><span lang="es">${es}</span>`;
    return p;
  };
  const links = [];
  if (sections.length) {
    menu.appendChild(head('On this page', 'En esta página'));
    for (const s of sections) {
      const a = document.createElement('a');
      a.href = `#${s.id}`;
      const titles = [...s.querySelectorAll(':scope h2')];
      for (const h of titles.length ? titles : [s.querySelector('h2')]) {
        const span = document.createElement('span');
        if (h.lang) span.lang = h.lang;
        span.textContent = h.textContent;
        a.appendChild(span);
      }
      menu.appendChild(a);
      links.push([s, a]);
    }
  }
  if (global) {
    menu.appendChild(head('Go to', 'Ir a'));
    for (const a of global.querySelectorAll('a')) menu.appendChild(a.cloneNode(true)).classList.add('toc-out');
    global.remove();
  }
  document.body.appendChild(menu);

  const toggle = document.createElement('button');
  toggle.className = 'toc-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span aria-hidden="true">☰</span><span lang="en">Menu</span><span lang="es">Menú</span>';
  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  document.body.appendChild(toggle);

  // Mark the section being read.
  if (links.length && 'IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target, e.isIntersecting);
        const current = links.find(([s]) => seen.get(s));
        for (const [, a] of links) a.classList.toggle('active', !!current && a === current[1]);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const [s] of links) io.observe(s);
  }
})();

// ---------------------------------------------------------------- gallery
// <a class="media" href="big.jpg"> or data-video="clip.mp4": opens in a viewer, arrows move
// through the gallery it belongs to, Escape closes it.
(function gallery() {
  const items = [...document.querySelectorAll('a.media')];
  if (!items.length) return;
  const box = document.createElement('dialog');
  box.className = 'lightbox';
  box.innerHTML =
    '<div class="lb-stage"></div><p class="lb-caption"></p>' +
    '<button type="button" class="lb-btn lb-prev" aria-label="Previous">‹</button>' +
    '<button type="button" class="lb-btn lb-next" aria-label="Next">›</button>' +
    '<button type="button" class="lb-btn lb-close" aria-label="Close">✕</button>';
  document.body.appendChild(box);
  const stage = box.querySelector('.lb-stage');
  let group = [];
  let index = 0;
  const visible = (a) => a.offsetParent !== null;
  const show = (i) => {
    index = (i + group.length) % group.length;
    const a = group[index];
    stage.innerHTML = '';
    if (a.dataset.video) {
      const v = document.createElement('video');
      v.src = a.dataset.video;
      v.controls = v.autoplay = v.loop = v.muted = v.playsInline = true;
      stage.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = a.href;
      img.alt = a.querySelector('img')?.alt ?? '';
      stage.appendChild(img);
    }
    box.querySelector('.lb-caption').textContent = a.title || a.querySelector('img')?.alt || '';
    box.querySelectorAll('.lb-prev, .lb-next').forEach((b) => (b.hidden = group.length < 2));
  };
  for (const a of items) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const gallery = a.closest('.gallery');
      group = (gallery ? [...gallery.querySelectorAll('a.media')] : [a]).filter(visible);
      show(group.indexOf(a));
      box.showModal();
    });
  }
  box.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  box.querySelector('.lb-close').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => e.target === box && box.close());
  box.addEventListener('close', () => (stage.innerHTML = ''));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
  });
})();

// ---------------------------------------------------------------- catalog
// The program cards carry data-title, data-kind, data-tags and data-updated; this only shows,
// hides and orders them.
(function catalog() {
  const list = document.querySelector('.catalog .cards');
  const form = document.querySelector('.catalog-tools');
  if (!list || !form) return;
  const cards = [...list.querySelectorAll('.card')];
  const search = form.querySelector('input[type="search"]');
  const sort = form.querySelector('select');
  const kinds = [...form.querySelectorAll('[data-kind-filter]')];
  const tagBox = form.querySelector('.tag-filters');
  const empty = document.querySelector('.catalog-empty');
  const count = document.querySelector('.catalog-count');
  const tagNames = window.TAG_NAMES || {};

  const allTags = [...new Set(cards.flatMap((c) => c.dataset.tags.split(' ').filter(Boolean)))].sort();
  const activeTags = new Set();
  for (const t of allTags) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tag';
    b.dataset.tag = t;
    const [en, es] = tagNames[t] || [t, t];
    b.innerHTML = `<span lang="en">${en}</span><span lang="es">${es}</span>`;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      activeTags.has(t) ? activeTags.delete(t) : activeTags.add(t);
      b.setAttribute('aria-pressed', String(activeTags.has(t)));
      update();
    });
    tagBox.appendChild(b);
  }
  // Tags on the cards filter too.
  for (const c of cards) {
    const chips = c.querySelector('.card-tags');
    if (!chips) continue;
    for (const t of c.dataset.tags.split(' ').filter(Boolean)) {
      const [en, es] = tagNames[t] || [t, t];
      const s = document.createElement('span');
      s.className = 'chip';
      s.innerHTML = `#<span lang="en">${en}</span><span lang="es">${es}</span>`;
      chips.appendChild(s);
    }
  }
  let kind = 'all';
  for (const b of kinds) {
    b.addEventListener('click', () => {
      kind = b.dataset.kindFilter;
      for (const o of kinds) o.setAttribute('aria-pressed', String(o === b));
      update();
    });
  }
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function update() {
    const q = norm(search.value.trim());
    let shown = 0;
    for (const c of cards) {
      const tags = c.dataset.tags.split(' ');
      const text = norm(c.textContent + ' ' + tags.map((t) => (tagNames[t] || [t, t]).join(' ')).join(' '));
      const ok =
        (!q || q.split(/\s+/).every((w) => text.includes(w))) &&
        (kind === 'all' || c.dataset.kind === kind) &&
        [...activeTags].every((t) => tags.includes(t));
      c.hidden = !ok;
      if (ok) shown++;
    }
    const by = sort.value;
    const sorted = [...cards].sort((a, b) =>
      by === 'name' ? a.dataset.title.localeCompare(b.dataset.title)
      : by === 'name-desc' ? b.dataset.title.localeCompare(a.dataset.title)
      : (b.dataset.updated || '').localeCompare(a.dataset.updated || ''),
    );
    for (const c of sorted) list.appendChild(c);
    empty.hidden = shown > 0;
    count.textContent = String(shown);
  }
  search.addEventListener('input', update);
  sort.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
})();
