'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchProducts();
  }, [filter, categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
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

  const bulkApprove = async () => {
    if (selectedIds.size === 0) return;

    try {
      await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedIds),
          updates: { status: 'approved' },
        }),
      });

      await fetchProducts();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk approve failed:', error);
    }
  };

  const approvedCount = products.filter((p) => p.status === 'approved').length;

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
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              <option value="supplements">💊 Supplements</option>
              <option value="baby">👶 Baby</option>
              <option value="cosmetics">💄 Cosmetics</option>
            </select>

            <button
              onClick={selectAll}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              {selectedIds.size === products.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Action Bar */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={bulkApprove}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                ✓ Approve {selectedIds.size}
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
                    {product.status === 'approved' && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        ✓
                      </span>
                    )}
                    {product.starred === 1 && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full ml-1">
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
                  </div>
                  {product.product_name && (
                    <div className="font-medium text-sm mb-1 line-clamp-2">
                      {product.product_name}
                    </div>
                  )}
                  {product.current_price && (
                    <div className="text-sm font-bold text-green-600">
                      ${product.current_price}
                    </div>
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
                        updateProduct(product.id, {
                          status: product.status === 'approved' ? 'pending' : 'approved',
                        });
                      }}
                      className={classNames(
                        'flex-1 px-2 py-1 rounded text-xs',
                        product.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action */}
      {approvedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {approvedCount} product{approvedCount !== 1 ? 's' : ''} approved
            </div>
            <Link
              href="/generate"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
            >
              Generate Posts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
