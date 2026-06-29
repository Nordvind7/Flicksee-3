import React, { useEffect, useRef, useState } from 'react';
import { useAuth, isInTelegramInAppBrowser } from '../../auth/AuthContext';

interface Props {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

const LoginPromptModal: React.FC<Props> = ({ open, title, description, onClose }) => {
  const { botLogin } = useAuth();
  const [phase, setPhase] = useState<'idle' | 'waiting'>('idle');
  const cancelRef = useRef<(() => void) | null>(null);

  // Cancel any in-flight polling when the modal closes or unmounts.
  useEffect(() => {
    if (!open && cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
      setPhase('idle');
    }
    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, [open]);

  if (!open) return null;

  const startLogin = async () => {
    setPhase('waiting');
    const result = await botLogin(
      (botUrl) => {
        // Same flow as LoginButton: in TG in-app browser, prefer tg:// deep-link
        // so the system Telegram app jumps in front. Otherwise window.open.
        if (isInTelegramInAppBrowser()) {
          const m = botUrl.match(/^https:\/\/t\.me\/([^?]+)\?start=(.+)$/);
          if (m) {
            const tgUrl = `tg://resolve?domain=${m[1]}&start=${m[2]}`;
            const a = document.createElement('a');
            a.href = tgUrl;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.setTimeout(() => window.open(botUrl, '_blank'), 800);
            return;
          }
        }
        window.open(botUrl, '_blank');
      },
      (cancel) => {
        cancelRef.current = cancel;
      },
    );
    if (result === 'ok') {
      onClose();
    } else {
      setPhase('idle');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-ink-700 border border-white/10 rounded-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm opacity-80 mb-5">{description}</p>
        {phase === 'idle' ? (
          <>
            <button
              onClick={startLogin}
              className="w-full px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
            >
              Войти через Telegram
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2 px-3 py-2 text-sm opacity-60 hover:opacity-100"
            >
              Не сейчас
            </button>
          </>
        ) : (
          <div className="text-sm opacity-80 text-center py-4">
            Откроется Telegram. Нажми «Start» в боте, мы автоматически тебя залогиним.
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPromptModal;
