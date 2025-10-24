import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from '@reduxjs/toolkit/query';
import { algorandApi } from "./algorandApi";
import { cryptoApi } from "./cryptoApi";

const store = configureStore({
  reducer: {
    [algorandApi.reducerPath]: algorandApi.reducer,
    [cryptoApi.reducerPath]: cryptoApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      algorandApi.middleware,
      cryptoApi.middleware
    ),
});

setupListeners(store.dispatch);

export default store;
export { store };