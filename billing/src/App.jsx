import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Billing from './components/Billing';
import ProductManagement from './components/ProductManagement';
import StockManagement from './components/StockManagement';

function App() {
  const [activeTab, setActiveTab] = useState('billing');

  // Enhanced keep-alive mechanism to prevent Render server from sleeping
  useEffect(() => {
    const keepAliveInterval = setInterval(async () => {
      try {
        // Use HTTPS in production for secure connection
        const baseUrl = import.meta.env.PROD 
          ? 'https://billing-server-gaha.onrender.com' 
          : '';
        
        // Multiple keep-alive strategies for maximum reliability
        const promises = [
          fetch(`${baseUrl}/api/keep-alive`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${baseUrl}/api/health`, {
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
        const baseUrl = import.meta.env.PROD 
          ? 'https://billing-server-gaha.onrender.com' 
          : '';
        await fetch(`${baseUrl}/api/keep-alive`);
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