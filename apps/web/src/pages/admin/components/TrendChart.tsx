import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { TrendPoint } from '@flicksee/shared';

interface Props {
  title: string;
  data: TrendPoint[];
  kind: 'line' | 'bar';
  color: string;
}

const TrendChart: React.FC<Props> = ({ title, data, kind, color }) => {
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(8) + '.' + d.date.slice(5, 7),
  }));

  const ChartType = kind === 'line' ? LineChart : BarChart;

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ChartType data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#ffffff60', fontSize: 10 }}
              interval={4}
              stroke="#ffffff20"
            />
            <YAxis
              tick={{ fill: '#ffffff60', fontSize: 10 }}
              stroke="#ffffff20"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a1c',
                border: '1px solid #ffffff20',
                fontSize: 12,
              }}
              labelStyle={{ color: '#ffffff80' }}
            />
            {kind === 'line' ? (
              <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} />
            ) : (
              <Bar dataKey="count" fill={color} />
            )}
          </ChartType>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
