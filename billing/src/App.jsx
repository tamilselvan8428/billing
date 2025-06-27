import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Billing from './components/Billing';
import ProductManagement from './components/ProductManagement';
import StockManagement from './components/StockManagement';

function App() {
  const [activeTab, setActiveTab] = useState('billing');

  return (
    <Router>
      <div className="container mt-4">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <Link 
              className={`nav-link ${activeTab === 'billing' ? 'active' : ''}`}
              to="/"
              onClick={() => setActiveTab('billing')}
            >
              Billing
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
              to="/products"
              onClick={() => setActiveTab('products')}
            >
              Add Products
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              className={`nav-link ${activeTab === 'stock' ? 'active' : ''}`}
              to="/stock"
              onClick={() => setActiveTab('stock')}
            >
              Stock Entry
            </Link>
          </li>
        </ul>

        <div className="tab-content mt-3">
          <Routes>
            <Route path="/" element={<Billing />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/stock" element={<StockManagement />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;