import React, { useEffect } from 'react';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

// Политика конфиденциальности под 152-ФЗ. Содержит обязательные пункты:
// какие данные собираем, на каких основаниях, как храним, кому передаём,
// права субъекта данных, контакты оператора. Текст в legal-стиле — не
// маркетинговый.
const PrivacyPage: React.FC = () => {
  useEffect(() => {
    const orig = document.title;
    document.title = 'Политика конфиденциальности — Flicksee';
    return () => {
      document.title = orig;
    };
  }, []);

  return (
    <div className="min-h-screen text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <article className="max-w-3xl mx-auto p-4 md:p-8 prose-flicksee">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Политика конфиденциальности
        </h1>
        <p className="text-ink-300 text-sm mb-8">Редакция от 24 июня 2026 г.</p>

        <Section title="1. Общие положения">
          <p>
            Настоящая Политика конфиденциальности (далее — «Политика») регулирует обработку
            персональных данных пользователей сайта <strong>flicksee.ru</strong> (далее — «Сервис»)
            в соответствии с Федеральным законом № 152-ФЗ «О персональных данных» от 27 июля 2006 г.
          </p>
          <p>
            Оператором персональных данных является владелец Сервиса. Для связи по вопросам
            обработки персональных данных используйте Telegram-бот{' '}
            <a
              href="https://t.me/Flicksee_bot"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
              style={{ color: '#E50914' }}
            >
              @Flicksee_bot
            </a>
            .
          </p>
        </Section>

        <Section title="2. Какие данные мы собираем">
          <p>При использовании Сервиса обрабатываются следующие категории данных:</p>
          <ul>
            <li>
              <strong>Данные авторизации через Telegram:</strong> Telegram ID, имя, фамилия,
              username, ссылка на аватар, языковой код. Передаются Telegram Login Widget после
              явного согласия пользователя на вход.
            </li>
            <li>
              <strong>Данные о действиях:</strong> идентификаторы фильмов и сериалов, на которые
              пользователь поставил «хочу посмотреть», «не моё» или «уже видел»; дата и время
              действия.
            </li>
            <li>
              <strong>Технические данные:</strong> IP-адрес, тип браузера, операционная система,
              referer, время визита. Собираются автоматически системой Яндекс.Метрика для
              аналитики посещаемости.
            </li>
            <li>
              <strong>Cookies:</strong> анонимный идентификатор сессии, токен авторизации (httpOnly,
              недоступен JavaScript), настройки отображения.
            </li>
          </ul>
        </Section>

        <Section title="3. Цели обработки">
          <ul>
            <li>предоставление функциональности сервиса (сохранение watchlist, матчи с друзьями);</li>
            <li>отправка push-уведомлений о новых матчах в Telegram-бот;</li>
            <li>защита от мошенничества и злоупотреблений;</li>
            <li>аналитика посещаемости и улучшение продукта;</li>
            <li>выполнение обязательств перед пользователем.</li>
          </ul>
        </Section>

        <Section title="4. Правовые основания">
          <p>Данные обрабатываются на следующих основаниях:</p>
          <ul>
            <li>согласие пользователя (нажатие «Войти через Telegram»);</li>
            <li>необходимость исполнения договора об использовании Сервиса;</li>
            <li>законные интересы оператора (защита от мошенничества).</li>
          </ul>
        </Section>

        <Section title="5. Передача данных третьим лицам">
          <p>Данные могут передаваться следующим контрагентам:</p>
          <ul>
            <li>
              <strong>Telegram (Telegram FZ-LLC)</strong> — для авторизации и доставки уведомлений
              в бот;
            </li>
            <li>
              <strong>The Movie Database (TMDB)</strong> — для получения метаданных и постеров
              фильмов; передаются только запросы вида «ID фильма», без персональных данных
              пользователя;
            </li>
            <li>
              <strong>Яндекс</strong> — для веб-аналитики (Яндекс.Метрика); агрегированные обезличенные
              данные о посещаемости.
            </li>
          </ul>
          <p>
            Сервис не продаёт персональные данные пользователей и не передаёт их в рекламных или
            маркетинговых целях третьим лицам, кроме указанных выше.
          </p>
        </Section>

        <Section title="6. Хранение данных">
          <p>
            Персональные данные хранятся на серверах в Российской Федерации в течение всего срока
            использования Сервиса и удаляются по запросу пользователя в течение 30 дней.
          </p>
        </Section>

        <Section title="7. Права пользователя">
          <p>В соответствии с 152-ФЗ пользователь имеет право:</p>
          <ul>
            <li>получать информацию об обработке своих данных;</li>
            <li>требовать уточнения, блокирования или удаления своих данных;</li>
            <li>отозвать согласие на обработку в любой момент;</li>
            <li>обращаться в Роскомнадзор при нарушении прав.</li>
          </ul>
          <p>
            Для реализации прав напишите в Telegram-бот{' '}
            <a
              href="https://t.me/Flicksee_bot"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
              style={{ color: '#E50914' }}
            >
              @Flicksee_bot
            </a>
            .
          </p>
        </Section>

        <Section title="8. Cookie-файлы">
          <p>
            Сервис использует cookies для авторизации, хранения настроек и веб-аналитики.
            Подробнее — в разделе «Cookie-файлы» ниже.
          </p>
          <p>
            При первом посещении пользователю показывается баннер с уведомлением об использовании
            cookies. Продолжая использование Сервиса, пользователь соглашается с этим.
          </p>
        </Section>

        <Section title="9. Изменения политики">
          <p>
            Оператор оставляет за собой право изменять Политику. Новая редакция публикуется на этой
            странице. Дата последней редакции указана в начале документа.
          </p>
        </Section>

        <hr className="border-white/10 my-10" />

        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
          Cookie-файлы: какие и зачем
        </h2>
        <p className="text-ink-100 leading-relaxed mb-4">
          Cookies — небольшие текстовые файлы, которые Сервис сохраняет в браузере пользователя.
          Используются для следующих задач:
        </p>
        <ul className="text-ink-100 leading-relaxed space-y-2 list-disc pl-5 mb-6">
          <li>
            <strong>Авторизация.</strong> Refresh-токен в httpOnly-cookie — недоступен JavaScript,
            защищён от XSS. Срок жизни — 30 дней.
          </li>
          <li>
            <strong>Настройки отображения.</strong> Текущая позиция в колоде свайпа, выбранные
            фильтры. Хранятся в localStorage браузера, не передаются на сервер.
          </li>
          <li>
            <strong>Аналитика.</strong> Яндекс.Метрика устанавливает свои cookies (`_ym_*`) для
            обезличенного подсчёта уникальных посетителей. Подробнее — в{' '}
            <a
              href="https://yandex.ru/legal/confidential/"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
              style={{ color: '#E50914' }}
            >
              политике Яндекса
            </a>
            .
          </li>
        </ul>
        <p className="text-ink-200 text-sm leading-relaxed">
          Управление cookies доступно в настройках вашего браузера. Отключение cookies сделает
          невозможным использование функций, требующих авторизации (watchlist, друзья, матчи).
        </p>
      </article>
      <Footer />
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-ink-50 mt-8 mb-3">{title}</h2>
    <div className="text-ink-100 leading-relaxed [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5">
      {children}
    </div>
  </section>
);

export default PrivacyPage;
