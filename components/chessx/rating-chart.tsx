'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { type ChartPoint, formatUSD } from '@/lib/market-data'

export function RatingChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-64 w-full flex-1 sm:h-72 xl:h-auto xl:min-h-72" role="img" aria-label="Rating price history chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8391a7', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
            tickLine={false}
            axisLine={{ stroke: '#1f2937' }}
            minTickGap={28}
          />
          <YAxis
            orientation="right"
            domain={['dataMin - 4', 'dataMax + 4']}
            tick={{ fill: '#8391a7', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            cursor={{ stroke: '#22c55e', strokeOpacity: 0.4, strokeDasharray: '3 3' }}
            contentStyle={{
              background: '#090d16',
              border: '1px solid #253045',
              borderRadius: 6,
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 12,
            }}
            labelStyle={{ color: '#8391a7' }}
            itemStyle={{ color: '#22c55e' }}
            formatter={(value) => [formatUSD(Number(value)), 'Rating']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#ratingFill)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', stroke: '#090d16', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
