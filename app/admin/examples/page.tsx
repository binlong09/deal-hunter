'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ExamplePost {
  id: number;
  product_category: string | null;
  product_type: string | null;
  post_text: string;
  style_notes: string | null;
  emoji_density: number;
  is_active: number;
  created_at: string;
}

export default function ExamplePostsPage() {
  const [posts, setPosts] = useState<ExamplePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_category: '',
    product_type: '',
    post_text: '',
    style_notes: '',
    emoji_density: 0.15,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/example-posts');
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch example posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!formData.post_text.trim()) {
      alert('Post text is required');
      return;
    }

    try {
      await fetch('/api/example-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      await fetchPosts();
      setShowForm(false);
      setFormData({
        product_category: '',
        product_type: '',
        post_text: '',
        style_notes: '',
        emoji_density: 0.15,
      });
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create example post');
    }
  };

  const toggleActive = async (id: number, currentActive: number) => {
    try {
      await fetch(`/api/example-posts?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentActive === 1 ? 0 : 1 }),
      });

      await fetchPosts();
    } catch (error) {
      console.error('Failed to update post:', error);
    }
  };

  const deletePost = async (id: number) => {
    if (!confirm('Delete this example post?')) return;

    try {
      await fetch(`/api/example-posts?id=${id}`, {
        method: 'DELETE',
      });

      await fetchPosts();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Example Posts</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                {showForm ? 'Cancel' : '+ Add Example'}
              </button>
              <Link href="/" className="px-4 py-2 text-gray-600 hover:text-gray-900">
                ← Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Active Examples Summary */}
        {posts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-semibold text-blue-900">
                  {posts.filter(p => p.is_active === 1).length} of {posts.length} examples are active
                </p>
                <p className="text-sm text-blue-700">
                  Active examples will be used to train the AI when generating posts. Click &quot;Disable&quot; to exclude an example without deleting it.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Example Post</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Category
                  </label>
                  <select
                    value={formData.product_category}
                    onChange={(e) =>
                      setFormData({ ...formData, product_category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  >
                    <option value="">Select category</option>
                    <option value="supplements">Supplements</option>
                    <option value="baby">Baby</option>
                    <option value="cosmetics">Cosmetics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type
                  </label>
                  <input
                    type="text"
                    value={formData.product_type}
                    onChange={(e) =>
                      setFormData({ ...formData, product_type: e.target.value })
                    }
                    placeholder="e.g., Vitamins, Diapers"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post Text
                </label>
                <textarea
                  value={formData.post_text}
                  onChange={(e) =>
                    setFormData({ ...formData, post_text: e.target.value })
                  }
                  rows={8}
                  placeholder="Enter example post text..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style Notes
                </label>
                <input
                  type="text"
                  value={formData.style_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, style_notes: e.target.value })
                  }
                  placeholder="e.g., Casual tone, lots of emojis"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>

              <button
                onClick={createPost}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                Create Example Post
              </button>
            </div>
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500 mb-4">No example posts yet</p>
            <p className="text-sm text-gray-400">
              Add example posts to train the AI on your writing style
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`rounded-lg shadow-sm p-6 ${
                  post.is_active === 0
                    ? 'bg-gray-100 border-2 border-gray-300'
                    : 'bg-white border-2 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {post.is_active === 1 && (
                      <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold">
                        ✓ IN USE
                      </span>
                    )}
                    {post.is_active === 0 && (
                      <span className="inline-block px-2 py-1 bg-gray-500 text-white text-xs rounded-full">
                        DISABLED
                      </span>
                    )}
                    {post.product_category && (
                      <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                        {post.product_category}
                      </span>
                    )}
                    {post.product_type && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-900 text-xs rounded-full">
                        {post.product_type}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(post.id, post.is_active)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        post.is_active === 1
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {post.is_active === 1 ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-3 whitespace-pre-wrap text-sm text-gray-900 font-mono">
                  {post.post_text}
                </div>

                {post.style_notes && (
                  <div className="text-xs text-gray-500">
                    <strong>Style Notes:</strong> {post.style_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
