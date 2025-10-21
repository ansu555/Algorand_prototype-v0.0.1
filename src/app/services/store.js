import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from '@reduxjs/toolkit/query';
import { cryptoApi } from "./cryptoApi";
import { exchangeApi } from "./exchangeApi";
import { cryptoNewsApi } from "./cryptoNewsApi";

const store = configureStore({
  reducer: {
    [cryptoApi.reducerPath]: cryptoApi.reducer,
    [exchangeApi.reducerPath]: exchangeApi.reducer,
    [cryptoNewsApi.reducerPath]: cryptoNewsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      cryptoApi.middleware,
      exchangeApi.middleware,
      cryptoNewsApi.middleware
    ),
});

setupListeners(store.dispatch);

export default store;
export { store };