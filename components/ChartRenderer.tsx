
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ChartData } from '../types';

interface ChartRendererProps {
  data: ChartData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { color: string; name: string; value: number | string }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md dark:bg-slate-800/95 p-4 border-2 border-indigo-100 dark:border-indigo-900/50 shadow-2xl rounded-2xl z-[100] min-w-[200px] mx-auto transform -translate-x-1/2 left-1/2 relative">
        <p className="font-black text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2 text-center">{label}</p>
        {payload.map((entry: { color: string; name: string; value: number | string }, index: number) => (
          <div key={index} className="flex items-center justify-center gap-3 text-sm mt-2">
            <div className="w-4 h-4 rounded-md shadow-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-400 font-medium">{entry.name}:</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ data }) => {
  const { type, title, labels, datasets } = data;

  // Transform data for Recharts
  const chartData = labels.map((label, index) => {
    const entry: Record<string, string | number> = { name: label };
    datasets.forEach(dataset => {
      entry[dataset.label] = dataset.data[index];
    });
    return entry;
  });

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 20, left: -10, bottom: 40 }}
              barCategoryGap="15%"
            >
              <CartesianGrid strokeDasharray="5 5" stroke="#cbd5e1" opacity={0.8} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 13, fill: '#475569', fontWeight: 600 }}
                axisLine={{ stroke: '#64748b', strokeWidth: 1.5 }}
                tickLine={{ stroke: '#64748b' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
                tickMargin={5}
              />
              <YAxis 
                tick={{ fontSize: 13, fill: '#475569', fontWeight: 600 }}
                axisLine={{ stroke: '#64748b', strokeWidth: 1.5 }}
                tickLine={{ stroke: '#64748b' }}
                tickMargin={5}
                width={45}
              />
              {data.showTooltip !== false && (
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                  wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                  position={{ y: 250 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              <Legend 
                verticalAlign="bottom" 
                align="center" 
                wrapperStyle={{ paddingTop: '10px', fontSize: '14px', fontWeight: 'bold' }}
              />
              {datasets.map((dataset, index) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={dataset.backgroundColor?.[0] || COLORS[index % COLORS.length]}
                  maxBarSize={80}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData} 
              margin={{ top: 20, right: 20, left: -10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="5 5" stroke="#cbd5e1" opacity={0.8} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 13, fill: '#475569', fontWeight: 600 }}
                axisLine={{ stroke: '#64748b', strokeWidth: 1.5 }}
                tickLine={{ stroke: '#64748b' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
                tickMargin={5}
              />
              <YAxis 
                tick={{ fontSize: 13, fill: '#475569', fontWeight: 600 }}
                axisLine={{ stroke: '#64748b', strokeWidth: 1.5 }}
                tickLine={{ stroke: '#64748b' }}
                tickMargin={5}
                width={45}
              />
              {data.showTooltip !== false && (
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(99, 102, 241, 0.2)', strokeWidth: 2 }}
                  wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                  position={{ y: 250 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              <Legend 
                verticalAlign="bottom" 
                align="center" 
                wrapperStyle={{ paddingTop: '10px', fontSize: '14px', fontWeight: 'bold' }}
              />
              {datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={dataset.borderColor?.[0] || COLORS[index % COLORS.length]}
                  strokeWidth={4}
                  dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie': {
        // Pie chart usually takes one dataset
        const pieData = labels.map((label, index) => ({
          name: label,
          value: datasets[0].data[index]
        }));
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={160}
                innerRadius={100}
                paddingAngle={5}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              {data.showTooltip !== false && (
                <Tooltip 
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                  position={{ y: 250 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-[500px] sm:h-[600px] flex flex-col bg-white dark:bg-slate-900/50 p-4 sm:p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-sm transition-all">
      {title && <h3 className="text-center font-bold mb-4 sm:mb-6 text-slate-800 dark:text-white tracking-tight text-xl sm:text-2xl shrink-0">{title}</h3>}
      <div className="flex-1 w-full relative">
        <div className="absolute inset-0">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};
