"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface TimelineData {
  name: string;
  pending: number;
  inProgress: number;
  completed: number;
}

interface TimelineChartProps {
  data: TimelineData[];
  title?: string;
}

export function TimelineChart({ data, title }: TimelineChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={{ stroke: "#e5e7eb" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
            cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm text-text-secondary capitalize">
                {value.replace(/([A-Z])/g, " $1").trim()}
              </span>
            )}
          />
          <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="inProgress" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
