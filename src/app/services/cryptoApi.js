import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const cryptoApiHeaders = {
    'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
    'x-rapidapi-host': process.env.NEXT_PUBLIC_CRYPTO_API_HOST
};

const baseUrl = process.env.NEXT_PUBLIC_CRYPTO_API_URL;

// Check if we should use RapidAPI or fallback to CoinGecko
const useRapidAPI = baseUrl && cryptoApiHeaders['x-rapidapi-key'];

export const cryptoApi = createApi({
    reducerPath: 'cryptoApi',
    baseQuery: fetchBaseQuery({
        baseUrl: useRapidAPI ? baseUrl : 'https://api.coingecko.com/api/v3',
        prepareHeaders: (headers) => {
            if (useRapidAPI) {
                headers.set('x-rapidapi-key', cryptoApiHeaders['x-rapidapi-key']);
                headers.set('x-rapidapi-host', cryptoApiHeaders['x-rapidapi-host']);
            }
            return headers;
        }
    }),
    endpoints: (builder) => ({
        getCryptos: builder.query({
            query: (count) => {
                if (useRapidAPI) {
                    return `/coins?limit=${count || 10}`;
                } else {
                    // CoinGecko free API endpoint
                    return `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count || 100}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
                }
            },
            transformResponse: (response) => {
                if (useRapidAPI) {
                    return response.data;
                } else {
                    // Transform CoinGecko response to match RapidAPI format
                    return {
                        coins: response.map(coin => ({
                            uuid: coin.id,
                            id: coin.id,
                            rank: coin.market_cap_rank || 0,
                            name: coin.name,
                            symbol: coin.symbol.toUpperCase(),
                            price: coin.current_price.toString(),
                            change1h: coin.price_change_percentage_1h_in_currency?.toString() || '0',
                            change: coin.price_change_percentage_24h?.toString() || '0',
                            change7d: coin.price_change_percentage_7d_in_currency?.toString() || '0',
                            marketCap: coin.market_cap?.toString() || '0',
                            '24hVolume': coin.total_volume?.toString() || '0',
                            supply: {
                                circulating: coin.circulating_supply?.toString() || '0'
                            },
                            sparkline: coin.sparkline_in_7d?.price || []
                        }))
                    };
                }
            },
        }),
        // Algorand ecosystem only: filter coins whose platform is Algorand
        getAlgorandCryptos: builder.query({
            // Use queryFn to orchestrate multiple requests against CoinGecko
            async queryFn(count = 100, _queryApi, _extraOptions, baseQuery) {
                const cgBase = 'https://api.coingecko.com/api/v3';
                // 1) Fetch all coins with platforms (force CoinGecko public API)
                const listRes = await baseQuery(`${cgBase}/coins/list?include_platform=true`);
                if (listRes.error) return { error: listRes.error };

                const data = listRes.data || [];
                // 2) Filter to Algorand platform coins
                const algorandIds = data
                    .filter((c) => c && c.platforms && Object.keys(c.platforms).some((k) => k.toLowerCase() === 'algorand' && c.platforms[k]))
                    .map((c) => c.id);

                if (!algorandIds.length) return { data: { coins: [] } };

                // 3) Trim to requested count to avoid oversized query strings
                const trimmed = algorandIds.slice(0, Math.min(algorandIds.length, count || 100));
                const idsParam = encodeURIComponent(trimmed.join(','));

                // 4) Fetch market data for Algorand coins only
                const marketsPath = `${cgBase}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${trimmed.length}&page=1&ids=${idsParam}&sparkline=true&price_change_percentage=1h,24h,7d`;
                const marketsRes = await baseQuery(marketsPath);
                if (marketsRes.error) return { error: marketsRes.error };

                const response = marketsRes.data || [];

                // 5) Transform response into the same shape used elsewhere
                const coins = response.map((coin) => ({
                    uuid: coin.id,
                    id: coin.id,
                    rank: coin.market_cap_rank || 0,
                    name: coin.name,
                    symbol: (coin.symbol || '').toUpperCase(),
                    price: String(coin.current_price ?? '0'),
                    change1h: String(coin.price_change_percentage_1h_in_currency ?? '0'),
                    change: String(coin.price_change_percentage_24h ?? '0'),
                    change7d: String(coin.price_change_percentage_7d_in_currency ?? '0'),
                    marketCap: String(coin.market_cap ?? '0'),
                    '24hVolume': String(coin.total_volume ?? '0'),
                    supply: { circulating: String(coin.circulating_supply ?? '0') },
                    sparkline: coin.sparkline_in_7d?.price || []
                }));

                return { data: { coins } };
            },
        }),
        getStats: builder.query({
            query: () => useRapidAPI ? '/stats' : '/global',
            transformResponse: (response) => {
                if (useRapidAPI) {
                    return response.data;
                } else {
                    // Transform CoinGecko global stats
                    const data = response.data;
                    return {
                        total: data.active_cryptocurrencies,
                        totalMarketCap: data.total_market_cap.usd.toString(),
                        total24hVolume: data.total_volume.usd.toString(),
                        btcDominance: data.market_cap_percentage.btc,
                    };
                }
            },
        }),
        getCryptoDetails: builder.query({
            query: (coinId) => useRapidAPI ? `/coin/${coinId}` : `/coins/${coinId}`,
            transformResponse: (response) => {
                if (useRapidAPI) {
                    return response.data.coin;
                } else {
                    // Transform CoinGecko coin details
                    return {
                        uuid: response.id,
                        name: response.name,
                        symbol: response.symbol.toUpperCase(),
                        description: response.description?.en || '',
                        price: response.market_data?.current_price.usd.toString() || '0',
                        marketCap: response.market_data?.market_cap.usd.toString() || '0',
                        '24hVolume': response.market_data?.total_volume.usd.toString() || '0',
                        change: response.market_data?.price_change_percentage_24h.toString() || '0',
                    };
                }
            },
        }),
        getCryptoHistory: builder.query({
            query: ({ coinId, timePeriod }) => {
                if (useRapidAPI) {
                    return `/coin/${coinId}/history?timePeriod=${timePeriod}`;
                } else {
                    // Map timePeriod to CoinGecko days
                    const daysMap = {
                        '3h': 1,
                        '24h': 1,
                        '7d': 7,
                        '30d': 30,
                        '3m': 90,
                        '1y': 365,
                        '3y': 1095,
                        '5y': 1825
                    };
                    const days = daysMap[timePeriod] || 7;
                    return `/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
                }
            },
            transformResponse: (response) => {
                if (useRapidAPI) {
                    return response.data;
                } else {
                    // Transform CoinGecko history data
                    return {
                        history: response.prices.map(([timestamp, price]) => ({
                            price: price.toString(),
                            timestamp: Math.floor(timestamp / 1000)
                        }))
                    };
                }
            },
        }),
    }),
})

export const { 
    useGetCryptosQuery, 
    useGetStatsQuery,
    useGetCryptoDetailsQuery,
    useGetCryptoHistoryQuery,
    useGetAlgorandCryptosQuery
} = cryptoApi;