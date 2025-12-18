'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SummaryStats {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageProfit: number;
  totalCustomers: number;
  totalBatches: number;
  recentSales: number;
  recentRevenue: number;
  recentProfit: number;
  paymentBreakdown: {
    paid: number;
    unpaid: number;
    deposit: number;
    unknown: number;
  };
  topCategory: string | null;
  topCategoryRevenue: number;
}

interface TopProduct {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averagePrice: number;
  averageProfit: number;
  lastSoldAt: string | null;
}

interface CategoryStats {
  category: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageProfit: number;
  profitMargin: number;
  uniqueProducts: number;
  topProduct: string | null;
  recentSales: number;
}

interface UnsoldItem {
  id: number;
  productName: string;
  category: string | null;
  brand: string | null;
  postedAt: string;
  daysSincePosted: number;
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [unsoldItems, setUnsoldItems] = useState<UnsoldItem[]>([]);
  const [unsoldSummary, setUnsoldSummary] = useState<{ totalPosted: number; totalUnsold: number; unsoldRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'unsold'>('overview');
  const [productSortBy, setProductSortBy] = useState<'volume' | 'revenue' | 'profit'>('volume');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchTopProducts();
    }
  }, [productSortBy]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSummary(),
      fetchTopProducts(),
      fetchCategories(),
      fetchUnsold(),
    ]);
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/analytics/summary');
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const response = await fetch(`/api/analytics/top-products?sortBy=${productSortBy}&limit=20`);
      const data = await response.json();
      setTopProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch top products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/analytics/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchUnsold = async () => {
    try {
      const response = await fetch('/api/analytics/unsold');
      const data = await response.json();
      setUnsoldItems(data.items || []);
      setUnsoldSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch unsold items:', error);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
              <p className="text-sm text-gray-600">Track performance and identify trends</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/recommendations"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                View Recommendations
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

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Top Products' },
              { id: 'categories', label: 'Categories' },
              { id: 'unsold', label: 'Unsold Items' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && summary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-500">Total Sales</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalSales)}</div>
                <div className="text-xs text-green-600 mt-1">
                  +{formatNumber(summary.recentSales)} last 30 days
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                <div className="text-2xl font-bold text-gray-900">{formatVND(summary.totalRevenue)}</div>
                <div className="text-xs text-green-600 mt-1">
                  +{formatVND(summary.recentRevenue)} last 30 days
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-500">Total Profit</div>
                <div className="text-2xl font-bold text-green-600">{formatVND(summary.totalProfit)}</div>
                <div className="text-xs text-green-600 mt-1">
                  +{formatVND(summary.recentProfit)} last 30 days
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-500">Avg Profit/Sale</div>
                <div className="text-2xl font-bold text-gray-900">{formatVND(summary.averageProfit)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatNumber(summary.totalBatches)} batches
                </div>
              </div>
            </div>

            {/* Payment Breakdown & Top Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      Paid
                    </span>
                    <span className="font-semibold">{formatNumber(summary.paymentBreakdown.paid)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                      Deposit
                    </span>
                    <span className="font-semibold">{formatNumber(summary.paymentBreakdown.deposit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      Unpaid
                    </span>
                    <span className="font-semibold">{formatNumber(summary.paymentBreakdown.unpaid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                      Unknown
                    </span>
                    <span className="font-semibold">{formatNumber(summary.paymentBreakdown.unknown)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Top Category</div>
                    <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {summary.topCategory && getCategoryIcon(summary.topCategory)}
                      {summary.topCategory || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatVND(summary.topCategoryRevenue)} revenue
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Unique Customers</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatNumber(summary.totalCustomers)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
              <div className="flex gap-2">
                {['volume', 'revenue', 'profit'].map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setProductSortBy(sort as typeof productSortBy)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
                      productSortBy === sort
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    By {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topProducts.map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.brand && (
                          <div className="text-xs text-gray-500">{product.brand}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {getCategoryIcon(product.category)}
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatNumber(product.totalSales)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatVND(product.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                        {formatVND(product.totalProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Category Breakdown</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.category}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{getCategoryIcon(cat.category)}</span>
                    <div>
                      <div className="font-semibold text-gray-900 capitalize">{cat.category}</div>
                      <div className="text-xs text-gray-500">
                        {formatNumber(cat.uniqueProducts)} products
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Sales</span>
                      <span className="font-medium">{formatNumber(cat.totalSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Revenue</span>
                      <span className="font-medium">{formatVND(cat.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Profit</span>
                      <span className="font-medium text-green-600">{formatVND(cat.totalProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Margin</span>
                      <span className={`font-medium ${cat.profitMargin > 20 ? 'text-green-600' : cat.profitMargin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {cat.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    {cat.topProduct && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">Top seller</div>
                        <div className="text-sm font-medium truncate">{cat.topProduct}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unsold Tab */}
        {activeTab === 'unsold' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unsold Items</h2>
                <p className="text-sm text-gray-600">
                  Items posted more than 14 days ago without a matching sale
                </p>
              </div>
              {unsoldSummary && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {unsoldSummary.unsoldRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {unsoldSummary.totalUnsold} of {unsoldSummary.totalPosted} unsold
                  </div>
                </div>
              )}
            </div>

            {unsoldItems.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <div className="text-lg font-medium text-gray-900">No unsold items!</div>
                <div className="text-gray-600">All posted items have found buyers.</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posted</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days Ago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {unsoldItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          {item.brand && (
                            <div className="text-xs text-gray-500">{item.brand}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                              {getCategoryIcon(item.category)}
                              {item.category}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(item.postedAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.daysSincePosted > 30
                              ? 'bg-red-100 text-red-800'
                              : item.daysSincePosted > 21
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.daysSincePosted} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
