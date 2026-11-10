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
