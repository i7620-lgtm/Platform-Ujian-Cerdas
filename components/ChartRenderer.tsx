
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

export const ChartRenderer: React.FC<ChartRendererProps> = ({ data }) => {
  const { type, title, labels, datasets } = data;

  // Transform data for Recharts
  const chartData = labels.map((label, index) => {
    const entry: any = { name: label };
    datasets.forEach(dataset => {
      entry[dataset.label] = dataset.data[index];
    });
    return entry;
  });

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
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
      case 'pie':
        // Pie chart usually takes one dataset
        const pieData = labels.map((label, index) => ({
          name: label,
          value: datasets[0].data[index]
        }));
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
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
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="my-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      {title && <h3 className="text-center font-bold mb-4 text-gray-700">{title}</h3>}
      {renderChart()}
    </div>
  );
};
