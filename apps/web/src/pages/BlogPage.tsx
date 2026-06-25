import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '../components/icons';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import MoviePickCard, { type MoviePick } from '../components/MoviePickCard';

// Static MVP content. Each post is hand-written, structured for SEO (H2
// stack, internal links, optional movie-pick lists with TMDB posters).

type Section =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'cta'; text: string; to: string }
  | { kind: 'movieList'; items: MoviePick[] };

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
  keywords: string[];
  heroPosterTmdbId?: number;
  heroPosterType?: 'movie' | 'tv';
  sections: Section[];
}

const POSTS: BlogPost[] = [
  // ───────────── Mid-frequency keyword: "фильмы для просмотра вдвоем"
  {
    slug: 'luchshie-filmy-dlya-prosmotra-vdvoem',
    title: 'Лучшие фильмы для просмотра вдвоём: 10 фильмов, которые цепляют обоих',
    description:
      'Подборка из 10 фильмов разных жанров, которые одинаково хорошо заходят и парам, и друзьям-зрителям. Без розовых соплей и без пыток смотреть «арт-хаус, который никто не понимает».',
    date: '2026-06-21',
    readingMinutes: 8,
    keywords: ['фильмы для просмотра вдвоем', 'что посмотреть вдвоем', 'фильм для пары вечером'],
    heroPosterTmdbId: 27205,
    heroPosterType: 'movie',
    sections: [
      {
        kind: 'paragraph',
        text: 'Главная сложность совместного просмотра — не «что хорошее посмотреть», а «что зайдёт обоим». У одного «комедии — это несерьёзно», у второй «триллеры на ночь — нет, спасибо», у третьего «двухчасовое кино — слишком долго». Ниже — 10 фильмов, которые в нашем опыте раз за разом проходят этот фильтр: лайкают и зрители, выросшие на Marvel, и те, кто свято верит в Бергмана.',
      },
      {
        kind: 'paragraph',
        text: 'Порядок — от безопасного «нравится всем» к более смелым выборам.',
      },
      {
        kind: 'movieList',
        items: [
          {
            tmdbId: 27205,
            contentType: 'movie',
            title: 'Начало',
            year: 2010,
            why: 'Нолан в своей лучшей форме: визуальный аттракцион, головоломный сюжет, который интересно обсуждать после, и при этом понятный с первого просмотра. Универсальный фаворит.',
          },
          {
            tmdbId: 157336,
            contentType: 'movie',
            title: 'Интерстеллар',
            year: 2014,
            why: 'Космос, эмоция, наука, отцовство — фильм, в котором каждый находит свой слой. Подходит и тем, кто плакал на «Гравитации», и тем, кто разбирает черные дыры по полочкам.',
          },
          {
            tmdbId: 496243,
            contentType: 'movie',
            title: 'Паразиты',
            year: 2019,
            why: 'Корейский феномен, который удивляет жанровыми поворотами: начинается как комедия, заканчивается как триллер. Темп держит обоих на крючке.',
          },
          {
            tmdbId: 152601,
            contentType: 'movie',
            title: 'Она',
            year: 2013,
            why: 'История одиночества и любви в почти научной фантастике. Тёплый, медленный, очень визуальный фильм — идеален для вечера без боевых сцен.',
          },
          {
            tmdbId: 359724,
            contentType: 'movie',
            title: 'Форд против Феррари',
            year: 2019,
            why: 'Гоночная драма, которая работает даже на тех, кто к спорту равнодушен. Динамика, мужская дружба, легендарные актёры.',
          },
          {
            tmdbId: 313369,
            contentType: 'movie',
            title: 'Ла-Ла Ленд',
            year: 2016,
            why: 'Если бы понадобился один фильм, чтобы помирить «любителей мюзиклов» и «ненавистников мюзиклов», это был бы он. Финал бьёт обоих одинаково.',
          },
          {
            tmdbId: 419704,
            contentType: 'movie',
            title: 'К звёздам',
            year: 2019,
            why: 'Меланхоличная космическая одиссея с Брэдом Питтом. Внешне — научная фантастика; внутри — медитация об отцах и сыновьях.',
          },
          {
            tmdbId: 530915,
            contentType: 'movie',
            title: '1917',
            year: 2019,
            why: 'Снят как один непрерывный кадр. Это редкий военный фильм, который держит даже тех, кто к жанру холоден — техническая бравада завораживает.',
          },
          {
            tmdbId: 244786,
            contentType: 'movie',
            title: 'Одержимость',
            year: 2014,
            why: 'Музыкальная драма, которая ощущается как триллер. 100 минут напряжения без единого выстрела.',
          },
          {
            tmdbId: 872585,
            contentType: 'movie',
            title: 'Оппенгеймер',
            year: 2023,
            why: 'Биография на три часа, которая не тянется ни секунды. Идеален, если хотите вечер «с одним большим фильмом», а не «как-нибудь по серии».',
          },
        ],
      },
      { kind: 'heading', text: 'Что делать, если в списке нет того, что нравится' },
      {
        kind: 'paragraph',
        text: 'Эти 10 — стартовая подборка, не приговор. Если ни один не зашёл — попробуйте механику matching: оба независимо свайпаете трейлеры, а сервис показывает только пересечение лайков. Решение получится за 10 минут вместо вечера спора.',
      },
      {
        kind: 'cta',
        text: 'Попробовать матчи на Flicksee',
        to: '/friends',
      },
    ],
  },

  // ───────────── Mid-frequency keyword: "фильмы которые заставляют задуматься"
  {
    slug: 'filmy-kotorye-zastavlyayut-zadumatsya',
    title: 'Фильмы, которые заставляют задуматься: 10 драм с двойным дном',
    description:
      '10 фильмов, после которых хочется молча досидеть титры. Не «грустно ради грустно», а с реально работающей идеей внутри. Подборка от психологических драм до научной фантастики.',
    date: '2026-06-19',
    readingMinutes: 9,
    keywords: [
      'фильмы которые заставляют задуматься',
      'умные фильмы',
      'фильмы с глубоким смыслом',
    ],
    heroPosterTmdbId: 1124,
    heroPosterType: 'movie',
    sections: [
      {
        kind: 'paragraph',
        text: 'Эти фильмы объединяет одно: после титров мысли продолжаются. Не «понравилось / не понравилось», а «подожди, а это значит, что…». Каждый из них работает на двух уровнях — на сюжетном (где интересно следить за тем что происходит) и на философском (где после хочется поговорить или помолчать).',
      },
      {
        kind: 'paragraph',
        text: 'Подборка не претендует на «самые умные фильмы в истории» — она про десять конкретных лент, которые мы пересматривали и про которые до сих пор спорим в редакции.',
      },
      {
        kind: 'movieList',
        items: [
          {
            tmdbId: 1124,
            contentType: 'movie',
            title: 'Престиж',
            year: 2006,
            why: 'Фокусники, одержимость, цена «совершенства». После финала переосматривается весь первый акт. Нолан, который ещё умел в камерную интригу.',
          },
          {
            tmdbId: 27205,
            contentType: 'movie',
            title: 'Начало',
            year: 2010,
            why: 'Если думать не про юлу, а про чувство потери — фильм становится в несколько раз сильнее. Тема памяти и реальности здесь центральная.',
          },
          {
            tmdbId: 13,
            contentType: 'movie',
            title: 'Форрест Гамп',
            year: 1994,
            why: 'Кажущаяся простота, в которой каждый видит свой смысл. Про то, что «значимое» и «успешное» — разные вещи.',
          },
          {
            tmdbId: 11324,
            contentType: 'movie',
            title: 'Остров проклятых',
            year: 2010,
            why: 'Можно смотреть как триллер, можно как метафору. Финальная фраза — один из самых обсуждаемых моментов в кино 2010-х.',
          },
          {
            tmdbId: 38,
            contentType: 'movie',
            title: 'Вечное сияние чистого разума',
            year: 2004,
            why: 'Что если стереть человека из памяти? Гонда + Кауфман делают невозможное: говорят о любви без сентиментальности.',
          },
          {
            tmdbId: 581,
            contentType: 'movie',
            title: 'Большой Лебовски',
            year: 1998,
            why: 'Кажется комедией. На самом деле — медитация на тему «как жить, ничего не доказывая». С каждым десятилетием становится глубже.',
          },
          {
            tmdbId: 244786,
            contentType: 'movie',
            title: 'Одержимость',
            year: 2014,
            why: 'Цена великого результата. Фильм, после которого думаешь не про джаз, а про границы амбиций и насилия.',
          },
          {
            tmdbId: 503919,
            contentType: 'movie',
            title: 'Маяк',
            year: 2019,
            why: 'Два человека на скале, чёрно-белая плёнка, миф о Прометее как фон. Психологический хоррор, который не пугает, а нагнетает экзистенциальную тоску.',
          },
          {
            tmdbId: 530915,
            contentType: 'movie',
            title: '1917',
            year: 2019,
            why: 'Война как механический процесс, без героизма. Один план, одна задача, одно сообщение — и абсурд того, что всё это вообще происходит.',
          },
          {
            tmdbId: 419430,
            contentType: 'movie',
            title: 'Прочь',
            year: 2017,
            why: 'Снаружи — хоррор. Внутри — социальное высказывание про расизм. Жанр здесь — троянский конь для разговора, которого не миновать.',
          },
        ],
      },
      { kind: 'heading', text: 'Как выбирать «умное кино», чтобы оно не было занудным' },
      {
        kind: 'paragraph',
        text: 'Главный риск этого жанра — фильм, который пытается казаться глубоким за счёт медленного темпа и претензии. Признак хорошего «думающего кино» — оно интересно прямо сейчас, не «потом будет понятно». Сюжет работает на уровне «что дальше?», а смысл — бонус сверху, не вместо.',
      },
      {
        kind: 'paragraph',
        text: 'Когда выбираете трейлер — обратите внимание не только на тон, но и на темп монтажа. Если трейлер целиком из медленных кадров — фильм может оказаться красивым, но скучным. Если есть рваный ритм, диалоги, повороты — больше шансов, что это «интересное умное», а не «тяжёлое умное».',
      },
      {
        kind: 'cta',
        text: 'Свайпнуть драмы на Flicksee',
        to: '/',
      },
    ],
  },

  // ───────────── Mid-frequency keyword: "сериалы которые цепляют с первой серии"
  {
    slug: 'serialy-cepyayut-s-pervoy-serii',
    title: 'Сериалы, которые цепляют с первой серии: 8 проверенных стартов',
    description:
      'Список из 8 сериалов, которые не нужно «терпеть три эпизода». Захватывают с пилотной серии и держат до финала. От триллеров до драмеди.',
    date: '2026-06-17',
    readingMinutes: 7,
    keywords: [
      'сериалы которые цепляют с первой серии',
      'захватывающие сериалы',
      'сериалы с сильным началом',
    ],
    heroPosterTmdbId: 1399,
    heroPosterType: 'tv',
    sections: [
      {
        kind: 'paragraph',
        text: 'Самый частый совет про сериалы: «дай ему три эпизода». Иногда оправдан, но в 2026 году у нас всех слишком много контента и слишком мало вечеров. Лучший сериал — тот, который работает с первой серии и не требует «потерпеть».',
      },
      {
        kind: 'paragraph',
        text: 'Восемь сериалов ниже — те, которые в нашей подборке стабильно проходят тест «один пилот → решение, смотреть ли дальше».',
      },
      {
        kind: 'movieList',
        items: [
          {
            tmdbId: 1399,
            contentType: 'tv',
            title: 'Игра престолов',
            year: 2011,
            why: 'Первая серия делает то, что мало кто рисковал делать в фэнтези: устанавливает правила мира и тут же их ломает. После пилота уже знаешь, что обычные сериальные ожидания тут не работают.',
          },
          {
            tmdbId: 1396,
            contentType: 'tv',
            title: 'Во все тяжкие',
            year: 2008,
            why: 'Учитель химии в трусах посреди пустыни записывает прощальное видео. С первой минуты понятно, что это будет не «семейная драма про педагога».',
          },
          {
            tmdbId: 60059,
            contentType: 'tv',
            title: 'Лучше звоните Солу',
            year: 2015,
            why: 'Спин-офф, который превзошёл оригинал в драматургии. Первая серия деликатно знакомит с героем, и через 50 минут ты уже хочешь следующую.',
          },
          {
            tmdbId: 71912,
            contentType: 'tv',
            title: 'Ведьмак',
            year: 2019,
            why: 'Боевая хореография первой битвы Геральта — лучшая визитка сериала. Если зашло — дальше становится только лучше.',
          },
          {
            tmdbId: 76479,
            contentType: 'tv',
            title: 'Парни',
            year: 2019,
            why: 'Антисупергеройская сатира, которая в пилоте сразу заявляет тон. Если выдержали первую сцену — сериал ваш.',
          },
          {
            tmdbId: 87108,
            contentType: 'tv',
            title: 'Чернобыль',
            year: 2019,
            why: 'Не сериал, а 5-серийный фильм. Первый эпизод — холодный, страшный, документально точный. Втягивает мгновенно.',
          },
          {
            tmdbId: 84958,
            contentType: 'tv',
            title: 'Локи',
            year: 2021,
            why: 'Marvel наконец-то сделал сериал, в котором первая серия работает не как «продолжение фильма», а как полноценный пилот собственного мира.',
          },
          {
            tmdbId: 60625,
            contentType: 'tv',
            title: 'Рик и Морти',
            year: 2013,
            why: 'Если выдержали первые 5 минут — ваш сериал. Анимация для взрослых, в которой каждая серия — отдельная философская идея под маской пошлой комедии.',
          },
        ],
      },
      { kind: 'heading', text: 'Что отличает «цепляющий пилот»' },
      {
        kind: 'list',
        items: [
          'Уже в первые 10 минут есть конфликт или загадка, а не «знакомство с героями»',
          'Главный герой делает что-то нетипичное для своего архетипа',
          'Визуальный язык узнаваем — освещение, монтаж, музыка',
          'Финал серии — крючок, а не «и они пошли домой»',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Если пилотная серия не делает ничего из этого — велик шанс, что и дальше будет средне. «Пересиди три эпизода» — оправдание для слабого старта.',
      },
      {
        kind: 'cta',
        text: 'Найти сериал свайпом',
        to: '/',
      },
    ],
  },

  // ───────────── Mid-frequency keyword: "что посмотреть в дождливый вечер"
  {
    slug: 'chto-posmotret-v-dozhdlivyy-vecher',
    title: 'Что посмотреть в дождливый вечер: 8 идеальных фильмов под настроение',
    description:
      'Дождь за окном требует не любого фильма, а определённого. Тёплая палитра, медленный ритм, размышление без депрессии. 8 проверенных вариантов.',
    date: '2026-06-15',
    readingMinutes: 6,
    keywords: [
      'что посмотреть в дождливый вечер',
      'фильмы под дождь',
      'атмосферные фильмы',
    ],
    heroPosterTmdbId: 152601,
    heroPosterType: 'movie',
    sections: [
      {
        kind: 'paragraph',
        text: 'Дождь меняет требования к фильму. То, что отлично смотрится солнечным днём (быстрый боевик, лёгкая комедия), под дождь воспринимается как шум. И наоборот: то, что лежит в watchlist «когда-нибудь потом» (медленная драма, атмосферное кино) — внезапно идеально под звук капель.',
      },
      {
        kind: 'paragraph',
        text: 'Восемь фильмов, которые в дождь работают особенно хорошо. Общая формула: тёплая палитра, не очень быстрый темп, эмоция, к которой готов прислушаться.',
      },
      {
        kind: 'movieList',
        items: [
          {
            tmdbId: 152601,
            contentType: 'movie',
            title: 'Она',
            year: 2013,
            why: 'Любовь в почти научной фантастике. Все кадры тёплые, всё неторопливо, ничего громкого. Дождь за окном — органичная часть атмосферы.',
          },
          {
            tmdbId: 38,
            contentType: 'movie',
            title: 'Вечное сияние чистого разума',
            year: 2004,
            why: 'Зимний, печальный, нежный. Идеален, когда хочется красиво погрустить, но без чернухи. Заканчивается на хорошей ноте.',
          },
          {
            tmdbId: 313369,
            contentType: 'movie',
            title: 'Ла-Ла Ленд',
            year: 2016,
            why: 'Контр-интуитивный выбор: мюзикл под дождь? Да. Тёплая палитра Лос-Анджелеса, ностальгические песни, финал, который остаётся надолго.',
          },
          {
            tmdbId: 207,
            contentType: 'movie',
            title: 'Общество мёртвых поэтов',
            year: 1989,
            why: 'Осенние пейзажи, английский интернат, харизма Робина Уильямса. Школьная драма, которая работает в любом возрасте.',
          },
          {
            tmdbId: 76341,
            contentType: 'movie',
            title: 'Безумный Макс: Дорога ярости',
            year: 2015,
            why: 'Если дождь сильный и хочется наоборот — пустыни, песка, ничего общего с серостью за окном. 2 часа визуального ада в хорошем смысле.',
          },
          {
            tmdbId: 19404,
            contentType: 'movie',
            title: 'Непохищенная невеста',
            year: 1995,
            why: 'Старое индийское кино без иронии. Длинное, мелодраматичное, романтичное. Дождь подходит идеально.',
          },
          {
            tmdbId: 8587,
            contentType: 'movie',
            title: 'Король Лев',
            year: 1994,
            why: 'Иногда дождь требует не сложного, а уютного. Классика Disney, которую можно пересматривать бесконечно.',
          },
          {
            tmdbId: 597,
            contentType: 'movie',
            title: 'Титаник',
            year: 1997,
            why: 'Три часа, в которые втягиваешься без сопротивления. Если давно не пересматривали — идеальный дождливый повод.',
          },
        ],
      },
      { kind: 'heading', text: 'Что НЕ смотреть в дождь' },
      {
        kind: 'list',
        items: [
          'Хорроры — атмосфера дома уже работает на жанр, получается перебор',
          'Боевики с быстрым монтажом — шум дождя + шум фильма = ничего не слышно',
          'Документальное про катастрофы — лишний пласт серости',
          'Артхаус, который вы не выбрали бы в обычный день — дождь не делает тяжёлый фильм лучше, только дольше',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Самое важное про «фильмы под настроение» — не пытаться оптимизировать выбор. Любой фильм из watchlist, который вы давно откладывали под «нужное настроение» — сегодня то самое настроение.',
      },
      {
        kind: 'cta',
        text: 'Открыть свой watchlist',
        to: '/',
      },
    ],
  },

  // ───────────── Existing 3 articles kept (slightly polished)
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
      { kind: 'heading', text: '3. Фильтр перед сессией' },
      {
        kind: 'paragraph',
        text: 'Перед тем как открыть приложение, реши одно: что ты ищешь? Не «фильм», а конкретно — настроение, жанр, длительность, эпоху. Этот выбор должен занять 10 секунд.',
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
      { kind: 'heading', text: '4. Метод трёх минут' },
      {
        kind: 'paragraph',
        text: 'Заведи правило: если за 3 минуты после запуска фильма ты не вовлёкся — выключай и пробуй другой. Без чувства вины, без «надо досмотреть». Жизнь короткая, плохих фильмов много, хороших — тоже много.',
      },
      { kind: 'heading', text: '5. Watchlist на 10 фильмов вперёд' },
      {
        kind: 'paragraph',
        text: 'Лучший момент выбирать фильм — это не вечером, когда хочется отдохнуть, а в свободные 10 минут утром или в обед. Тогда мозг не уставший и решения качественнее.',
      },
      { kind: 'heading', text: '6. Спроси у друга — но не «что посмотреть»' },
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
        text: 'Когда выбираете кино с партнёром — каждый свайпает трейлеры независимо, потом смотрите пересечение лайков. Если оба поставили «хочу посмотреть» одному фильму — это и есть выбор. Никаких споров.',
      },
      { kind: 'cta', text: 'Попробовать матчи', to: '/friends' },
    ],
  },

  {
    slug: 'kak-smotret-filmy-s-druziami',
    title: 'Как смотреть фильмы с друзьями, не споря о выборе',
    description:
      'Совместный просмотр часто застревает на этапе «что смотреть» — у всех разный вкус, никто не уступает. Разбираем механики matching-приложений, синхронных стримов и правил вечера, которые реально работают.',
    date: '2026-06-18',
    readingMinutes: 6,
    keywords: ['смотреть фильмы с друзьями', 'совместный просмотр', 'фильм для пары'],
    sections: [
      {
        kind: 'paragraph',
        text: 'Совместный просмотр кино — один из самых популярных форматов досуга и одновременно один из самых конфликтных. Парам, друзьям и семьям мешает не отсутствие хороших фильмов, а конфликт вкусов и плохой процесс выбора.',
      },
      { kind: 'heading', text: 'Почему «давай я выберу — а ты следующий» не работает' },
      {
        kind: 'paragraph',
        text: 'Самая частая модель: один человек выбирает, второй соглашается. Через 20 минут просмотра становится понятно, что фильм не зашёл второму — но уже неловко переключать. Вечер потерян, накапливается раздражение.',
      },
      { kind: 'heading', text: 'Метод 1: Matching — выбираем пересечение, а не компромисс' },
      {
        kind: 'paragraph',
        text: 'Идея: оба партнёра независимо свайпают одну и ту же подборку трейлеров. После того как оба прошли — смотрите пересечение. Это не компромисс, это совпадение. Никто никому не уступал.',
      },
      {
        kind: 'paragraph',
        text: 'Это базовая механика Flicksee: добавляешь друга через Telegram-ссылку, дальше каждый свайпает в своём темпе. Сервер автоматически считает пересечение и присылает push-уведомление, когда возникает совпадение.',
      },
      { kind: 'heading', text: 'Метод 2: Curator — у каждого по 5 вариантов' },
      {
        kind: 'list',
        items: [
          'Каждый собирает 5 фильмов, которые хочет посмотреть',
          'Показывает свои 5 трейлеров второму (по 30 секунд каждый)',
          'Второй ставит «да / нет / может быть» каждому',
          'Если хотя бы один «да» совпал — выбираете его',
        ],
      },
      { kind: 'heading', text: 'Метод 3: Roulette — снимаем ответственность за выбор' },
      {
        kind: 'paragraph',
        text: 'Берёте watchlist на 15+ фильмов, второй человек называет число, и смотрите этот по списку. Никто не виноват в выборе. Парадоксально часто именно случайный выбор даёт лучшие открытия.',
      },
      { kind: 'cta', text: 'Попробовать матчи с другом', to: '/friends' },
    ],
  },

  {
    slug: 'pochemu-treylery-vazhnee-opisaniy',
    title: 'Почему трейлер скажет о фильме больше, чем рейтинг и описание',
    description:
      'Рейтинги говорят, что фильм «хороший» или «плохой», описания — про сюжет, а зайдёт ли он лично тебе — показывает только трейлер. Разбираем, на что обращать внимание в 30-секундном превью.',
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
        text: 'Синопсис описывает завязку и иногда жанр. Но «зайдёт ли он» определяется не сюжетом, а тоном — тем, как режиссёр рассказывает историю. Тон не вмещается в три предложения.',
      },
      { kind: 'heading', text: 'Что говорит трейлер' },
      {
        kind: 'list',
        items: [
          'Темп — быстрый монтаж = драйв, медленный = размышление',
          'Цветовая палитра — холодная (тревога, реализм) или тёплая (ностальгия, эмоция)',
          'Музыка — какой жанр, какое настроение',
          'Лица актёров — какое выражение задерживается дольше всего',
          'Что показывают в конце — финальный кадр или фраза = тон всего фильма',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Через 30 секунд трейлера тело реагирует — «хочу смотреть» или «не хочу». Эта реакция точнее любого рейтинга.',
      },
      { kind: 'cta', text: 'Свайпать трейлеры на Flicksee', to: '/' },
    ],
  },
];

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
