import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const SalesAnalysis = () => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    totalBills: 0,
    averageAOV: 0
  });

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      const url = `https://billing-server-gaha.onrender.com/api/sales/history?range=${timeRange}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.salesData) {
        setSalesData(data.salesData);
        
        // Calculate summary statistics
        const totalRev = data.salesData.reduce((sum, item) => sum + item.totalSales, 0);
        const totalBillsCount = data.salesData.reduce((sum, item) => sum + item.billCount, 0);
        const averageBillSize = totalBillsCount > 0 ? totalRev / totalBillsCount : 0;
        
        setSummaryStats({
          totalRevenue: totalRev,
          totalBills: totalBillsCount,
          averageAOV: averageBillSize
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'year': return 'Last 12 Months';
      default: return 'Last 30 Days';
    }
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 2) {
        // YYYY-MM
        const date = new Date(parts[0], parseInt(parts[1]) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (parts.length === 3) {
        // YYYY-MM-DD
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container-fluid mt-2 px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-0">Sales Analytics Dashboard</h2>
          <p className="text-muted small mb-0">Monitor your shop sales performance</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="text-muted small fw-medium mb-0">Range:</label>
          <select 
            className="form-select form-select-sm border-secondary-subtle"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last 12 Months</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading sales data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5, #3b82f6)' }}>
                <div className="card-body p-4 text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-white-50 small text-uppercase mb-1 fw-bold">Total Sales</p>
                      <h3 className="fw-bold mb-0">₹{summaryStats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="bg-white-10 p-3 rounded-circle" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                      <i className="bi bi-currency-rupee fs-4"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <div className="card-body p-4 text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-white-50 small text-uppercase mb-1 fw-bold">Transactions</p>
                      <h3 className="fw-bold mb-0">{summaryStats.totalBills} Bills</h3>
                    </div>
                    <div className="bg-white-10 p-3 rounded-circle" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                      <i className="bi bi-receipt fs-4"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <div className="card-body p-4 text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-white-50 small text-uppercase mb-1 fw-bold">Average Transaction</p>
                      <h3 className="fw-bold mb-0">₹{summaryStats.averageAOV.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="bg-white-10 p-3 rounded-circle" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                      <i className="bi bi-graph-up-arrow fs-4"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-header bg-transparent border-0 pt-4 px-4 pb-0">
              <h5 className="fw-bold text-dark mb-1">Sales Revenue Graph</h5>
              <p className="text-muted small mb-0">Trends over {getTimeRangeLabel().toLowerCase()}</p>
            </div>
            <div className="card-body px-4 pb-4">
              <div style={{ height: '350px', width: '100%' }}>
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesData}
                      margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDateLabel}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}`}
                        dx={-10}
                      />
                      <Tooltip 
                        labelFormatter={(value) => `Date: ${formatDateLabel(value)}`}
                        formatter={(value, name) => {
                          if (name === 'totalSales') return [`₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Revenue'];
                          if (name === 'billCount') return [value, 'Bills Count'];
                          if (name === 'averageBill') return [`₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Avg Bill'];
                          return [value, name];
                        }}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: 'none', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalSales" 
                        stroke="#4f46e5" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="d-flex justify-content-center align-items-center h-100 border border-dashed rounded-4 bg-light">
                    <p className="text-muted">No sales data found for the selected time range.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-transparent border-0 pt-4 px-4 pb-0">
              <h5 className="fw-bold text-dark mb-1">Details Summary</h5>
              <p className="text-muted small mb-0">Individual period breakdown</p>
            </div>
            <div className="card-body px-4 pb-4">
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr className="text-muted small text-uppercase">
                      <th scope="col" className="border-bottom-0 pb-3">Period</th>
                      <th scope="col" className="border-bottom-0 pb-3 text-end">Total Revenue</th>
                      <th scope="col" className="border-bottom-0 pb-3 text-end">Transaction Count</th>
                      <th scope="col" className="border-bottom-0 pb-3 text-end">Average Transaction Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.length > 0 ? (
                      [...salesData].reverse().map((entry, index) => (
                        <tr key={index}>
                          <td className="fw-semibold text-dark py-3">{formatDateLabel(entry.date)}</td>
                          <td className="text-end text-success fw-bold py-3">₹{entry.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="text-end text-dark py-3">{entry.billCount}</td>
                          <td className="text-end text-secondary py-3">₹{entry.averageBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-4">No data matches criteria</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesAnalysis;
