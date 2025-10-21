import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const cryptoApiHeaders = {
    'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
    'x-rapidapi-host': process.env.NEXT_PUBLIC_CRYPTO_API_HOST
};

const baseUrl = process.env.NEXT_PUBLIC_CRYPTO_API_URL;

export const cryptoApi = createApi({
    reducerPath: 'cryptoApi',
    baseQuery: fetchBaseQuery({
        baseUrl,
        prepareHeaders: (headers) => {
            headers.set('x-rapidapi-key', cryptoApiHeaders['x-rapidapi-key']);
            headers.set('x-rapidapi-host', cryptoApiHeaders['x-rapidapi-host']);
            return headers;
        }
    }),
    endpoints: (builder) => ({
        getCryptos: builder.query({
            query: (count) => `/coins?limit=${count || 10}`,
            transformResponse: (response) => response.data,
        }),
        getStats: builder.query({
            query: () => '/stats',
            transformResponse: (response) => response.data,
        }),
        getCryptoDetails: builder.query({
            query: (coinId) => `/coin/${coinId}`,
            transformResponse: (response) => response.data.coin,
        }),
        getCryptoHistory: builder.query({
            query: ({ coinId, timePeriod }) => `/coin/${coinId}/history?timePeriod=${timePeriod}`,
            transformResponse: (response) => response.data,
        }),
    }),
})

export const { 
    useGetCryptosQuery, 
    useGetStatsQuery,
    useGetCryptoDetailsQuery,
    useGetCryptoHistoryQuery
} = cryptoApi;