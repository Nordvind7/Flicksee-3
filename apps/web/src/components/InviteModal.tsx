import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { TelegramIcon } from './icons';

interface Props {
  deeplink: string;
  onClose: () => void;
}

/**
 * Шаринг-модалка приглашения друга. Показывает один и тот же deeplink тремя
 * способами:
 *   • QR — друг сканит телефоном и моментально открывает бота;
 *   • кликабельная кнопка «Открыть в Telegram» — если друг рядом с десктопом;
 *   • «Скопировать» — переслать любым мессенджером.
 *
 * Также объясняет что произойдёт дальше, чтобы юзер не гадал.
 */
const InviteModal: React.FC<Props> = ({ deeplink, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Close on Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(deeplink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — user can still select text manually */
    }
  };

  const share = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        text: `Свайпни со мной фильмы на Flicksee: ${deeplink}`,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 ring-1 ring-white/10 shadow-2xl"
        style={{ backgroundColor: '#16161a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-ink-200 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Закрыть"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black tracking-tight mb-1">Твоя ссылка-приглашение</h2>
        <p className="text-ink-200 text-sm mb-6">
          Личная ссылка — работает всегда и для любого. Покажи QR или
          отправь любым мессенджером. Кто перейдёт и нажмёт «Запустить»
          в боте — автоматом станет твоим другом во Flicksee.
        </p>

        <div className="bg-white rounded-2xl p-4 flex items-center justify-center mb-5">
          <QRCode value={deeplink} size={196} bgColor="#ffffff" fgColor="#000000" />
        </div>

        <div className="bg-ink-700/60 ring-1 ring-white/5 rounded-xl px-3 py-2.5 mb-4 break-all text-xs text-ink-100 font-mono">
          {deeplink}
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={deeplink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#2aa5dd] text-white font-semibold py-3 rounded-full transition-colors"
          >
            <TelegramIcon />
            Открыть в Telegram
          </a>
          <button
            onClick={() => void copy()}
            className="bg-white/10 hover:bg-white/15 text-white font-semibold py-3 rounded-full transition-colors"
          >
            {copied ? 'Скопировано ✓' : 'Скопировать ссылку'}
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={() => void share()}
              className="text-ink-200 hover:text-white text-sm py-2 transition-colors"
            >
              Поделиться через…
            </button>
          )}
        </div>

        <p className="text-xs text-ink-300 mt-5 leading-relaxed">
          Можно отправлять скольким угодно людям и переиспользовать
          сколько хочешь. Уведомление о каждом новом друге придёт в{' '}
          <a
            href="https://t.me/Flicksee_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#229ED9] underline"
          >
            @Flicksee_bot
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default InviteModal;
