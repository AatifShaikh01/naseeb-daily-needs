"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartColumn, TrendingUp, Wallet } from "lucide-react";

import type { DailySalesPoint } from "@/lib/analytics";

/* Brand primary (teal-green) + its light tint for inactive bars */
const BRAND = "#0f766e";
const BRAND_LIGHT = "#c3dddb";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Hover/tap par us din ki sale dikhata hai. */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { label?: string; date?: string; amount?: number } }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-card">
      <p className="text-xs font-medium text-muted-foreground">{point.label ?? point.date}</p>
      <p className="text-sm font-bold" style={{ color: BRAND }}>{money(point.amount ?? 0)}</p>
    </div>
  );
}

/** Sales Overview card — icon header, total panel with % change vs previous
 *  7 days, Today/Avg. mini stats and a combo chart (rounded bars + line,
 *  current day highlighted). Mobile-first, matches the reference design. */
export function SalesOverviewCard({
  data,
  previousTotal,
}: {
  data: DailySalesPoint[];
  previousTotal: number;
}) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const todayAmount = data[data.length - 1]?.amount ?? 0;
  const avg = data.length ? total / data.length : 0;
  const changePct = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;
  const isUp = (changePct ?? 0) >= 0;
  const lastDate = data[data.length - 1]?.date ?? "";

  const chartData = data.map((d) => ({ ...d, isToday: d.date === lastDate }));

  const yTick = (v: number) =>
    v === 0
      ? "₹0k"
      : v >= 1000
        ? `₹${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
        : `₹${v}`;

  return (
    <div className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/50">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight">Sales Overview</h3>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
        </div>
      </div>

      {/* Total sales + change vs previous week */}
      <div className="mt-4 rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-900/50">
        <p className="text-sm font-semibold text-foreground">Total sales</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">{money(total)}</span>
          {changePct !== null ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
                isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
              }`}
            >
              <TrendingUp className={`h-4 w-4 ${isUp ? "" : "rotate-180"}`} />
              {isUp ? "+" : ""}
              {changePct.toFixed(1)}%
            </span>
          ) : null}
        </div>
      </div>

      {/* Today + Avg. sale mini cards */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-teal-50/80 p-3 dark:bg-teal-950/30">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
              <Wallet className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Today</p>
              <p className="truncate text-lg font-bold">{money(todayAmount)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50/80 p-3 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ChartColumn className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Avg. sale</p>
              <p className="truncate text-lg font-bold">{money(avg)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Combo chart — light bars + line, today highlighted */}
      <div className="mt-5 h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 8, left: -6, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
            <Tooltip
              content={<ChartTooltip />}
              trigger="hover"
              cursor={{ fill: "rgba(15, 118, 110, 0.06)" }}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              dy={8}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={yTick}
            />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={44}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.isToday ? BRAND : BRAND_LIGHT} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="amount"
              stroke={BRAND}
              strokeWidth={2}
              dot={{ r: 3.5, fill: BRAND, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}