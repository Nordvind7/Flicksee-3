import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookIcon, ChevronLeftIcon } from '../components/icons';

// Static MVP content. Move to CMS / MDX / API later.
interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
  body: string[];
}

const POSTS: BlogPost[] = [
  {
    slug: 'kak-vybrat-film-na-vecher',
    title: 'Как выбрать фильм на вечер за 3 минуты',
    description:
      'Простая методика: фильтры → 10 трейлеров → решение. Без бесконечного скролла Netflix.',
    date: '2026-06-22',
    readingMinutes: 4,
    body: [
      'Каждый вечер та же история: открыл стриминг, листал час, выбрал «то же что и в прошлый раз» или вообще закрыл. Дело не в недостатке контента — в избытке.',
      'Flicksee решает это через свайп-механику: 30 секунд трейлера + один тап. Мозг успевает почувствовать «зайдёт / не зайдёт» по голосу актёра, музыке и цвету картинки быстрее, чем по описанию.',
      'Совет: ставь фильтр по жанру перед сессией. Не «открыто всё», а «сегодня только триллер». 10 свайпов — и watchlist готов.',
    ],
  },
  {
    slug: 'pochemu-treylery-vazhnee-opisaniy',
    title: 'Почему трейлеры решают лучше описаний',
    description:
      'Текстовый синопсис — это маркетинг. Трейлер — это тон. Разбираем, на что обращать внимание.',
    date: '2026-06-15',
    readingMinutes: 5,
    body: [
      'Синопсис пишет копирайтер так, чтобы продать. Трейлер монтирует команда, которая работает с интонацией, ритмом и музыкой. Это разные источники сигнала.',
      'Когда смотришь трейлер, оценивай: темп монтажа, цветокор, какой персонаж в кадре дольше всего, какая музыка под финальной фразой. Это и есть тон фильма.',
      'Описание в 80% случаев врёт о тоне. «Драма» бывает как тяжёлой, так и лёгкой. Трейлер показывает правду за 30 секунд.',
    ],
  },
];

const ListView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-ink-900 text-ink-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-ink-200 hover:text-white transition-colors"
          >
            <ChevronLeftIcon />
            <span className="text-sm">На главную</span>
          </button>
          <div className="flex items-center gap-2 text-ink-50">
            <BookIcon />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Блог</h1>
          </div>
          <div className="w-16" />
        </div>

        <p className="text-ink-200 text-base md:text-lg mb-8 max-w-2xl">
          Как выбирать фильмы быстрее, что смотреть с друзьями и почему свайп —
          точнее листания.
        </p>

        <div className="flex flex-col gap-3">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block bg-ink-700/70 hover:bg-ink-600 ring-1 ring-white/5 hover:ring-white/10 rounded-2xl p-5 transition-all"
            >
              <h2 className="text-lg md:text-xl font-bold text-ink-50 group-hover:text-white mb-1">
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
    </div>
  );
};

const PostView: React.FC<{ slug: string }> = ({ slug }) => {
  const navigate = useNavigate();
  const post = POSTS.find((p) => p.slug === slug);

  // Update <title> for SEO. Proper meta-tags would need react-helmet or SSR,
  // out of scope for the scaffold — document.title is the minimum.
  useEffect(() => {
    const original = document.title;
    if (post) document.title = `${post.title} — Flicksee`;
    return () => {
      document.title = original;
    };
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-ink-900 text-ink-50 p-6 flex flex-col items-center justify-center">
        <p className="text-ink-200 mb-4">Статья не найдена.</p>
        <button onClick={() => navigate('/blog')} className="text-accent hover:underline">
          Вернуться в блог
        </button>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-ink-900 text-ink-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-1 text-ink-200 hover:text-white transition-colors mb-6"
        >
          <ChevronLeftIcon />
          <span className="text-sm">Все статьи</span>
        </button>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-3">
          {post.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-ink-300 mb-8">
          <time>{post.date}</time>
          <span>·</span>
          <span>{post.readingMinutes} мин чтения</span>
        </div>
        <div className="prose-flicksee">
          {post.body.map((para, i) => (
            <p key={i} className="text-ink-100 text-base md:text-lg leading-relaxed mb-5">
              {para}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
};

const BlogPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  return slug ? <PostView slug={slug} /> : <ListView />;
};

export default BlogPage;
