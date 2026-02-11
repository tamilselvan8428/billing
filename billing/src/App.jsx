import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Billing from './components/Billing';
import ProductManagement from './components/ProductManagement';
import StockManagement from './components/StockManagement';

function App() {
  const [activeTab, setActiveTab] = useState('billing');

  // Keep-alive mechanism to prevent session timeouts
  useEffect(() => {
    const keepAliveInterval = setInterval(async () => {
      try {
        await fetch('/api/keep-alive', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.log('Keep-alive failed:', error);
      }
    }, 5 * 60 * 1000); // Ping every 5 minutes

    // Cleanup interval on component unmount
    return () => clearInterval(keepAliveInterval);
  }, []);

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