/**
 * Asset Selector Component
 * Dropdown to select assets with search functionality
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { AssetInfo, useAssetSearch } from '@/hooks/use-tradeable-assets';

interface AssetSelectorProps {
  assets: AssetInfo[];
  selected: AssetInfo | null;
  onSelect: (asset: AssetInfo) => void;
  label?: string;
  disabled?: boolean;
}

export function AssetSelector({
  assets,
  selected,
  onSelect,
  label = 'Select Asset',
  disabled = false,
}: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { results: searchResults, loading: searchLoading } = useAssetSearch(searchQuery);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter assets based on search query
  const displayAssets = searchQuery.length >= 2 
    ? searchResults 
    : assets;

  const handleSelect = (asset: AssetInfo) => {
    onSelect(asset);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-3
          bg-background border-2 border-border rounded-lg
          hover:border-primary/50 focus:border-primary focus:outline-none
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selected ? (
            <>
              {selected.logoUrl && (
                <img
                  src={selected.logoUrl}
                  alt={selected.unitName}
                  className="w-8 h-8 rounded-full bg-muted"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="font-semibold text-foreground truncate">
                  {selected.unitName}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {selected.name}
                </span>
              </div>
              {selected.verified && (
                <div className="flex-shrink-0">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{label}</span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full min-w-[320px] mt-2 bg-background border-2 border-border rounded-lg shadow-lg max-h-[400px] overflow-hidden">
          {/* Search Input */}
          <div className="sticky top-0 bg-background border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-muted border border-border rounded-md focus:border-primary focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Asset List */}
          <div className="overflow-y-auto max-h-[320px] pb-4">
            {searchLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : displayAssets.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No assets found
              </div>
            ) : (
              displayAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleSelect(asset)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3
                    hover:bg-muted transition-colors text-left
                    ${selected?.id === asset.id ? 'bg-primary/10' : ''}
                  `}
                >
                  {asset.logoUrl && (
                    <img
                      src={asset.logoUrl}
                      alt={asset.unitName}
                      className="w-8 h-8 rounded-full bg-muted flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 flex flex-col items-start min-w-0 gap-0.5">
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-semibold text-base text-foreground">
                        {asset.unitName}
                      </span>
                      {asset.verified && (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {asset.name}
                    </span>
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground ml-2">
                    ID: {asset.id}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="sticky bottom-0 bg-muted/50 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {displayAssets.length} asset{displayAssets.length !== 1 ? 's' : ''} available
          </div>
        </div>
      )}
    </div>
  );
}
