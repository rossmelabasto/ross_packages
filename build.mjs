// Assembles repo.rossmel.com into a directory. The deploy workflow first downloads, into
// `fetched/`, what the published releases contain:
//   fetched/visualizer/{version,CHANGELOG.md,CHANGELOG.es.md}  from ross_visualizer's newest release
//   fetched/ros/                                             the [ros] packages (release x86_64 here)
// and the package repositories themselves straight into the output directory.
//   node build.mjs <output-dir>
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? join(root, '_site'));
const fetched = join(root, 'fetched');
const read = (path, fallback = '') => (existsSync(path) ? readFileSync(path, 'utf8') : fallback);

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (text) =>
  escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

/** The Markdown a changelog uses: versions, subsections, lists and paragraphs. */
export function renderChangelog(markdown) {
  const html = [];
  let inList = false;
  const closeList = () => {
    if (inList) html.push('</ul>');
    inList = false;
  };
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.startsWith('## '));
  if (start < 0) return '';
  for (const line of lines.slice(start)) {
    if (line.startsWith('### ')) {
      closeList();
      html.push(`<h4>${inline(line.slice(4))}</h4>`);
    } else if (line.startsWith('## ')) {
      closeList();
      html.push(`<h3>${inline(line.slice(3))}</h3>`);
    } else if (line.startsWith('- ')) {
      if (!inList) html.push('<ul>');
      inList = true;
      html.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.trim()) {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join('\n');
}

// What each rOS package is, for the table on the home page.
const ROS_PACKAGES = {
  'ros-base': ['System defaults: identity, services, kernel settings and boot splash', 'Valores del sistema: identidad, servicios, ajustes del kernel y pantalla de arranque'],
  'ros-desktop': ['The desktop: niri, DankMaterialShell and the default settings for new users', 'El escritorio: niri, DankMaterialShell y la configuración inicial de cada usuario'],
  'ros-scripts': ['Small tools: launching apps on the dedicated GPU, power profiles and updates', 'Herramientas: abrir apps en la GPU dedicada, perfiles de energía y actualizaciones'],
  'ros-keyring': ['The signing key of the [ros] repository', 'La clave de firma del repositorio [ros]'],
  'dms-greeter': ['The login screen of DankMaterialShell, packaged for rOS', 'La pantalla de inicio de sesión de DankMaterialShell, empaquetada para rOS'],
};

/** name-version-release-arch.pkg.tar.zst → [name, version-release] */
function parsePackage(file) {
  const m = file.match(/^(.+)-([^-]+-[^-]+)-(x86_64|any)\.pkg\.tar\.zst$/);
  return m ? [m[1], m[2]] : null;
}

function rosRows() {
  const dir = join(fetched, 'ros');
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const rows = files
    .map(parsePackage)
    .filter(Boolean)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => {
      const [en, es] = ROS_PACKAGES[name] ?? ['', ''];
      return `            <tr><td><code>${escape(name)}</code></td><td><code>${escape(version)}</code></td><td><span lang="en">${escape(en)}</span><span lang="es">${escape(es)}</span></td></tr>`;
    });
  return rows.join('\n');
}

// Each program's newest release: fetched/<name>/{version,CHANGELOG.md,CHANGELOG.es.md}.
const programs = JSON.parse(readFileSync(join(root, 'programs.json'), 'utf8')).map(({ name, page }) => {
  const dir = join(fetched, name);
  const en = renderChangelog(read(join(dir, 'CHANGELOG.md')));
  return {
    name,
    page,
    version: read(join(dir, 'version')).trim().replace(/^v/, ''),
    date: read(join(dir, 'date')).trim(),
    en,
    // Programs without a Spanish changelog show the English one.
    es: renderChangelog(read(join(dir, 'CHANGELOG.es.md'))) || en,
  };
});

const fill = (html) => {
  for (const p of programs) {
    // A program without a release yet doesn't show up anywhere.
    if (!p.version) {
      html = html.replace(new RegExp(`\\s*<!--program:${p.name}-->[\\s\\S]*?<!--/program:${p.name}-->`, 'g'), '');
      continue;
    }
    html = html
      .replaceAll(`@VERSION:${p.name}@`, p.version || '—')
      .replaceAll(`@DATE:${p.name}@`, p.date)
      .replaceAll(`@DATESHORT:${p.name}@`, p.date.slice(0, 10) || '—')
      .replace(`@CHANGELOG_EN:${p.name}@`, () => p.en)
      .replace(`@CHANGELOG_ES:${p.name}@`, () => p.es);
  }
  // The F-Droid part shows only once the repository exists (its fingerprint was written).
  const fingerprint = read(join(fetched, 'fdroid-fingerprint')).trim();
  html = fingerprint
    ? html
        .replaceAll('@FDROID_FINGERPRINT@', fingerprint)
        .replaceAll('@FDROID_FINGERPRINT_SPACED@', fingerprint.replace(/(..)(?!$)/g, '$1 '))
    : html.replace(/<!--fdroid-->[\s\S]*?<!--\/fdroid-->/g, '');
  return html.replace('@ROS_PACKAGES@', () => rosRows());
};

mkdirSync(out, { recursive: true });
cpSync(join(root, 'site'), out, {
  recursive: true,
  filter: (src) => !src.endsWith('.html'),
});
const pages = ['index.html', 'repository/index.html', '404.html', ...(read(join(fetched, 'fdroid-fingerprint')).trim() ? ['fdroid/repo/index.html'] : []), ...programs.filter((p) => p.version).map((p) => `${p.page}/index.html`)];
for (const page of pages) {
  const src = join(root, 'site', page);
  if (!existsSync(src)) continue;
  mkdirSync(dirname(join(out, page)), { recursive: true });
  writeFileSync(join(out, page), fill(readFileSync(src, 'utf8')));
}
// GitHub Pages: serve files and folders that start with "_" or "." as they are.
writeFileSync(join(out, '.nojekyll'), '');
console.log(`site: ${programs.map((p) => `${p.name} ${p.version || '(none)'}`).join(', ')} -> ${out}`);
