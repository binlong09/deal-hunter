'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface PriceHistoryPoint {
  date: string;
  price: number;
  checked_at: string;
}

interface PriceChartProps {
  data: PriceHistoryPoint[];
  currency?: string;
}

export default function PriceChart({ data, currency = 'USD' }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        No price history available yet
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((point) => ({
    date: new Date(point.checked_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    price: point.price,
    fullDate: new Date(point.checked_at).toLocaleString(),
  }));

  // Calculate price stats
  const prices = data.map((p) => p.price);
  const currentPrice = prices[prices.length - 1];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Calculate trend
  const firstPrice = prices[0];
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = ((priceChange / firstPrice) * 100).toFixed(1);
  const isIncreasing = priceChange > 0;

  return (
    <div className="space-y-4">
      {/* Price Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-600 font-medium">Current</div>
          <div className="text-lg font-bold text-blue-900">${currentPrice.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="text-xs text-green-600 font-medium">Lowest</div>
          <div className="text-lg font-bold text-green-900">${lowestPrice.toFixed(2)}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <div className="text-xs text-red-600 font-medium">Highest</div>
          <div className="text-lg font-bold text-red-900">${highestPrice.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 font-medium">Average</div>
          <div className="text-lg font-bold text-gray-900">${averagePrice.toFixed(2)}</div>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Trend:</span>
        <span className={`flex items-center gap-1 font-semibold ${isIncreasing ? 'text-red-600' : 'text-green-600'}`}>
          {isIncreasing ? '📈' : '📉'}
          {isIncreasing ? '+' : ''}{priceChangePercent}%
          <span className="text-xs font-normal text-gray-500">
            ({isIncreasing ? '+' : ''}{currency} {priceChange.toFixed(2)} since first check)
          </span>
        </span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Price History</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`$${value.toFixed(2)}`, 'Price']}
              labelFormatter={(label) => chartData.find(d => d.date === label)?.fullDate || label}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorPrice)"
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Price Check Count */}
      <div className="text-xs text-gray-500 text-center">
        {data.length} price {data.length === 1 ? 'check' : 'checks'} recorded
      </div>
    </div>
  );
}
