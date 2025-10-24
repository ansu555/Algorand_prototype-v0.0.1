import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const cryptoApiHeaders = {
    'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
    'x-rapidapi-host': process.env.NEXT_PUBLIC_CRYPTO_API_HOST
};

const baseUrl = process.env.NEXT_PUBLIC_CRYPTO_API_URL;

// Check if we should use RapidAPI or fallback to CoinGecko
const useRapidAPI = baseUrl && cryptoApiHeaders['x-rapidapi-key'];

// Use Next.js API proxy to avoid CORS issues
const coinGeckoBaseUrl = '/api/coingecko';

export const cryptoApi = createApi({
    reducerPath: 'cryptoApi',
    baseQuery: fetchBaseQuery({
        baseUrl: useRapidAPI ? baseUrl : coinGeckoBaseUrl,
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
                    const endpoint = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count || 100}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
                    return `?endpoint=${encodeURIComponent(endpoint)}`;
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
        // Algorand ecosystem only: fetch from CoinGecko category "algorand-ecosystem"
        getAlgorandCryptos: builder.query({
            query: (perPage = 250) => {
                const ts = Date.now();
                const endpoint = `/coins/markets?vs_currency=usd&category=algorand-ecosystem&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=1h,24h,7d,30d&_t=${ts}`;
                return useRapidAPI ? endpoint : `?endpoint=${encodeURIComponent(endpoint)}`;
            },
            transformResponse: (response) => {
                // Transform CoinGecko category response into the same "coins" shape
                // Filter out coins with no price (rank 0 coins without market data)
                const validCoins = (response || []).filter((coin) => 
                    coin.current_price && 
                    coin.current_price > 0
                );

                const coins = validCoins.map((coin, index) => ({
                    uuid: coin.id,
                    id: coin.id,
                    rank: coin.market_cap_rank || (index + 1), // Use global rank or local index
                    name: coin.name,
                    symbol: (coin.symbol || '').toUpperCase(),
                    price: String(coin.current_price ?? '0'),
                    change1h: String(coin.price_change_percentage_1h_in_currency ?? '0'),
                    change: String(coin.price_change_percentage_24h_in_currency ?? '0'),
                    change7d: String(coin.price_change_percentage_7d_in_currency ?? '0'),
                    change30d: String(coin.price_change_percentage_30d_in_currency ?? '0'),
                    marketCap: String(coin.market_cap ?? '0'),
                    '24hVolume': String(coin.total_volume ?? '0'),
                    supply: {
                        circulating: String(coin.circulating_supply ?? '0'),
                        total: String(coin.total_supply ?? '0')
                    },
                    sparkline: coin.sparkline_in_7d?.price || [],
                    image: coin.image || ''
                }));
                return { coins };
            },
        }),
        getStats: builder.query({
            query: () => {
                if (useRapidAPI) return '/stats';
                const endpoint = '/global';
                return `?endpoint=${encodeURIComponent(endpoint)}`;
            },
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
            query: (coinId) => {
                if (useRapidAPI) {
                    return `/coin/${coinId}`;
                } else {
                    const ts = Date.now();
                    const endpoint = `/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false&_t=${ts}`;
                    return `?endpoint=${encodeURIComponent(endpoint)}`;
                }
            },
            transformResponse: (response) => {
                if (useRapidAPI) {
                    return response.data.coin;
                } else {
                    // Transform CoinGecko coin details with full supply, ATH, ATL data
                    const md = response.market_data || {};
                    return {
                        uuid: response.id,
                        id: response.id,
                        name: response.name,
                        symbol: response.symbol.toUpperCase(),
                        rank: response.market_cap_rank || 0,
                        description: response.description?.en || '',
                        price: md.current_price?.usd?.toString() || '0',
                        marketCap: md.market_cap?.usd?.toString() || '0',
                        '24hVolume': md.total_volume?.usd?.toString() || '0',
                        change: md.price_change_percentage_24h?.toString() || '0',
                        supply: {
                            circulating: md.circulating_supply?.toString() || '0',
                            total: md.total_supply?.toString() || '0',
                            max: md.max_supply?.toString() || '0'
                        },
                        allTimeHigh: {
                            price: md.ath?.usd?.toString() || '0',
                            date: md.ath_date?.usd || '',
                            // provide both date string and unix timestamp (seconds) for UI compatibility
                            timestamp: md.ath_date?.usd ? Math.floor(new Date(md.ath_date.usd).getTime() / 1000) : undefined,
                            changePercentage: md.ath_change_percentage?.usd?.toString() || '0'
                        },
                        allTimeLow: {
                            price: md.atl?.usd?.toString() || '0',
                            date: md.atl_date?.usd || '',
                            timestamp: md.atl_date?.usd ? Math.floor(new Date(md.atl_date.usd).getTime() / 1000) : undefined,
                            changePercentage: md.atl_change_percentage?.usd?.toString() || '0'
                        }
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
                    const endpoint = `/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
                    return `?endpoint=${encodeURIComponent(endpoint)}`;
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