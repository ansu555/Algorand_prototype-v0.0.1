import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';

import Home from './page';
import store from './store';
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <Router>
      <Provider store={store}>
        <Home />
      </Provider>
    </Router>
  );
}