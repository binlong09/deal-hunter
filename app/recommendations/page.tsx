'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProductRecommendation {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  score: number;
  factors: {
    sellThrough: number;
    profitMargin: number;
    recency: number;
    volume: number;
  };
  reason: string;
  totalSales: number;
  avgProfit: number;
  lastSold: string | null;
  daysSincePosted: number | null;
}

interface CategoryRecommendation {
  category: string;
  score: number;
  avgMargin: number;
  totalSales: number;
  recommendation: 'hot' | 'good' | 'neutral' | 'avoid';
  reason: string;
}

export default function RecommendationsPage() {
  const [products, setProducts] = useState<ProductRecommendation[]>([]);
  const [hotCategories, setHotCategories] = useState<CategoryRecommendation[]>([]);
  const [avoidCategories, setAvoidCategories] = useState<CategoryRecommendation[]>([]);
  const [recentlyPosted, setRecentlyPosted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/recommendations');
      const data = await response.json();
      setProducts(data.postToday || []);
      setHotCategories(data.hotCategories || []);
      setAvoidCategories(data.avoidCategories || []);
      setRecentlyPosted(data.recentlyPosted || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/recommendations', { method: 'POST' });
      await fetchRecommendations();
    } catch (error) {
      console.error('Failed to refresh recommendations:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      supplements: '💊',
      skincare: '🧴',
      cosmetics: '💄',
      fragrance: '🌸',
      baby: '👶',
      food: '🍕',
      bags: '👜',
      clothing: '👕',
      shoes: '👟',
      electronics: '📱',
      household: '🏠',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80)
      return { color: 'bg-green-100 text-green-800 border-green-300', label: 'Excellent' };
    if (score >= 60)
      return { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Good' };
    if (score >= 40)
      return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Fair' };
    return { color: 'bg-red-100 text-red-800 border-red-300', label: 'Low' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
              <p className="text-sm text-gray-600">What to post today based on historical performance</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link
                href="/analytics"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
              >
                View Analytics
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hot & Avoid Categories Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hot Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🔥</span> Hot Categories
            </h2>
            {hotCategories.length === 0 ? (
              <p className="text-gray-500 text-sm">No standout categories at the moment.</p>
            ) : (
              <div className="space-y-3">
                {hotCategories.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(cat.category)}</span>
                      <div>
                        <div className="font-semibold text-gray-900 capitalize">{cat.category}</div>
                        <div className="text-xs text-gray-600">{cat.reason}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{cat.avgMargin.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">margin</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avoid Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚠️</span> Categories to Avoid
            </h2>
            {avoidCategories.length === 0 ? (
              <p className="text-gray-500 text-sm">No categories flagged for avoidance.</p>
            ) : (
              <div className="space-y-3">
                {avoidCategories.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(cat.category)}</span>
                      <div>
                        <div className="font-semibold text-gray-900 capitalize">{cat.category}</div>
                        <div className="text-xs text-red-600">{cat.reason}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">{cat.score}</div>
                      <div className="text-xs text-gray-500">score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* What to Post Today */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">📝</span> What to Post Today
            </h2>
            <span className="text-sm text-gray-500">
              Top {products.length} recommendations (excluding recently posted)
            </span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <div className="text-lg font-medium text-gray-900">No recommendations yet</div>
              <div className="text-gray-600">
                Import sales data to generate personalized recommendations.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product, index) => {
                const scoreBadge = getScoreBadge(product.score);
                const isTopPick = index < 3;

                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 ${
                      isTopPick ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isTopPick && <span className="text-xl">⭐</span>}
                          <span className="text-lg font-semibold text-gray-900">
                            #{index + 1} {product.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${scoreBadge.color}`}
                          >
                            Score: {product.score}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {getCategoryIcon(product.category)}
                            {product.category}
                          </span>
                          {product.brand && (
                            <span className="text-gray-600">{product.brand}</span>
                          )}
                          <span className="text-gray-500">
                            {product.totalSales} sales
                          </span>
                          <span className="text-green-600 font-medium">
                            Avg profit: {formatVND(product.avgProfit)}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Why recommend:</span> {product.reason}
                        </div>
                      </div>

                      <div className="ml-4">
                        {/* Score breakdown */}
                        <div className="text-xs space-y-1 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-500">Sell-through</span>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full"
                                style={{ width: `${product.factors.sellThrough}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-500">Profit</span>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-green-600 h-1.5 rounded-full"
                                style={{ width: `${product.factors.profitMargin}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-500">Recency</span>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${product.factors.recency}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently Posted */}
        {recentlyPosted.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📤</span> Recently Posted (Last 7 Days)
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentlyPosted.map((name, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
