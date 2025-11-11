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
  const [view, setView] = useState<'select' | 'posts'>('posts');
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: '' });

  useEffect(() => {
    fetchProducts();
    fetchGeneratedPosts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
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
          setSelectedIds(new Set());
          fetchGeneratedPosts();
          setView('posts');
        }, 2000);
      } else {
        setGenerationProgress({ current: 0, total: 0, status: '' });
        alert('Failed to generate posts: ' + data.error);
      }
    } catch (error) {
      console.error('Generate posts error:', error);
      setGenerationProgress({ current: 0, total: 0, status: '' });
      alert('Failed to generate posts');
    } finally {
      setTimeout(() => {
        setGenerating(false);
        setGenerationProgress({ current: 0, total: 0, status: '' });
      }, 2000);
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

  const handleRegeneratePost = async (post: GeneratedPost) => {
    if (!confirm('Regenerate this post? The current text will be replaced.')) return;

    try {
      setGenerating(true);
      setGenerationProgress({ current: 0, total: 1, status: 'Regenerating post...' });

      const response = await fetch('/api/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [post.product_id],
          schedule: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Delete the old post
        await fetch(`/api/generated-posts?id=${post.id}`, {
          method: 'DELETE',
        });

        setGenerationProgress({ current: 1, total: 1, status: 'Post regenerated successfully!' });
        setTimeout(() => {
          setGenerating(false);
          setGenerationProgress({ current: 0, total: 0, status: '' });
          fetchGeneratedPosts();
        }, 1500);
      } else {
        setGenerating(false);
        alert('Failed to regenerate post: ' + data.error);
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      setGenerating(false);
      alert('Failed to regenerate post');
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;

    try {
      await fetch(`/api/generated-posts?id=${postId}`, {
        method: 'DELETE',
      });

      await fetchGeneratedPosts();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post');
    }
  };

  const getRelativeDate = (dateStr: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scheduled = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
    scheduled.setHours(0, 0, 0, 0);

    const diffDays = Math.round((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return formatDate(dateStr);
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
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              Select Products ({products.length})
            </button>
            <button
              onClick={() => setView('posts')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'posts'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
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
                      <div className="font-medium text-sm text-gray-900 line-clamp-2">
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
                            <span className="font-medium">{getRelativeDate(post.scheduled_date)}</span> at{' '}
                            {formatTime(post.scheduled_time)}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-900 text-xs rounded-full">
                          {post.status}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 mb-4 whitespace-pre-wrap text-sm text-gray-900">
                        {post.post_text}
                      </div>

                      <div className="flex gap-2 flex-wrap">
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
                        <button
                          onClick={() => handleRegeneratePost(post)}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium"
                        >
                          🔄 Regenerate
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                        >
                          🗑 Delete
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
      {view === 'select' && selectedIds.size > 0 && !generating && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
            </div>
            <button
              onClick={generatePosts}
              disabled={generating}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
            >
              {generating ? 'Generating...' : `Generate ${selectedIds.size} Post${selectedIds.size !== 1 ? 's' : ''} ✨`}
            </button>
          </div>
        </div>
      )}

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
