
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
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-xl z-50">
        <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
        {payload.map((entry: { color: string; name: string; value: number | string }, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
            <span className="font-semibold text-slate-800 dark:text-white">{entry.value}</span>
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
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              {data.showTooltip !== false && (
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              <Legend />
              {datasets.map((dataset, index) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={dataset.backgroundColor?.[0] || COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              {data.showTooltip !== false && (
                <Tooltip 
                  content={<CustomTooltip />}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              <Legend />
              {datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={dataset.borderColor?.[0] || COLORS[index % COLORS.length]}
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
            <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {data.showTooltip !== false && (
                <Tooltip 
                  content={<CustomTooltip />}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-[350px] flex flex-col">
      {title && <h3 className="text-center font-bold mb-4 text-gray-700 dark:text-slate-200">{title}</h3>}
      <div className="flex-1 min-h-0">
        {renderChart()}
      </div>
    </div>
  );
};
