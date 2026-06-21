import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { API_URL } from './config';
import Billing from './components/Billing';
import ProductManagement from './components/ProductManagement';
import StockManagement from './components/StockManagement';
import SalesAnalysis from './components/SalesAnalysis';

function App() {
  const [activeTab, setActiveTab] = useState('billing');
  useEffect(() => {
    const keepAliveInterval = setInterval(async () => {
      try {
        // Multiple keep-alive strategies for maximum reliability
        const promises = [
          fetch(`${API_URL}/api/keep-alive`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${API_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
        ];
        
        await Promise.allSettled(promises);
        console.log('💓 Keep-alive ping sent successfully');
      } catch (error) {
        console.log('Keep-alive failed:', error);
      }
    }, 10 * 60 * 1000); // Ping every 10 minutes (more frequent for safety)

    // Also ping immediately when app loads
    const initialPing = async () => {
      try {
        await fetch(`${API_URL}/api/keep-alive`);
        console.log('🚀 Initial keep-alive sent');
      } catch (error) {
        console.log('Initial keep-alive failed:', error);
      }
    };
    
    initialPing();

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
          <li className="nav-item">
            <Link 
              className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`}
              to="/analysis"
              onClick={() => setActiveTab('analysis')}
            >
              Sales Analysis
            </Link>
          </li>
        </ul>

        <div className="tab-content mt-3">
          <Routes>
            <Route path="/" element={<Billing />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/stock" element={<StockManagement />} />
            <Route path="/analysis" element={<SalesAnalysis />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;