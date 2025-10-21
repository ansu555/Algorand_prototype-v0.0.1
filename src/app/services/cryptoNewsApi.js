import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';   

const cryptoNewsHeaders = {
  'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
  'x-rapidapi-host': process.env.NEXT_PUBLIC_NEWS_API_HOST
}

// Set the base URL to the root API path
const baseUrl = process.env.NEXT_PUBLIC_NEWS_API_URL;

const createRequest = (url) => ({ url, headers: cryptoNewsHeaders });

export const cryptoNewsApi = createApi({
  reducerPath: 'cryptoNewsApi',
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    getCryptoNews: builder.query({
      // Use the search_crypto_articles endpoint with proper parameters
  query: ({ count }) => createRequest(`/api/v1/crypto/articles/search?format=json&time_frame=24h&page=1&limit=${count}`),
      transformResponse: (response) => {
        // Transform API response to match expected format in components
        if (response && response.articles) {
          return {
            articles: response.articles.map(article => ({
              id: article.id || article.url || Math.random().toString(),
              title: article.title || 'Untitled',
              snippet: article.description || article.content || article.summary || '',
              source: article.source?.name || article.source || 'Unknown',
              date: new Date(article.publishedAt || article.published_date || Date.now()).toLocaleDateString(),
              url: article.url || '#',
              imageUrl: article.image?.url || article.image || article.urlToImage || '/placeholder.svg',
              tags: article.keywords || article.categories || article.topics || ['cryptocurrency'],
            }))
          };
        }
        return { articles: [] };
      }
    })
  }),
});

export const { useGetCryptoNewsQuery } = cryptoNewsApi;