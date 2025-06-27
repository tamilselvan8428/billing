import React, { useState, useEffect } from 'react';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [stockEntry, setStockEntry] = useState({
    productId: '',  // This should store the actual ID from selection
    quantity: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setProducts(data.sort((a, b) => a._id - b._id)); // Sort by ID
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load products');
    }
  };

const handleStockSubmit = async (e) => {
  e.preventDefault();
  try {
    // Convert to numbers
    const productId = Number(stockEntry.productId);
    const quantity = Number(stockEntry.quantity);

    if (isNaN(productId)) {
      throw new Error('Please select a valid product');
    }

    const response = await fetch('http://localhost:5000/api/products/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: productId,
        quantity: quantity
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Stock update failed');
    }

    // Refresh data
    fetchProducts();
    setStockEntry({ productId: '', quantity: '' });
    alert('Stock updated successfully!');
    
  } catch (err) {
    console.error('Error:', err);
    alert(err.message);
  }
};

  return (
    <div className="container mt-4">
      <h2>Stock Management</h2>
      
      {/* Stock Update Form */}
      <div className="card mb-4">
        <div className="card-header">Update Stock</div>
        <div className="card-body">
          <form onSubmit={handleStockSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Select Product</label>
                <select
                  className="form-control"
                  name="productId"
                  value={stockEntry.productId}
                  onChange={(e) => setStockEntry({...stockEntry, productId: e.target.value})}
                  required
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product._id} - {product.nameTamil} (Stock: {product.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Quantity to Add</label>
                <input
                  type="number"
                  className="form-control"
                  name="quantity"
                  value={stockEntry.quantity}
                  onChange={(e) => setStockEntry({...stockEntry, quantity: e.target.value})}
                  min="1"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Update Stock
            </button>
          </form>
        </div>
      </div>

      {/* Products Table - similar to your existing one */}
    </div>
  );
};

export default StockManagement;