import React, { useState } from 'react';
import { SearchIcon, CosmicLeapIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface SearchBarProps {
  onSearch: (topic: string) => void;
  onSerendipity: () => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onSerendipity, isLoading }) => {
  const [query, setQuery] = useState('');
  const { t } = useLocalization();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.exploreTopic')}
          disabled={isLoading}
          className="w-full pl-5 pr-36 py-4 bg-gray-800 border-2 border-gray-700 rounded-full text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
             <button
              type="button"
              onClick={onSerendipity}
              disabled={isLoading}
              className="flex items-center justify-center h-full px-4 text-accent hover:text-accent-hover disabled:text-gray-600 transition-all duration-300 transform active:scale-90"
              aria-label={t('searchbar.cosmicLeap.title')}
              title={t('searchbar.cosmicLeap.title')}
            >
              <CosmicLeapIcon className="w-6 h-6" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="flex items-center justify-center w-14 h-full text-accent hover:text-accent-hover disabled:text-gray-600 transition-all duration-300 rounded-r-full transform active:scale-90"
              aria-label={t('common.search')}
            >
              <SearchIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
    </form>
  );
};

export default React.memo(SearchBar);