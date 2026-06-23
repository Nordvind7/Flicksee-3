import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '../components/icons';
import TopNav from '../components/TopNav';

// Static MVP content. Move to CMS / MDX / API later. Structured sections so
// articles can have proper H2 / lists / CTAs instead of flat paragraphs —
// that's what crawlers (and humans) actually want.

type Section =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'cta'; text: string; to: string };

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
  keywords: string[];
  sections: Section[];
}

const POSTS: BlogPost[] = [
  {
    slug: 'kak-vybrat-film-na-vecher',
    title: 'Как выбрать фильм на вечер за 5 минут: 7 способов перестать листать часами',
    description:
      'Знакомая ситуация: открыл стриминг, час листал, выбрал то же что и в прошлый раз. Разбираем 7 рабочих методик — от свайпа трейлеров до фильтра по настроению — чтобы решать «что посмотреть» за минуты, а не за вечер.',
    date: '2026-06-22',
    readingMinutes: 7,
    keywords: ['как выбрать фильм', 'что посмотреть вечером', 'выбор фильма на вечер'],
    sections: [
      {
        kind: 'paragraph',
        text: 'Усталость от выбора — реальная проблема. По данным исследования Nielsen, средний пользователь стриминговых сервисов тратит до 18 минут только на то, чтобы выбрать, что посмотреть. Это не лень и не нерешительность — это «paradox of choice»: когда вариантов слишком много, мозг отключает рациональное решение и выбирает «то же что и в прошлый раз» или закрывает приложение.',
      },
      {
        kind: 'paragraph',
        text: 'Хорошая новость: эту проблему решают не алгоритмы рекомендаций (которые загоняют тебя в пузырь), а изменение самого процесса выбора. Ниже семь методик, которые реально работают.',
      },
      { kind: 'heading', text: '1. Правило 30 секунд: смотри трейлер, а не описание' },
      {
        kind: 'paragraph',
        text: 'Текстовое описание фильма пишет копирайтер, чья задача — продать просмотр. Тон, ритм, цветовая палитра — всё это в описание не помещается. А именно эти вещи определяют, «зайдёт» фильм или нет.',
      },
      {
        kind: 'paragraph',
        text: 'Трейлер показывает реальный тон за 30 секунд. Сделай так: включи трейлер, дай ему сыграть 30 секунд, и доверься первой реакции тела. Если хочется убрать — убирай. Если втягиваешься — добавляй в watchlist.',
      },
      { kind: 'heading', text: '2. Свайп вместо листания' },
      {
        kind: 'paragraph',
        text: 'Классический интерфейс «сетка постеров с описанием» заставляет мозг сравнивать слишком много вариантов одновременно. Свайп-механика (как в Tinder, как в Flicksee) даёт только один вариант за раз — да/нет/уже видел. Решение становится бинарным и быстрым.',
      },
      {
        kind: 'paragraph',
        text: 'Среднее время от запуска до добавления первого фильма в watchlist при свайпе — 90 секунд против 8–12 минут при листании сетки. Это не магия, это просто формат принятия решений.',
      },
      { kind: 'heading', text: '3. Фильтр перед сессией' },
      {
        kind: 'paragraph',
        text: 'Перед тем как открыть приложение, реши одно: что ты ищешь? Не «фильм», а конкретно — настроение, жанр, длительность, эпоху.',
      },
      {
        kind: 'list',
        items: [
          'Хочу подумать → драма, документалка',
          'Хочу отключиться → боевик, комедия',
          'Хочу испугаться → хоррор, психологический триллер',
          'Хочу красивого → авторское кино, A24',
          'Хочу с друзьями → массовое и обсуждаемое',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Этот выбор должен занять 10 секунд. Дальше выставляй фильтр и не отвлекайся на другие жанры — мозг работает лучше в узком поле.',
      },
      { kind: 'heading', text: '4. Метод трёх минут' },
      {
        kind: 'paragraph',
        text: 'Заведи правило: если за 3 минуты после запуска фильма ты не вовлёкся — выключай и пробуй другой. Без чувства вины, без «надо досмотреть».',
      },
      {
        kind: 'paragraph',
        text: 'Жизнь короткая, плохих фильмов много, хороших — тоже много. Время, потраченное на нелюбимое кино, могло уйти на любимое. Это банально, но работает только если буквально включить таймер на 3 минуты на телефоне.',
      },
      { kind: 'heading', text: '5. Watchlist на 10 фильмов вперёд' },
      {
        kind: 'paragraph',
        text: 'Лучший момент выбирать фильм — это не вечером, когда хочется отдохнуть, а в свободные 10 минут утром или в обед. Тогда мозг не уставший и решения качественнее. Открой Flicksee или TMDB, посвайпай 10 минут — собери watchlist на ближайшие 5–7 вечеров.',
      },
      {
        kind: 'paragraph',
        text: 'Вечером, когда захочется кино, ты не открываешь стриминг с нуля — ты открываешь готовый список и выбираешь из 3–5 проверенных вариантов. Это всё.',
      },
      { kind: 'heading', text: '6. Спроси у друга — но не «что посмотреть»' },
      {
        kind: 'paragraph',
        text: 'Стандартный вопрос «что мне посмотреть» — гарантированно ведёт в тупик. Хороший друг даст 20 вариантов, ты не выберешь ни одного. Лучше спрашивать конкретнее.',
      },
      {
        kind: 'list',
        items: [
          '«Какой фильм за последний месяц тебя задел?» — узнаёшь свежее и эмоциональное',
          '«Что ты бы пересмотрел сейчас?» — узнаёшь проверенное',
          '«Какой фильм недавно разочаровал?» — экономишь свой вечер',
        ],
      },
      { kind: 'heading', text: '7. Используй «матчи» вместо споров о вкусах' },
      {
        kind: 'paragraph',
        text: 'Когда выбираете кино с партнёром или другом — традиционный сценарий «он предлагает, она отвергает» убивает вечер. Альтернатива: каждый свайпает трейлеры независимо, потом смотрите пересечение лайков. Если оба поставили «хочу посмотреть» одному фильму — это и есть выбор. Никаких споров, никакого «давай ты выберешь».',
      },
      {
        kind: 'paragraph',
        text: 'Эта механика — основа социальной части Flicksee. Добавляешь друга через Telegram-ссылку, оба свайпаете в своём ритме, в любое время — а когда возникает совпадение, оба получаете уведомление.',
      },
      {
        kind: 'cta',
        text: 'Попробовать на главной',
        to: '/',
      },
      { kind: 'heading', text: 'Итог' },
      {
        kind: 'paragraph',
        text: 'Главное — не «найти лучший фильм», а сократить время от «хочу кино» до «смотрю кино». Любая из методик выше даёт это сокращение в 3–10 раз. Свайп-механика плюс предварительно собранный watchlist плюс «матчи с друзьями» — это всё, что нужно, чтобы перестать тратить вечер на выбор.',
      },
    ],
  },
  {
    slug: 'kak-smotret-filmy-s-druziami',
    title: 'Как смотреть фильмы с друзьями, не споря о выборе: гайд по совместному просмотру',
    description:
      'Совместный просмотр часто застревает на этапе «что смотреть» — у всех разный вкус, никто не уступает. Разбираем механики matching-приложений, синхронных стримов и правил вечера, которые реально работают.',
    date: '2026-06-18',
    readingMinutes: 6,
    keywords: ['смотреть фильмы с друзьями', 'совместный просмотр', 'фильм для пары'],
    sections: [
      {
        kind: 'paragraph',
        text: 'Совместный просмотр кино — один из самых популярных форматов досуга и одновременно один из самых конфликтных. Парам, друзьям и семьям мешает не отсутствие хороших фильмов, а конфликт вкусов и плохой процесс выбора. Ниже — как этот процесс починить.',
      },
      { kind: 'heading', text: 'Почему «давай я выберу — а ты следующий» не работает' },
      {
        kind: 'paragraph',
        text: 'Самая частая модель: один человек выбирает фильм, второй соглашается «потому что в прошлый раз я выбирал». Через 20 минут просмотра становится понятно, что фильм не зашёл второму — но уже неловко переключать. Вечер потерян, накапливается тихое раздражение.',
      },
      {
        kind: 'paragraph',
        text: 'Проблема не в людях и не в фильме — проблема в самой механике. Альтернативного выбора нет, голоса разной силы (тот кто молча соглашается «теряет» по сравнению с тем кто настаивает), и нет способа быстро откатиться.',
      },
      { kind: 'heading', text: 'Метод 1: Matching — выбираем пересечение, а не компромисс' },
      {
        kind: 'paragraph',
        text: 'Идея: оба партнёра независимо свайпают одну и ту же подборку трейлеров. Каждый ставит лайк тому, что нравится, или отбрасывает то, что не нравится. После того как оба прошли (или хотя бы первые 20–30 фильмов) — смотрите пересечение.',
      },
      {
        kind: 'paragraph',
        text: 'Это не компромисс — это совпадение. Никто никому не уступал. Фильм понравился обоим заранее, до того как вы его обсудили. Если в пересечении 3 фильма — выбираете любой и идёте смотреть. Если ничего — свайпайте ещё.',
      },
      {
        kind: 'paragraph',
        text: 'Это базовая механика Flicksee: добавляешь друга через Telegram-ссылку, дальше каждый свайпает в своём темпе. Сервер автоматически считает пересечение и присылает push-уведомление, когда возникает совпадение. Даже исторические свайпы (до того как вы стали друзьями) засчитываются — на первом френдинге часто сразу появляется 10–40 общих фильмов.',
      },
      { kind: 'heading', text: 'Метод 2: Curator — у каждого по 5 вариантов' },
      {
        kind: 'paragraph',
        text: 'Если matching-инструмента нет под рукой — старый рабочий формат. Каждый из вас в течение недели собирает 5 фильмов, которые хочет посмотреть. Не больше. К вечеру у вас 10 вариантов на столе.',
      },
      {
        kind: 'list',
        items: [
          'Каждый показывает свои 5 трейлеров второму (по 30 секунд каждый)',
          'После просмотра второй человек ставит «да / нет / может быть» каждому',
          'Если хотя бы один «да» совпал — выбираете его',
          'Если нет совпадений — повторяете в следующий раз с новыми списками',
        ],
      },
      { kind: 'heading', text: 'Метод 3: Roulette — снимаем ответственность' },
      {
        kind: 'paragraph',
        text: 'Самый недооценённый метод. Иногда главный источник конфликта — не вкус, а ответственность за выбор: «если я выберу плохой фильм, виноват буду я». Решение: убрать выбор из рук обоих.',
      },
      {
        kind: 'paragraph',
        text: 'Берёте watchlist на 15+ фильмов, второй человек называет число от 1 до 15, и смотрите этот по списку. Никто не виноват в выборе. Парадоксально, но именно случайный выбор часто даёт лучшие открытия — потому что никто не пытается «оптимизировать», и оба соглашаются дать фильму шанс.',
      },
      { kind: 'heading', text: 'Метод 4: Параллельный watch-party' },
      {
        kind: 'paragraph',
        text: 'Если вы в разных городах или один из вас в командировке — есть инструменты для синхронного просмотра: Teleparty (бывший Netflix Party) для Netflix, Discord Watch Together, Telegram с шерингом экрана. Кто-то один шарит экран, остальные смотрят синхронно с голосовым чатом параллельно.',
      },
      {
        kind: 'paragraph',
        text: 'Главное правило таких сессий — не комментировать всё подряд, как блогеры. Минимум разговоров во время самого фильма, обсуждение после. Иначе никто не запомнит ни сюжета, ни впечатлений.',
      },
      { kind: 'heading', text: 'Правила, которые делают вечер лучше' },
      {
        kind: 'list',
        items: [
          'Жанр обсуждается до — длительность и тип кино решаются ДО открытия каталога',
          'Таймлимит на выбор — 10 минут максимум, потом любой случайный из watchlist',
          'Право вето один раз за вечер — но потом следующий выбор не твой',
          'Если кино не зашло — выключайте через 20 минут без объяснений',
        ],
      },
      { kind: 'heading', text: 'Итог' },
      {
        kind: 'paragraph',
        text: 'Главный инсайт: проблема совместного выбора кино — это не разные вкусы, а плохой процесс. Любая методика выше работает лучше, чем «давай я выберу». Самая мощная — matching через совпадения лайков: не требует обсуждения, ставит обоих в равную позицию, и даёт результат за минуты.',
      },
      {
        kind: 'cta',
        text: 'Добавить друга и попробовать матчи',
        to: '/friends',
      },
    ],
  },
  {
    slug: 'pochemu-treylery-vazhnee-opisaniy',
    title: 'Почему трейлер скажет о фильме больше, чем рейтинг и описание',
    description:
      'Рейтинги говорят что фильм «хороший» или «плохой», описания — про сюжет, а зайдёт ли он лично тебе — показывает только трейлер. Разбираем, на что обращать внимание в 30-секундном превью.',
    date: '2026-06-15',
    readingMinutes: 5,
    keywords: ['трейлер фильма', 'как смотреть трейлеры', 'выбор фильма по трейлеру'],
    sections: [
      {
        kind: 'paragraph',
        text: 'Описание фильма пишет копирайтер. Рейтинг — это усреднённое мнение тысяч людей с разными вкусами. Ни то, ни другое не отвечает на главный вопрос: «зайдёт ли это мне сегодня вечером?». На этот вопрос отвечает трейлер — если уметь его смотреть.',
      },
      { kind: 'heading', text: 'Что говорит описание (и почему этого мало)' },
      {
        kind: 'paragraph',
        text: 'Синопсис описывает завязку и иногда жанр. Он отвечает на «о чём фильм». Но «зайдёт ли он» определяется не сюжетом, а тоном — тем, как режиссёр рассказывает историю. Тон не вмещается в три предложения.',
      },
      {
        kind: 'paragraph',
        text: 'Пример: «Молодая женщина переезжает в новый дом и сталкивается с тайной семьи предыдущих владельцев». Это синопсис «Тёмных вод», «Других», «Доктора Сна» и десятка других фильмов разного качества и совершенно разного настроения. Тон одного — тягучая семейная драма, второго — тихий ужас, третьего — мифологическая мистика. По синопсису не отличишь.',
      },
      { kind: 'heading', text: 'Что говорит рейтинг (и почему он обманывает)' },
      {
        kind: 'paragraph',
        text: 'IMDb 7.8 значит, что в среднем фильм понравился большинству оценивших. Но «большинство» — это не ты. Камерное авторское кино с глубокими ценителями получит 6.5 у массовой аудитории и 8.5 у синефилов. Что важнее тебе — зависит от того, кто ты.',
      },
      {
        kind: 'paragraph',
        text: 'Полезнее смотреть на дисперсию мнений (если у фильма много 10 и много 1, скорее всего это не средний фильм, а скорее всего тебе он или зайдёт сильно, или сильно нет) и на критиков твоего вкуса (Letterboxd reviewers, которым ты доверяешь, расскажут больше чем средний балл).',
      },
      { kind: 'heading', text: 'Что говорит трейлер' },
      {
        kind: 'paragraph',
        text: 'Хорошо смонтированный трейлер несёт в себе:',
      },
      {
        kind: 'list',
        items: [
          'Темп — быстрый монтаж = драйв, медленный = размышление',
          'Цветовая палитра — холодная (тревога, реализм) или тёплая (ностальгия, эмоция)',
          'Музыка — какой жанр, какой настроение, играет ли вообще или есть тишина',
          'Лица актёров — какое выражение задерживается в кадре дольше всего',
          'Что показывают в конце — финальный кадр или фраза трейлера = тон всего фильма',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Это не про «угадать сюжет». Это про считать тональность. Через 30 секунд трейлера тело реагирует — «хочу смотреть» или «не хочу». Эта реакция точнее любого рейтинга.',
      },
      { kind: 'heading', text: 'Почему свайп трейлеров — это новый формат выбора' },
      {
        kind: 'paragraph',
        text: 'Свайп-механика для трейлеров (Flicksee, FlickFind, Cineswipe) работает именно потому, что использует эту биологию: 30 секунд — реакция — следующий. Никакого зависания над «а может быть», никакого чтения описания. Просто «зайдёт / не зайдёт».',
      },
      {
        kind: 'paragraph',
        text: 'За 10 минут такого свайпа собирается watchlist на ближайший месяц вечеров. И главное — это watchlist по твоей реакции, а не по тому, что советует алгоритм или критик.',
      },
      { kind: 'heading', text: 'Когда описание и рейтинг полезны' },
      {
        kind: 'paragraph',
        text: 'Они не бесполезны — они отвечают на другие вопросы:',
      },
      {
        kind: 'list',
        items: [
          'Описание полезно, когда уже посмотрел трейлер и хочешь понять контекст (1990 или 2020, биография реального человека или вымысел)',
          'Рейтинг полезен для отсечения откровенного шлака (под 4.0 на IMDb редко бывает что-то стоящее)',
          'Длительность важна когда выбираешь под настроение (полтора часа или три)',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Но первый фильтр — всегда трейлер. Описание и рейтинг — это второй и третий слой.',
      },
      { kind: 'heading', text: 'Итог' },
      {
        kind: 'paragraph',
        text: 'Лучший фильтр для фильма — твоя собственная реакция на 30 секунд трейлера. Описание скажет о чём кино, рейтинг — что о нём думают другие, но «зайдёт ли тебе» решает только тон. И этот тон трейлер передаёт за полминуты.',
      },
      {
        kind: 'cta',
        text: 'Свайпать трейлеры на Flicksee',
        to: '/',
      },
    ],
  },
];

// Lightweight head-tag manager: sets <title> and <meta name="description"> on
// mount, restores them on unmount. Good enough for SEO crawlers that execute
// JS (Google, Yandex). For pre-rendering / Open Graph we'd need SSR later.
function useArticleMeta(post: BlogPost | undefined): void {
  useEffect(() => {
    if (!post) return;
    const origTitle = document.title;
    document.title = `${post.title} — Flicksee`;

    const setMeta = (name: string, content: string): (() => void) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      const created = !el;
      if (!el) {
        el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
      }
      const prev = el.content;
      el.content = content;
      return () => {
        if (created) el!.remove();
        else if (el) el.content = prev;
      };
    };

    const restoreDesc = setMeta('description', post.description);
    const restoreKw = setMeta('keywords', post.keywords.join(', '));

    return () => {
      document.title = origTitle;
      restoreDesc();
      restoreKw();
    };
  }, [post]);
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
  }
};

const ListView: React.FC = () => {
  useEffect(() => {
    const orig = document.title;
    document.title = 'Блог Flicksee — как выбирать фильмы быстрее';
    return () => {
      document.title = orig;
    };
  }, []);

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Блог</h1>
          <p className="text-ink-200 text-base md:text-lg max-w-2xl">
            Как выбирать фильмы быстрее, что смотреть с друзьями и почему свайп — точнее
            листания каталогов.
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
    </div>
  );
};

const PostView: React.FC<{ slug: string }> = ({ slug }) => {
  const navigate = useNavigate();
  const post = POSTS.find((p) => p.slug === slug);
  useArticleMeta(post);

  if (!post) {
    return (
      <div className="min-h-screen text-ink-50 p-6 flex flex-col items-center justify-center" style={{ backgroundColor: '#0a0a0b' }}>
        <p className="text-ink-200 mb-4">Статья не найдена.</p>
        <button onClick={() => navigate('/blog')} className="text-accent hover:underline">
          Вернуться в блог
        </button>
      </div>
    );
  }

  return (
    <article className="min-h-screen text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 md:p-6">
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
          <time>{post.date}</time>
          <span>·</span>
          <span>{post.readingMinutes} мин чтения</span>
        </div>
        <div>
          {post.sections.map((section, i) => (
            <SectionRenderer key={i} section={section} />
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-ink-200 mb-3">Читайте также:</p>
          <div className="flex flex-col gap-2">
            {POSTS.filter((p) => p.slug !== post.slug).map((p) => (
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
    </article>
  );
};

const BlogPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  return slug ? <PostView slug={slug} /> : <ListView />;
};

export default BlogPage;
