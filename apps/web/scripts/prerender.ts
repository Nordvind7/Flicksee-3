/**
 * Build-time prerender for SEO.
 *
 * Vite builds the SPA into dist/. This script then takes dist/index.html as
 * a template and produces a static dist/<route>/index.html for every blog
 * post + /blog list + /privacy. Each generated file has:
 *  • Per-route <title>, <meta name=description>, <link rel=canonical>
 *  • Full Open Graph / Twitter / JSON-LD blocks
 *  • Full article body inside <div id="root"> so crawlers see content even
 *    without executing JS
 *
 * When a real user hits the URL, React hydrates over the static content.
 * The static markup is intentionally lightweight (no className soup) so
 * crawlers parse it cleanly.
 *
 * Run after vite build:
 *   pnpm build  →  vite build && tsx scripts/prerender.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTS, type BlogPost, type Section } from '../src/data/blog-posts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://flicksee.ru';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Plain-HTML mirrors of the React SectionRenderer. Crawler-readable.
function renderSection(s: Section): string {
  switch (s.kind) {
    case 'heading':
      return `<h2>${escapeHtml(s.text)}</h2>`;
    case 'paragraph':
      return `<p>${escapeHtml(s.text)}</p>`;
    case 'list':
      return `<ul>${s.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
    case 'quote':
      return `<blockquote>${escapeHtml(s.text)}</blockquote>`;
    case 'cta':
      return `<p><a href="${escapeHtml(s.to)}">${escapeHtml(s.text)}</a></p>`;
    case 'movieList':
      return `<ol class="movie-picks">${s.items
        .map(
          (m) =>
            `<li><h3>${escapeHtml(m.title)} (${m.year})</h3><p>${escapeHtml(m.why)}</p></li>`,
        )
        .join('')}</ol>`;
  }
}

function articleBody(post: BlogPost): string {
  return `<article>
  <nav aria-label="Breadcrumb"><a href="/">Flicksee</a> / <a href="/blog">Блог</a> / <span>${escapeHtml(post.title)}</span></nav>
  <h1>${escapeHtml(post.title)}</h1>
  <p class="lead">${escapeHtml(post.description)}</p>
  <p class="meta"><time datetime="${post.date}">${post.date}</time> · ${post.readingMinutes} мин чтения</p>
  ${post.sections.map(renderSection).join('\n  ')}
</article>`;
}

function articleHead(post: BlogPost): string {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const ogImage = `${SITE_URL}/og-default.jpg`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Flicksee' },
    publisher: {
      '@type': 'Organization',
      name: 'Flicksee',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: ogImage,
    keywords: post.keywords.join(', '),
    inLanguage: 'ru-RU',
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flicksee', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Блог', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };
  return [
    `<title>${escapeHtml(post.title)} — Flicksee</title>`,
    `<meta name="description" content="${escapeHtml(post.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(post.keywords.join(', '))}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${escapeHtml(post.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(post.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:site_name" content="Flicksee" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="article:published_time" content="${post.date}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(post.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(post.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    `<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`,
  ].join('\n    ');
}

function blogListBody(): string {
  return `<article>
  <h1>Блог</h1>
  <p>Как выбирать фильмы быстрее, что смотреть с друзьями и подборки кино под настроение и под жанры.</p>
  <ul class="post-list">
    ${POSTS.map(
      (p) =>
        `<li><a href="/blog/${p.slug}"><h2>${escapeHtml(p.title)}</h2><p>${escapeHtml(p.description)}</p><time>${p.date}</time> · ${p.readingMinutes} мин</a></li>`,
    ).join('\n    ')}
  </ul>
</article>`;
}

function privacyBody(): string {
  return `<article>
  <h1>Политика конфиденциальности</h1>
  <p>Настоящая Политика регулирует обработку персональных данных пользователей сайта flicksee.ru
  в соответствии с Федеральным законом № 152-ФЗ. Полная версия загружается при заходе на страницу.</p>
  <p>По вопросам обработки персональных данных — <a href="https://t.me/Flicksee_bot">@Flicksee_bot</a>.</p>
</article>`;
}

// Inject custom head tags + body content into the SPA template.
// IMPORTANT: index.html has multi-line meta tags like
//   <meta\n      name="description"\n      content="..."\n    />
// so the regex MUST use [\s\S] (or /s flag) to span newlines — [^>] alone
// stops at the first newline.
function customize(template: string, headBlock: string, bodyContent: string): string {
  let html = template.replace(/<title>[\s\S]*?<\/title>/, '');
  html = html
    .replace(/<meta\s+name="description"[\s\S]*?\/>/g, '')
    .replace(/<meta\s+name="keywords"[\s\S]*?\/>/g, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/g, '')
    .replace(/<meta\s+property="og:[^"]*"[\s\S]*?\/>/g, '')
    .replace(/<meta\s+name="twitter:[^"]*"[\s\S]*?\/>/g, '');

  // Inject our head block right before </head>
  html = html.replace('</head>', `    ${headBlock}\n  </head>`);

  // Inject body content into #root so crawlers see it. React will hydrate
  // over this. The replace is exact-match on the empty root div the Vite
  // build produces.
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${bodyContent}</div>`,
  );

  return html;
}

async function prerender(routePath: string, headBlock: string, bodyContent: string) {
  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf-8');
  const html = customize(template, headBlock, bodyContent);
  const targetDir = path.join(DIST, routePath);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, 'index.html'), html, 'utf-8');
  console.log(`  ✓ /${routePath}`);
}

async function main() {
  console.log('Prerendering blog routes…');

  // Each post
  for (const post of POSTS) {
    await prerender(`blog/${post.slug}`, articleHead(post), articleBody(post));
  }

  // Blog list
  const listHead = [
    `<title>Блог Flicksee — как выбирать фильмы быстрее</title>`,
    `<meta name="description" content="Гайды по выбору фильмов: как выбрать кино на вечер, что смотреть с друзьями, лучшие фильмы под настроение. Практичные подборки и обзоры от Flicksee." />`,
    `<link rel="canonical" href="${SITE_URL}/blog" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="Блог Flicksee" />`,
    `<meta property="og:url" content="${SITE_URL}/blog" />`,
    `<meta property="og:image" content="${SITE_URL}/og-default.jpg" />`,
  ].join('\n    ');
  await prerender('blog', listHead, blogListBody());

  // Privacy
  const privacyHead = [
    `<title>Политика конфиденциальности — Flicksee</title>`,
    `<meta name="description" content="Политика конфиденциальности сайта flicksee.ru: какие данные собираем, цели обработки, права пользователя, cookies. По 152-ФЗ." />`,
    `<link rel="canonical" href="${SITE_URL}/privacy" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="Политика конфиденциальности — Flicksee" />`,
    `<meta property="og:url" content="${SITE_URL}/privacy" />`,
    `<meta property="og:image" content="${SITE_URL}/og-default.jpg" />`,
  ].join('\n    ');
  await prerender('privacy', privacyHead, privacyBody());

  console.log(`Prerendered ${POSTS.length + 2} routes.`);
}

await main();
