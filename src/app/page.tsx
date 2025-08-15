'use client';

import { useState } from 'react';
import GoogleMap from '@/components/GoogleMap';

interface Location {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function Home() {
  const [input, setInput] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    setLocations([]);

    try {
      const response = await fetch('/api/extract-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract location');
      }

      const data = await response.json();
      setLocations(data.locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setInput('');
    setLocations([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Location Finder
            </h1>
            <p className="text-xl text-gray-600">
              Describe any place and get it on Google Maps with directions
            </p>
          </header>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label 
                  htmlFor="location-input" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Describe a location:
                </label>
                <textarea
                  id="location-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., 'The coffee shop near Central Park in Manhattan', 'Eiffel Tower in Paris', 'closest Starbucks to Times Square'"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Finding Location...
                    </span>
                  ) : (
                    'Find Location'
                  )}
                </button>
                
                {(input || locations.length > 0 || error) && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>

          {locations.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {locations.length === 1 ? 'Location Found' : `${locations.length} Locations Found`}
              </h2>
              <GoogleMap locations={locations} />
            </div>
          )}

          <footer className="text-center mt-12 text-sm text-gray-500">
            <p>
              Powered by AI for location extraction and Google Maps for navigation
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
