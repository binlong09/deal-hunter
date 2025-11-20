'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PriceChart from '@/components/PriceChart';

interface TrackedProduct {
  id: number;
  url: string;
  product_name: string | null;
  current_price: number | null;
  currency: string;
  image_url: string | null;
  store_name: string | null;
  priority: number;
  check_frequency: number;
  last_checked_at: string | null;
  last_price_change_at: string | null;
  is_active: number;
  created_at: string;
  price_check_count: number;
  unread_alerts: number;
  authenticity_score: number | null;
  authenticity_verdict: string | null;
  authenticity_reasoning: string | null;
  authenticity_checked_at: string | null;
}

interface DealAlert {
  id: number;
  tracked_product_id: number;
  alert_type: string;
  old_price: number | null;
  new_price: number | null;
  discount_percent: number | null;
  deal_score: number | null;
  deal_quality: string | null;
  message: string | null;
  is_read: number;
  created_at: string;
  product: TrackedProduct;
}

export default function DealsPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [alerts, setAlerts] = useState<DealAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProductUrl, setNewProductUrl] = useState('');
  const [newProductPriority, setNewProductPriority] = useState(2);
  const [checkingPrices, setCheckingPrices] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<number, any[]>>({});

  useEffect(() => {
    fetchProducts();
    fetchAlerts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/tracked-products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/deal-alerts?limit=20');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductUrl) return;

    setAddingProduct(true);
    try {
      const response = await fetch('/api/tracked-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newProductUrl,
          priority: newProductPriority,
        }),
      });

      if (response.ok) {
        setNewProductUrl('');
        setNewProductPriority(2);
        await fetchProducts();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Failed to add product');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Remove this product from tracking?')) return;

    try {
      await fetch(`/api/tracked-products?id=${id}`, { method: 'DELETE' });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleToggleActive = async (id: number, currentActive: number) => {
    try {
      await fetch(`/api/tracked-products?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentActive === 1 ? 0 : 1 }),
      });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const handleCheckPrices = async () => {
    setCheckingPrices(true);
    try {
      const response = await fetch('/api/check-prices', { method: 'POST' });
      if (response.ok) {
        await fetchProducts();
        await fetchAlerts();
        alert('Price check complete! Check the alerts section for any deals.');
      }
    } catch (error) {
      console.error('Failed to check prices:', error);
      alert('Failed to check prices');
    } finally {
      setCheckingPrices(false);
    }
  };

  const togglePriceChart = async (productId: number) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(productId);
      // Fetch price history if not already loaded
      if (!priceHistory[productId]) {
        try {
          const response = await fetch(`/api/price-history?productId=${productId}&limit=30`);
          const data = await response.json();
          setPriceHistory(prev => ({ ...prev, [productId]: data.history }));
        } catch (error) {
          console.error('Failed to fetch price history:', error);
        }
      }
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority === 1) return { label: 'High', color: 'bg-red-100 text-red-800' };
    if (priority === 2) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Low', color: 'bg-gray-100 text-gray-800' };
  };

  const getDealQualityColor = (quality: string | null) => {
    if (quality === 'amazing') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (quality === 'great') return 'bg-green-100 text-green-800 border-green-300';
    if (quality === 'good') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (quality === 'fair') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getAuthenticityBadge = (verdict: string | null, score: number | null) => {
    if (!verdict) return null;

    const badges = {
      GENUINE: { icon: '✓', label: 'Verified Deal', color: 'bg-green-100 text-green-800 border-green-300' },
      LIKELY_GENUINE: { icon: '✓', label: 'Likely Genuine', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      SUSPICIOUS: { icon: '⚠', label: 'Suspicious', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      LIKELY_FAKE: { icon: '⚠', label: 'Likely Fake', color: 'bg-orange-100 text-orange-800 border-orange-300' },
      UNKNOWN: { icon: '?', label: 'Unverified', color: 'bg-gray-100 text-gray-800 border-gray-300' },
    };

    const badge = badges[verdict as keyof typeof badges] || badges.UNKNOWN;

    return {
      ...badge,
      score,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Deal Tracker</h1>
              <p className="text-sm text-gray-600">Monitor prices and get notified of great deals</p>
            </div>
            <div className="flex gap-3">
              <Link href="/categories" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium">
                🏷️ Category Tracking
              </Link>
              <button
                onClick={handleCheckPrices}
                disabled={checkingPrices}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {checkingPrices ? '⏳ Checking...' : '🔄 Check Prices'}
              </button>
              <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium">
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Add Product Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Track New Product</h2>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product URL
              </label>
              <input
                type="url"
                value={newProductUrl}
                onChange={(e) => setNewProductUrl(e.target.value)}
                placeholder="https://www.amazon.com/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Supports Amazon, Target, Walmart, Costco, and more
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="flex gap-3">
                {[
                  { value: 1, label: 'High (check every 3h)', emoji: '🔴' },
                  { value: 2, label: 'Medium (check every 12h)', emoji: '🟡' },
                  { value: 3, label: 'Low (check daily)', emoji: '⚪' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={newProductPriority === option.value}
                      onChange={(e) => setNewProductPriority(Number(e.target.value))}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">
                      {option.emoji} {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={addingProduct}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {addingProduct ? '⏳ Adding Product...' : '➕ Track This Product'}
            </button>
          </form>
        </div>

        {/* Deal Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 Recent Deal Alerts ({alerts.filter(a => a.is_read === 0).length} unread)
            </h2>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`border-2 rounded-lg p-4 ${getDealQualityColor(alert.deal_quality)} ${alert.is_read === 0 ? 'font-medium' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {alert.deal_quality === 'amazing' && '🌟'}
                          {alert.deal_quality === 'great' && '🎉'}
                          {alert.deal_quality === 'good' && '👍'}
                          {alert.deal_quality === 'fair' && '📌'}
                        </span>
                        <h3 className="font-semibold">{alert.product?.product_name}</h3>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-sm">
                        <span className="line-through">${alert.old_price}</span>
                        <span className="text-lg font-bold">${alert.new_price}</span>
                        <span className="px-2 py-1 bg-white rounded-full">
                          {alert.discount_percent?.toFixed(1)}% OFF
                        </span>
                        {alert.deal_score && (
                          <span className="px-2 py-1 bg-white rounded-full">
                            Score: {alert.deal_score}/100
                          </span>
                        )}
                      </div>
                      {alert.message && (
                        <p className="mt-2 text-sm">{alert.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tracked Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tracked Products ({products.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No products tracked yet. Add one above!
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => {
                const priorityInfo = getPriorityLabel(product.priority);
                return (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 ${product.is_active === 0 ? 'bg-gray-50 opacity-60' : ''}`}
                  >
                    <div className="flex gap-4">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.product_name || ''}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {product.product_name || 'Unknown Product'}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {product.store_name} • {product.url.length > 50 ? product.url.substring(0, 50) + '...' : product.url}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleActive(product.id, product.is_active)}
                              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                            >
                              {product.is_active === 1 ? 'Pause' : 'Resume'}
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Current Price:</span>
                            <span className="ml-2 text-lg font-bold text-gray-900">
                              {product.current_price ? `${product.currency} ${product.current_price}` : 'N/A'}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                          {product.unread_alerts > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {product.unread_alerts} new alerts
                            </span>
                          )}
                          {(() => {
                            const authBadge = getAuthenticityBadge(product.authenticity_verdict, product.authenticity_score);
                            if (authBadge) {
                              return (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium border ${authBadge.color}`}
                                  title={product.authenticity_reasoning || ''}
                                >
                                  {authBadge.icon} {authBadge.label}
                                  {authBadge.score && ` (${authBadge.score})`}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Checked {product.price_check_count} times
                          {product.last_checked_at && ` • Last: ${new Date(product.last_checked_at).toLocaleString()}`}
                        </div>

                        {/* View Price History Button */}
                        {product.price_check_count > 1 && (
                          <div className="mt-3">
                            <button
                              onClick={() => togglePriceChart(product.id)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              {expandedProductId === product.id ? '▼' : '▶'}
                              {expandedProductId === product.id ? 'Hide' : 'View'} Price History
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price Chart - Expanded */}
                    {expandedProductId === product.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {priceHistory[product.id] ? (
                          <PriceChart
                            data={priceHistory[product.id]}
                            currency={product.currency}
                          />
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            Loading price history...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
