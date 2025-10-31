"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

export interface ProgressData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

interface ProgressChartProps {
  data: ProgressData[];
  title?: string;
}

export function ProgressChart({ data, title }: ProgressChartProps) {
  // Calculate total for displaying counts
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  // Filter out entries with 0 values to avoid empty pie slices
  const chartData = data.filter(entry => entry.value > 0);

  // If no data, show empty state
  if (total === 0 || chartData.length === 0) {
    return (
      <div className="w-full">
        {title && (
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            {title}
          </h3>
        )}
        <div className="flex items-center justify-center h-[300px] text-text-tertiary">
          <p className="text-sm">No data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }: { name?: string; value?: number; percent?: number }) => {
              const displayPercent = ((percent || 0) * 100).toFixed(0);
              return `${displayPercent}% (${value || 0})`;
            }}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
            formatter={(value: number, name: string, props: any) => {
              const percent = ((props.value / total) * 100).toFixed(1);
              return [`${value} students (${percent}%)`, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value, entry: any) => {
              const count = entry.payload?.value || 0;
              return (
                <span className="text-sm text-text-secondary">
                  {value.replace(/\s*\(.*?\)/, "")}: {count} students
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
