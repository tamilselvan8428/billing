import React, { useState, useEffect } from 'react';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [stockEntry, setStockEntry] = useState({
    productId: '',
    quantity: ''
  });
  const [productEdit, setProductEdit] = useState({
    id: '',
    name: '',
    nameTamil: '',
    price: '',
    minStockLevel: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://billing-server-gaha.onrender.com/api/products');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setProducts(data.sort((a, b) => a._id - b._id));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load products');
    }
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    try {
      const productId = Number(stockEntry.productId);
      const quantity = Number(stockEntry.quantity);

      if (isNaN(productId)) {
        throw new Error('Please select a valid product');
      }

      const response = await fetch('https://billing-server-gaha.onrender.com/api/products/stock', {
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

      fetchProducts();
      setStockEntry({ productId: '', quantity: '' });
      alert('Stock quantity updated successfully!');
      
    } catch (err) {
      console.error('Error:', err);
      alert(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`https://billing-server-gaha.onrender.com/api/products/${productEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productEdit.name,
          nameTamil: productEdit.nameTamil,
          price: productEdit.price,
          minStockLevel: productEdit.minStockLevel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Product update failed');
      }

      fetchProducts();
      setProductEdit({
        id: '',
        name: '',
        nameTamil: '',
        price: '',
        minStockLevel: ''
      });
      alert('Product details updated successfully!');
      
    } catch (err) {
      console.error('Error:', err);
      alert(err.message);
    }
  };

  const loadProductForEdit = (product) => {
    setProductEdit({
      id: product._id,
      name: product.name,
      nameTamil: product.nameTamil,
      price: product.price,
      minStockLevel: product.minStockLevel
    });
  };

  return (
    <div className="container mt-4">
      <h2>Stock Management</h2>
      
      {/* Stock Quantity Update Section */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">Update Stock Quantity</div>
        <div className="card-body">
          <form onSubmit={handleStockSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Select Product</label>
                <select
                  className="form-control"
                  value={stockEntry.productId}
                  onChange={(e) => setStockEntry({...stockEntry, productId: e.target.value})}
                  required
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product._id} - {product.nameTamil} (Current: {product.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Quantity to Add</label>
                <input
                  type="number"
                  className="form-control"
                  value={stockEntry.quantity}
                  onChange={(e) => setStockEntry({...stockEntry, quantity: e.target.value})}
                  min="1"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Update Stock Quantity
            </button>
          </form>
        </div>
      </div>

      {/* Product Details Update Section */}
      <div className="card mb-4">
        <div className="card-header bg-success text-white">Update Product Details</div>
        <div className="card-body">
          <form onSubmit={handleEditSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Select Product</label>
                <select
                  className="form-control"
                  value={productEdit.id}
                  onChange={(e) => {
                    const selectedProduct = products.find(p => p._id === Number(e.target.value));
                    if (selectedProduct) loadProductForEdit(selectedProduct);
                  }}
                  required
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product._id} - {product.nameTamil}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {productEdit.id && (
              <>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Product Name (English)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={productEdit.name}
                      onChange={(e) => setProductEdit({...productEdit, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Product Name (Tamil)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={productEdit.nameTamil}
                      onChange={(e) => setProductEdit({...productEdit, nameTamil: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      className="form-control"
                      value={productEdit.price}
                      onChange={(e) => setProductEdit({...productEdit, price: e.target.value})}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Minimum Stock Level</label>
                    <input
                      type="number"
                      className="form-control"
                      value={productEdit.minStockLevel}
                      onChange={(e) => setProductEdit({...productEdit, minStockLevel: e.target.value})}
                      min="1"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-success">
                  Update Product Details
                </button>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Products List Table */}
      <div className="card">
        <div className="card-header">Product List</div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name (English)</th>
                  <th>Name (Tamil)</th>
                  <th>Price</th>
                  <th>Current Stock</th>
                  <th>Min Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product._id}>
                    <td>{product._id}</td>
                    <td>{product.name}</td>
                    <td>{product.nameTamil}</td>
                    <td>₹{product.price.toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>{product.minStockLevel}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => loadProductForEdit(product)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockManagement;