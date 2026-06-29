import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface Slice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  data: Slice[];
}

const DonutChart: React.FC<Props> = ({ title, data }) => {
  const total = data.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">{title}</h3>
      <div className="h-48">
        {total === 0 ? (
          <div className="flex items-center justify-center h-full text-sm opacity-50">
            Нет данных
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
              >
                {data.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1a1a1c',
                  border: '1px solid #ffffff20',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DonutChart;
