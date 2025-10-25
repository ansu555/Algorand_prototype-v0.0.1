/**
 * Hook to fetch and manage tradeable assets
 */

import { useState, useEffect } from 'react';

export interface AssetInfo {
  id: number;
  name: string;
  unitName: string;
  decimals: number;
  total: number;
  creator: string;
  url?: string;
  verified?: boolean;
  hasPools?: boolean;
  logoUrl?: string;
}

export function useTradeableAssets() {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assets/tradeable');
      const data = await response.json();

      if (data.success) {
        setAssets(data.assets);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch assets');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAssets = async () => {
    try {
      const response = await fetch('/api/assets/tradeable', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setAssets(data.assets);
      }
    } catch (err) {
      console.error('Error refreshing assets:', err);
    }
  };

  return {
    assets,
    loading,
    error,
    refreshAssets,
  };
}

export function useAssetSearch(query: string) {
  const [results, setResults] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchAssets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/assets/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();

        if (data.success) {
          setResults(data.assets);
        }
      } catch (err) {
        console.error('Error searching assets:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchAssets, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return { results, loading };
}
