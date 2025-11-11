'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { classNames } from '@/lib/utils';

interface Product {
  id: number;
  image_url: string;
  thumbnail_url: string;
  product_name: string | null;
  category: string;
  current_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'posted';
  starred: number;
  sku: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: '' });

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id: number, updates: Partial<Product>) => {
    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await response.json();

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
      );
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;

    try {
      await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });

      await fetchProducts();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete product');
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Delete ${selectedIds.size} product${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/products?id=${id}`, { method: 'DELETE' })
        )
      );

      await fetchProducts();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete products');
    }
  };

  const generatePosts = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one product');
      return;
    }

    const total = selectedIds.size;
    setGenerating(true);
    setGenerationProgress({ current: 0, total, status: 'Preparing to generate posts...' });

    try {
      // Simulate progress updates (since API doesn't stream progress)
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev.current < prev.total) {
            return {
              ...prev,
              current: Math.min(prev.current + 1, prev.total),
              status: `Generating post ${Math.min(prev.current + 1, prev.total)} of ${prev.total}...`,
            };
          }
          return prev;
        });
      }, 3000); // Update every 3 seconds (approximate time per post)

      const response = await fetch('/api/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedIds),
          schedule: true,
        }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (response.ok) {
        setGenerationProgress({ current: total, total, status: `Successfully generated ${data.total} posts!` });
        setTimeout(() => {
          setGenerating(false);
          setGenerationProgress({ current: 0, total: 0, status: '' });
          setSelectedIds(new Set());

          // Ask user if they want to view the generated posts
          if (confirm(`Successfully generated ${data.total} posts! Would you like to view them now?`)) {
            router.push('/generate');
          }
        }, 2000);
      } else {
        setGenerationProgress({ current: 0, total: 0, status: '' });
        setGenerating(false);
        alert('Failed to generate posts: ' + data.error);
      }
    } catch (error) {
      console.error('Generate posts error:', error);
      setGenerationProgress({ current: 0, total: 0, status: '' });
      setGenerating(false);
      alert('Failed to generate posts');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Product Curation</h1>
            <Link
              href="/"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Home
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
            >
              <option value="all">All Categories</option>
              <option value="supplements">💊 Supplements</option>
              <option value="baby">👶 Baby</option>
              <option value="cosmetics">💄 Cosmetics</option>
              <option value="food">🍎 Food</option>
              <option value="household">🧹 Household</option>
              <option value="personal_care">🧴 Personal Care</option>
              <option value="electronics">📱 Electronics</option>
              <option value="other">📦 Other</option>
            </select>

            <button
              onClick={selectAll}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-900"
            >
              {selectedIds.size === products.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Action Bar */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={generatePosts}
                disabled={generating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium"
              >
                ✨ Generate {selectedIds.size} Post{selectedIds.size !== 1 ? 's' : ''}
              </button>
              <button
                onClick={bulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                🗑 Delete {selectedIds.size}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading products...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500">No products found</p>
            <Link
              href="/capture"
              className="inline-block mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Start Capturing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className={classNames(
                  'bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all',
                  selectedIds.has(product.id)
                    ? 'ring-2 ring-indigo-500'
                    : 'hover:shadow-md'
                )}
                onClick={() => toggleSelect(product.id)}
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={product.thumbnail_url || product.image_url}
                    alt={product.product_name || 'Product'}
                    className="w-full h-full object-cover"
                  />

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    {product.starred === 1 && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        ⭐
                      </span>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {selectedIds.has(product.id) && (
                    <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl">
                        ✓
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="text-xs text-gray-500 mb-1">
                    {product.category}
                    {product.sku && <span className="ml-2">#{product.sku}</span>}
                  </div>
                  {product.product_name && (
                    <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                      {product.product_name}
                    </div>
                  )}
                  {product.current_price ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-green-600">
                          ${product.current_price.toFixed(2)}
                        </span>
                        {product.original_price && product.original_price > product.current_price && (
                          <span className="text-xs text-gray-400 line-through">
                            ${product.original_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {product.discount_percent && product.discount_percent > 0 && (
                        <div className="text-xs text-red-600 font-semibold">
                          Save {product.discount_percent}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Price not detected</div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateProduct(product.id, {
                          starred: product.starred === 1 ? 0 : 1,
                        });
                      }}
                      className={classNames(
                        'flex-1 px-2 py-1 rounded text-xs',
                        product.starred === 1
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      ⭐
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProduct(product.id);
                      }}
                      className="flex-1 px-2 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Modal */}
      {generating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              {/* Animated Icon */}
              <div className="mb-6">
                <div className="inline-block animate-bounce">
                  <span className="text-6xl">✨</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Generating Posts
              </h2>

              {/* Status Text */}
              <p className="text-gray-600 mb-6">
                {generationProgress.status || 'Please wait...'}
              </p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{generationProgress.current} / {generationProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Estimated Time */}
              <div className="text-sm text-gray-500">
                {generationProgress.total > 0 && generationProgress.current < generationProgress.total && (
                  <p>Estimated time: ~{Math.ceil((generationProgress.total - generationProgress.current) * 3)} seconds</p>
                )}
                {generationProgress.current === generationProgress.total && generationProgress.total > 0 && (
                  <p className="text-green-600 font-semibold">✓ Complete! Redirecting...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
