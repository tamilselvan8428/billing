import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const StockAnalysis = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('all');

  useEffect(() => {
    fetchProducts();
    fetchStockData();
  }, [timeRange, selectedProduct]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://billing-server-gaha.onrender.com/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const url = `https://billing-server-gaha.onrender.com/api/stock/history?range=${timeRange}${selectedProduct !== 'all' ? `&product=${selectedProduct}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setStockData(data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'year': return 'Last 12 Months';
      default: return 'Last 30 Days';
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h4>Stock Analysis</h4>
        <div className="d-flex gap-2">
          <div>
            <label className="form-label me-2">Time Range:</label>
            <select 
              className="form-select form-select-sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last 12 Months</option>
            </select>
          </div>
          <div>
            <label className="form-label ms-2 me-2">Product:</label>
            <select 
              className="form-select form-select-sm"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="all">All Products</option>
              {products.map(product => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stockData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                    formatter={(value, name) => [value, name === 'stockLevel' ? 'Stock Level' : 'Purchases']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="stockLevel" 
                    name="Stock Level"
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="purchases" 
                    name="Purchases"
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4">
              <h5>Stock Movement Summary - {getTimeRangeLabel()}</h5>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Starting Stock</th>
                      <th>Purchases</th>
                      <th>Sales</th>
                      <th>Ending Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.map((entry, index) => (
                      <tr key={index}>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        <td>{entry.productName || 'All Products'}</td>
                        <td>{entry.startingStock}</td>
                        <td className="text-success">+{entry.purchases}</td>
                        <td className="text-danger">-{entry.sales}</td>
                        <td>{entry.endingStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockAnalysis;
