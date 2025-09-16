import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const exchangeApi = createApi({
    reducerPath: 'exchangeApi',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_EXCHANGE_API_URL,
    }),
    endpoints: (builder) => ({
        getExchanges: builder.query({
            query: () => '/exchanges',
        }),
        getExchangeDetails: builder.query({
            query: (id) => `/exchanges/${id}`,
        }),
    }),
});

export const { 
    useGetExchangesQuery,
    useGetExchangeDetailsQuery
} = exchangeApi;