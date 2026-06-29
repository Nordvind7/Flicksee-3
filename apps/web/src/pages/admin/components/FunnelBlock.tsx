import React from 'react';
import type { FunnelBlock as FunnelData } from '@flicksee/shared';

interface Props {
  data: FunnelData;
}

const FunnelBlock: React.FC<Props> = ({ data }) => {
  const steps = [
    { label: 'Регистраций в когорте (7 дн)', value: data.cohortSize, base: data.cohortSize },
    { label: '→ Нажал /start в боте', value: data.botStarted, base: data.cohortSize },
    { label: '→ Открыл веб (≥1 свайп)', value: data.openedWeb, base: data.botStarted },
    { label: '→ Сделал 5+ свайпов', value: data.fivePlusSwipes, base: data.openedWeb },
    { label: '→ Получил матч', value: data.gotMatch, base: data.fivePlusSwipes },
  ];

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">Воронка (когорта 7 дней)</h3>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const pct = s.base > 0 && i > 0 ? Math.round((s.value / s.base) * 100) : null;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex-1 text-sm">{s.label}</div>
              <div className="tabular-nums font-mono">{s.value}</div>
              {pct !== null && (
                <div className="text-xs opacity-50 w-12 text-right">{pct}%</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FunnelBlock;
