'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { copyToClipboard, downloadImage, formatDate, formatTime } from '@/lib/utils';

interface GeneratedPost {
  id: number;
  product_id: number;
  product_name: string;
  category: string;
  scheduled_date: string;
  scheduled_time: string;
  post_text: string;
  optimized_image_url: string;
  status: string;
}

interface Product {
  id: number;
  product_name: string;
  image_url: string;
  category: string;
  current_price: number;
  original_price: number;
  discount_percent: number;
}

export default function GeneratePage() {
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<'select' | 'posts'>('select');

  useEffect(() => {
    fetchApprovedProducts();
    fetchGeneratedPosts();
  }, []);

  const fetchApprovedProducts = async () => {
    try {
      const response = await fetch('/api/products?status=approved');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchGeneratedPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generated-posts?limit=100');
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePosts = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one product');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedIds),
          schedule: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Generated ${data.total} posts!`);
        setSelectedIds(new Set());
        await fetchGeneratedPosts();
        setView('posts');
      } else {
        alert('Failed to generate posts: ' + data.error);
      }
    } catch (error) {
      console.error('Generate posts error:', error);
      alert('Failed to generate posts');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPost = async (post: GeneratedPost) => {
    try {
      await copyToClipboard(post.post_text);
      alert('Post text copied to clipboard!');

      // Update status
      await fetch(`/api/generated-posts?id=${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'copied' }),
      });

      await fetchGeneratedPosts();
    } catch (error) {
      alert('Failed to copy text');
    }
  };

  const handleDownloadImage = async (post: GeneratedPost) => {
    downloadImage(
      post.optimized_image_url,
      `deal-${post.id}.jpg`
    );

    // Update status
    await fetch(`/api/generated-posts?id=${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'downloaded' }),
    });

    await fetchGeneratedPosts();
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">AI Post Generator</h1>
            <Link href="/" className="px-4 py-2 text-gray-600 hover:text-gray-900">
              ← Home
            </Link>
          </div>

          {/* View Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('select')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'select'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Select Products ({products.length})
            </button>
            <button
              onClick={() => setView('posts')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'posts'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Generated Posts ({posts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {view === 'select' ? (
          <>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-500 mb-4">No approved products yet</p>
                <Link
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => toggleSelect(product.id)}
                    className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all ${
                      selectedIds.has(product.id)
                        ? 'ring-2 ring-indigo-500'
                        : 'hover:shadow-md'
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-100">
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                      {selectedIds.has(product.id) && (
                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                          <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl">
                            ✓
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-gray-500">{product.category}</div>
                      <div className="font-medium text-sm line-clamp-2">
                        {product.product_name}
                      </div>
                      {product.current_price && (
                        <div className="text-sm font-bold text-green-600 mt-1">
                          ${product.current_price}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-gray-500">No generated posts yet</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={post.optimized_image_url}
                        alt={post.product_name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {post.product_name || 'Product'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(post.scheduled_date)} at{' '}
                            {formatTime(post.scheduled_time)}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {post.status}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 mb-4 whitespace-pre-wrap text-sm">
                        {post.post_text}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyPost(post)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                        >
                          📋 Copy Text
                        </button>
                        <button
                          onClick={() => handleDownloadImage(post)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                        >
                          📥 Download Image
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Generate Button */}
      {view === 'select' && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
            </div>
            <button
              onClick={generatePosts}
              disabled={generating}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
            >
              {generating ? 'Generating...' : `Generate ${selectedIds.size} Post${selectedIds.size !== 1 ? 's' : ''} ✨`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
