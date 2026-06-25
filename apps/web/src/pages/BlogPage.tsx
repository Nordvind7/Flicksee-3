import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '../components/icons';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import MoviePickCard from '../components/MoviePickCard';
import { POSTS, type BlogPost, type Section } from '../data/blog-posts';

// Static MVP content. Each post is hand-written, structured for SEO (H2
// stack, internal links, optional movie-pick lists with TMDB posters).


const SITE_URL = 'https://flicksee.ru';

// ──────────────── SEO head-manager: title + description + OG + Twitter + JSON-LD
function setHeadTag(selector: string, attrs: Record<string, string>): () => void {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  const created = !el;
  if (!el) {
    const tag = selector.startsWith('meta')
      ? document.createElement('meta')
      : document.createElement('link');
    el = tag;
    document.head.appendChild(el);
  }
  const prev: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(attrs)) {
    prev[k] = el.getAttribute(k);
    el.setAttribute(k, v);
  }
  return () => {
    if (created) el!.remove();
    else for (const [k, v] of Object.entries(prev)) {
      if (v === null) el!.removeAttribute(k);
      else el!.setAttribute(k, v);
    }
  };
}

function setJsonLd(id: string, data: unknown): () => void {
  const existing = document.head.querySelector(`script[data-jsonld="${id}"]`) as HTMLScriptElement | null;
  const created = !existing;
  const el = existing ?? document.createElement('script');
  el.type = 'application/ld+json';
  el.setAttribute('data-jsonld', id);
  el.textContent = JSON.stringify(data);
  if (created) document.head.appendChild(el);
  return () => {
    if (created) el.remove();
  };
}

function useArticleMeta(post: BlogPost | undefined, posterPath?: string | null): void {
  useEffect(() => {
    if (!post) return;
    const url = `${SITE_URL}/blog/${post.slug}`;
    const ogImage = posterPath
      ? `https://image.tmdb.org/t/p/w780${posterPath}`
      : `${SITE_URL}/og-default.jpg`;

    const origTitle = document.title;
    document.title = `${post.title} — Flicksee`;

    const undos: Array<() => void> = [
      setHeadTag('meta[name="description"]', { name: 'description', content: post.description }),
      setHeadTag('meta[name="keywords"]', { name: 'keywords', content: post.keywords.join(', ') }),
      setHeadTag('link[rel="canonical"]', { rel: 'canonical', href: url }),
      // Open Graph (Facebook, Telegram, VK, LinkedIn)
      setHeadTag('meta[property="og:type"]', { property: 'og:type', content: 'article' }),
      setHeadTag('meta[property="og:title"]', { property: 'og:title', content: post.title }),
      setHeadTag('meta[property="og:description"]', { property: 'og:description', content: post.description }),
      setHeadTag('meta[property="og:url"]', { property: 'og:url', content: url }),
      setHeadTag('meta[property="og:image"]', { property: 'og:image', content: ogImage }),
      setHeadTag('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Flicksee' }),
      setHeadTag('meta[property="og:locale"]', { property: 'og:locale', content: 'ru_RU' }),
      setHeadTag('meta[property="article:published_time"]', { property: 'article:published_time', content: post.date }),
      // Twitter
      setHeadTag('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' }),
      setHeadTag('meta[name="twitter:title"]', { name: 'twitter:title', content: post.title }),
      setHeadTag('meta[name="twitter:description"]', { name: 'twitter:description', content: post.description }),
      setHeadTag('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage }),
      // JSON-LD Article schema
      setJsonLd('article', {
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
      }),
      // JSON-LD Breadcrumb — gives Google a rich-snippet breadcrumb in SERP,
      // higher CTR than plain blue URL.
      setJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Flicksee', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Блог', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      }),
    ];

    return () => {
      document.title = origTitle;
      undos.forEach((u) => u());
    };
  }, [post, posterPath]);
}

// Set sane defaults on /blog list and reset article meta on home.
function useListMeta(): void {
  useEffect(() => {
    const orig = document.title;
    document.title = 'Блог Flicksee — как выбирать фильмы быстрее';
    const undos = [
      setHeadTag('meta[name="description"]', {
        name: 'description',
        content:
          'Гайды по выбору фильмов: как выбрать кино на вечер, что посмотреть с друзьями, лучшие фильмы под настроение. Практичные подборки и обзоры от Flicksee.',
      }),
      setHeadTag('link[rel="canonical"]', { rel: 'canonical', href: `${SITE_URL}/blog` }),
      setHeadTag('meta[property="og:type"]', { property: 'og:type', content: 'website' }),
      setHeadTag('meta[property="og:title"]', { property: 'og:title', content: 'Блог Flicksee' }),
      setHeadTag('meta[property="og:url"]', { property: 'og:url', content: `${SITE_URL}/blog` }),
      setJsonLd('blog', {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Блог Flicksee',
        url: `${SITE_URL}/blog`,
        inLanguage: 'ru-RU',
        publisher: { '@type': 'Organization', name: 'Flicksee' },
        blogPost: POSTS.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          datePublished: p.date,
          url: `${SITE_URL}/blog/${p.slug}`,
        })),
      }),
    ];
    return () => {
      document.title = orig;
      undos.forEach((u) => u());
    };
  }, []);
}

const SectionRenderer: React.FC<{ section: Section }> = ({ section }) => {
  switch (section.kind) {
    case 'heading':
      return (
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-ink-50 mt-10 mb-4">
          {section.text}
        </h2>
      );
    case 'paragraph':
      return (
        <p className="text-ink-100 text-base md:text-lg leading-relaxed mb-5">{section.text}</p>
      );
    case 'list':
      return (
        <ul className="mb-6 space-y-2 pl-1">
          {section.items.map((item, i) => (
            <li key={i} className="text-ink-100 text-base md:text-lg leading-relaxed flex gap-3">
              <span className="text-accent shrink-0 mt-2" style={{ color: '#E50914' }}>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <blockquote
          className="my-6 border-l-4 pl-4 italic text-ink-100 text-lg"
          style={{ borderColor: '#E50914' }}
        >
          {section.text}
        </blockquote>
      );
    case 'cta':
      return (
        <div className="my-8 flex justify-center">
          <Link
            to={section.to}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold px-6 py-3 rounded-full shadow-glow-accent transition-all hover:scale-[1.03]"
            style={{ backgroundColor: '#E50914' }}
          >
            {section.text}
            <span>→</span>
          </Link>
        </div>
      );
    case 'movieList':
      return (
        <div className="my-6 flex flex-col gap-3">
          {section.items.map((m, i) => (
            <MoviePickCard key={`${m.contentType}-${m.tmdbId}`} pick={m} index={i} />
          ))}
        </div>
      );
  }
};

const ListView: React.FC = () => {
  useListMeta();

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Блог</h1>
          <p className="text-ink-200 text-base md:text-lg max-w-2xl">
            Как выбирать фильмы быстрее, что смотреть с друзьями и подборки кино под
            настроение и под жанры.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block ring-1 ring-white/5 hover:ring-white/10 rounded-2xl p-5 transition-all"
              style={{ backgroundColor: '#16161a' }}
            >
              <h2 className="text-lg md:text-xl font-bold text-ink-50 group-hover:text-white mb-2 leading-tight">
                {post.title}
              </h2>
              <p className="text-ink-200 text-sm leading-relaxed mb-3">{post.description}</p>
              <div className="flex items-center gap-3 text-xs text-ink-300">
                <time>{post.date}</time>
                <span>·</span>
                <span>{post.readingMinutes} мин чтения</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

const PostView: React.FC<{ slug: string }> = ({ slug }) => {
  const navigate = useNavigate();
  const post = POSTS.find((p) => p.slug === slug);

  // Look up hero poster TMDB path for OG image (best-effort).
  const [heroPosterPath, setHeroPosterPath] = React.useState<string | null>(null);
  useEffect(() => {
    if (!post?.heroPosterTmdbId) {
      setHeroPosterPath(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/tmdb/${post.heroPosterType ?? 'movie'}/${post.heroPosterTmdbId}?language=ru-RU`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setHeroPosterPath(d?.poster_path ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [post?.heroPosterTmdbId, post?.heroPosterType]);

  useArticleMeta(post, heroPosterPath);

  if (!post) {
    return (
      <div
        className="min-h-screen text-ink-50 p-6 flex flex-col items-center justify-center"
        style={{ backgroundColor: '#0a0a0b' }}
      >
        <p className="text-ink-200 mb-4">Статья не найдена.</p>
        <button onClick={() => navigate('/blog')} className="text-accent hover:underline">
          Вернуться в блог
        </button>
      </div>
    );
  }

  // Insert an inline registration push after the first section (typically the
  // intro paragraph). Conversion-focused: phrased as a useful tip, not as
  // "register now". Hidden when user already logged in.
  const sectionsWithInlineCTA = post.sections.flatMap((s, i) =>
    i === 1
      ? [
          s,
          { kind: 'inlineCta' as const },
        ]
      : [s],
  );

  return (
    <article className="min-h-screen text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 md:p-6 pb-32">
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-1 text-ink-200 hover:text-white transition-colors mb-6"
        >
          <ChevronLeftIcon />
          <span className="text-sm">Все статьи</span>
        </button>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] mb-4">
          {post.title}
        </h1>
        <p className="text-ink-200 text-base md:text-lg leading-relaxed mb-6">
          {post.description}
        </p>
        <div className="flex items-center gap-3 text-sm text-ink-300 pb-8 mb-8 border-b border-white/5">
          <time dateTime={post.date}>{post.date}</time>
          <span>·</span>
          <span>{post.readingMinutes} мин чтения</span>
        </div>
        <div>
          {sectionsWithInlineCTA.map((section, i) =>
            section.kind === 'inlineCta' ? (
              <InlineRegistrationPush key={`cta-${i}`} />
            ) : (
              <SectionRenderer key={i} section={section} />
            ),
          )}
        </div>

        {/* Breadcrumbs (visible + JSON-LD via setJsonLd in useArticleMeta) */}
        <nav
          className="mt-10 pt-6 border-t border-white/5 text-xs text-ink-300"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link to="/" className="hover:text-white transition-colors">
                Flicksee
              </Link>
            </li>
            <li className="opacity-50">/</li>
            <li>
              <Link to="/blog" className="hover:text-white transition-colors">
                Блог
              </Link>
            </li>
            <li className="opacity-50">/</li>
            <li className="text-ink-100 truncate max-w-[60%]">{post.title}</li>
          </ol>
        </nav>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-sm text-ink-200 mb-3">Читайте также:</p>
          <div className="flex flex-col gap-2">
            {POSTS.filter((p) => p.slug !== post.slug)
              .slice(0, 4)
              .map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="text-ink-50 hover:text-accent transition-colors text-sm font-medium"
                >
                  → {p.title}
                </Link>
              ))}
          </div>
        </div>
      </div>

      <Footer />
      <StickyArticleCta postTitle={post.title} />
    </article>
  );
};

// Sticky bottom CTA on article pages: appears after the user scrolls past
// the fold. Conversion gate from SEO traffic to active session.
const StickyArticleCta: React.FC<{ postTitle: string }> = ({ postTitle }) => {
  const [show, setShow] = React.useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <div
      className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm z-40 rounded-2xl ring-1 ring-white/10 shadow-card-lg backdrop-blur-md"
      style={{ backgroundColor: 'rgba(22, 22, 26, 0.92)' }}
    >
      <div className="p-3 sm:p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-ink-100 font-medium leading-tight">
            Хочешь свайпать эти фильмы прямо сейчас?
          </p>
          <p className="text-[11px] text-ink-300 mt-0.5 leading-tight">
            Без регистрации, можно начать с одного тапа
          </p>
        </div>
        <Link
          to="/"
          className="shrink-0 text-sm font-bold text-white px-4 py-2 rounded-full transition-all hover:scale-[1.04] active:scale-95 whitespace-nowrap"
          style={{
            backgroundColor: '#E50914',
            boxShadow: '0 4px 12px rgba(229, 9, 20, 0.45)',
          }}
          aria-label={`Открыть свайп — ${postTitle}`}
        >
          Свайпать
        </Link>
      </div>
    </div>
  );
};

// Inline conversion block — appears after the first text section of every
// article. Reframes the article as "useful, but the actual product solves
// this faster" without being sleazy.
const InlineRegistrationPush: React.FC = () => (
  <div
    className="my-8 rounded-2xl p-5 ring-1"
    style={{
      backgroundColor: 'rgba(229, 9, 20, 0.06)',
      borderColor: 'rgba(229, 9, 20, 0.2)',
    }}
  >
    <p className="text-ink-50 font-semibold mb-1.5">⚡ Не только подборки</p>
    <p className="text-ink-100 text-sm leading-relaxed mb-3">
      На Flicksee можно свайпать трейлеры этих и тысяч других фильмов: 30 секунд — вердикт,
      следующий. С другом — автоматические матчи через Telegram, без споров о выборе.
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-full transition-all hover:scale-[1.04]"
      style={{ backgroundColor: '#E50914' }}
    >
      Попробовать бесплатно →
    </Link>
  </div>
);

const BlogPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  return slug ? <PostView slug={slug} /> : <ListView />;
};

export default BlogPage;
