'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CategoryTracker {
  id: number;
  name: string;
  description: string | null;
  search_keywords: string;
  max_price: number | null;
  min_price: number | null;
  min_discount_percent: number | null;
  category: string | null;
  store_filter: string[] | null;
  is_active: number;
  active_matches: number;
  unread_alerts: number;
  last_checked_at: string | null;
  created_at: string;
}

interface CategoryMatch {
  id: number;
  product_url: string;
  product_name: string;
  current_price: number;
  original_price: number;
  currency: string;
  image_url: string | null;
  store_name: string;
  discount_percent: number;
  match_score: number;
  first_seen_at: string;
}

export default function CategoriesPage() {
  const [trackers, setTrackers] = useState<CategoryTracker[]>([]);
  const [matches, setMatches] = useState<Record<number, CategoryMatch[]>>({});
  const [loading, setLoading] = useState(true);
  const [addingTracker, setAddingTracker] = useState(false);
  const [expandedTrackerId, setExpandedTrackerId] = useState<number | null>(null);

  // Form state
  const [newTrackerName, setNewTrackerName] = useState('');
  const [newTrackerKeywords, setNewTrackerKeywords] = useState('');
  const [newTrackerMaxPrice, setNewTrackerMaxPrice] = useState('');
  const [newTrackerCategory, setNewTrackerCategory] = useState('');
  const [newTrackerStores, setNewTrackerStores] = useState(['Amazon']);

  useEffect(() => {
    fetchTrackers();
  }, []);

  const fetchTrackers = async () => {
    try {
      const response = await fetch('/api/category-trackers');
      const data = await response.json();
      setTrackers(data.trackers || []);
    } catch (error) {
      console.error('Failed to fetch trackers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async (trackerId: number) => {
    if (matches[trackerId]) return; // Already loaded

    try {
      const response = await fetch(`/api/category-matches?trackerId=${trackerId}`);
      const data = await response.json();
      setMatches((prev) => ({ ...prev, [trackerId]: data.matches || [] }));
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  };

  const handleAddTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackerName || !newTrackerKeywords) return;

    setAddingTracker(true);
    try {
      const response = await fetch('/api/category-trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTrackerName,
          search_keywords: newTrackerKeywords,
          max_price: newTrackerMaxPrice ? parseFloat(newTrackerMaxPrice) : null,
          category: newTrackerCategory || null,
          store_filter: newTrackerStores,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewTrackerName('');
        setNewTrackerKeywords('');
        setNewTrackerMaxPrice('');
        setNewTrackerCategory('');
        await fetchTrackers();
        alert(data.message || 'Category tracker created!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create tracker');
      }
    } catch (error) {
      console.error('Failed to create tracker:', error);
      alert('Failed to create tracker');
    } finally {
      setAddingTracker(false);
    }
  };

  const handleDeleteTracker = async (id: number) => {
    if (!confirm('Delete this category tracker?')) return;

    try {
      await fetch(`/api/category-trackers?id=${id}`, { method: 'DELETE' });
      await fetchTrackers();
    } catch (error) {
      console.error('Failed to delete tracker:', error);
    }
  };

  const toggleMatches = (trackerId: number) => {
    if (expandedTrackerId === trackerId) {
      setExpandedTrackerId(null);
    } else {
      setExpandedTrackerId(trackerId);
      fetchMatches(trackerId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Category Tracking</h1>
              <p className="text-sm text-gray-600">Track product categories like "any air fryer under $50"</p>
            </div>
            <Link href="/deals" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium">
              ← Back to Deals
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Add Category Tracker Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Category Tracker</h2>
          <form onSubmit={handleAddTracker} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracker Name
                </label>
                <input
                  type="text"
                  value={newTrackerName}
                  onChange={(e) => setNewTrackerName(e.target.value)}
                  placeholder="e.g., Air Fryers Under $50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Keywords
                </label>
                <input
                  type="text"
                  value={newTrackerKeywords}
                  onChange={(e) => setNewTrackerKeywords(e.target.value)}
                  placeholder="e.g., air fryer, airfryer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTrackerMaxPrice}
                  onChange={(e) => setNewTrackerMaxPrice(e.target.value)}
                  placeholder="50.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={newTrackerCategory}
                  onChange={(e) => setNewTrackerCategory(e.target.value)}
                  placeholder="e.g., Kitchen Appliances"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stores to Search
              </label>
              <div className="flex gap-3">
                {['Amazon', 'Target', 'Walmart'].map((store) => (
                  <label key={store} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTrackerStores.includes(store)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewTrackerStores([...newTrackerStores, store]);
                        } else {
                          setNewTrackerStores(newTrackerStores.filter((s) => s !== store));
                        }
                      }}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{store}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={addingTracker}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {addingTracker ? '⏳ Creating Tracker...' : '➕ Create Category Tracker'}
            </button>
          </form>
        </div>

        {/* Category Trackers List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active Category Trackers ({trackers.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : trackers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No category trackers yet. Create one above!
            </div>
          ) : (
            <div className="space-y-4">
              {trackers.map((tracker) => (
                <div key={tracker.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{tracker.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Keywords: {tracker.search_keywords}
                        {tracker.max_price && ` • Max Price: $${tracker.max_price}`}
                        {tracker.category && ` • Category: ${tracker.category}`}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                          {tracker.active_matches} matches
                        </span>
                        {tracker.unread_alerts > 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                            {tracker.unread_alerts} new alerts
                          </span>
                        )}
                        {tracker.store_filter && (
                          <span className="text-gray-500">
                            Stores: {tracker.store_filter.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTracker(tracker.id)}
                      className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* View Matches Button */}
                  {tracker.active_matches > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleMatches(tracker.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        {expandedTrackerId === tracker.id ? '▼' : '▶'}
                        {expandedTrackerId === tracker.id ? 'Hide' : 'View'} Matches ({tracker.active_matches})
                      </button>
                    </div>
                  )}

                  {/* Matches List */}
                  {expandedTrackerId === tracker.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {matches[tracker.id] ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {matches[tracker.id].map((match) => (
                            <div key={match.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                              <div className="flex gap-3">
                                {match.image_url && (
                                  <img
                                    src={match.image_url}
                                    alt={match.product_name}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                                    {match.product_name}
                                  </h4>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-lg font-bold text-gray-900">
                                      ${match.current_price}
                                    </span>
                                    {match.discount_percent > 0 && (
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                        {match.discount_percent.toFixed(0)}% OFF
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                    <span>{match.store_name}</span>
                                    <span>•</span>
                                    <span>Match: {match.match_score}/100</span>
                                  </div>
                                  <a
                                    href={match.product_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    View Product →
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          Loading matches...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
