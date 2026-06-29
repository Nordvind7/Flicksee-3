import React from 'react';

interface Props {
  label: string;
  value: number | string;
  hint?: string;
}

const MetricCard: React.FC<Props> = ({ label, value, hint }) => (
  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
    <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
    <div className="text-2xl font-bold mt-1 tabular-nums">
      {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
    </div>
    {hint && <div className="text-xs opacity-50 mt-1">{hint}</div>}
  </div>
);

export default MetricCard;
