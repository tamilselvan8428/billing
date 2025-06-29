import React, { useState, useEffect, useRef } from 'react';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [stockEntries, setStockEntries] = useState([{ 
    productId: '', 
    productName: '', 
    currentStock: 0,
    newQuantity: '' 
  }]);
  const [productEdit, setProductEdit] = useState({
    id: '',
    name: '',
    nameTamil: '',
    price: '',
    minStockLevel: ''
  });
  const [activeRow, setActiveRow] = useState(0);
  const [activeField, setActiveField] = useState('productId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const productIdRefs = useRef([]);
  const quantityRefs = useRef([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeField === 'productId' && productIdRefs.current[activeRow]) {
      productIdRefs.current[activeRow].focus();
    } else if (activeField === 'quantity' && quantityRefs.current[activeRow]) {
      quantityRefs.current[activeRow].focus();
    }
  }, [activeRow, activeField]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://billing-server-gaha.onrender.com/api/products');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products. Status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from server');
      }
      
      setProducts(data.sort((a, b) => a._id - b._id));
    } catch (err) {
      console.error('Fetch products error:', err);
      setError(err.message || 'Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleStockInputChange = (index, field, value) => {
    const updatedEntries = [...stockEntries];
    
    if (field === 'productId') {
      const productId = parseInt(value);
      if (!isNaN(productId)) {
        const product = products.find(p => p._id === productId);
        updatedEntries[index].productName = product ? product.nameTamil : '';
        updatedEntries[index].currentStock = product ? product.stock : 0;
      }
      updatedEntries[index][field] = value;
    } else {
      updatedEntries[index][field] = value;
    }
    
    setStockEntries(updatedEntries);
  };

  const handleStockKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'productId') {
        if (stockEntries[index].productId && stockEntries[index].productName) {
          setActiveField('quantity');
        }
      } else if (field === 'quantity') {
        if (index === stockEntries.length - 1) {
          setStockEntries([...stockEntries, { 
            productId: '', 
            productName: '', 
            currentStock: 0,
            newQuantity: '' 
          }]);
        }
        setActiveRow(index + 1);
        setActiveField('productId');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (field === 'productId') {
        setActiveField('quantity');
      } else if (field === 'quantity') {
        if (index === stockEntries.length - 1) {
          setStockEntries([...stockEntries, { 
            productId: '', 
            productName: '', 
            currentStock: 0,
            newQuantity: '' 
          }]);
        }
        setActiveRow(index + 1);
        setActiveField('productId');
      }
    }
  };

  const handleUpdateStock = async (index) => {
    const entry = stockEntries[index];
    if (!entry.productId || !entry.newQuantity || isNaN(entry.newQuantity)) {
      alert('Please enter valid product ID and quantity');
      return;
    }

    try {
      const response = await fetch('https://billing-server-gaha.onrender.com/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: parseInt(entry.productId),
          quantity: parseInt(entry.newQuantity)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Stock update failed. Status: ${response.status}`);
      }

      await fetchProducts();
      
      const updatedEntries = [...stockEntries];
      updatedEntries[index].currentStock = parseInt(entry.newQuantity);
      updatedEntries[index].newQuantity = '';
      setStockEntries(updatedEntries);

      setSuccessMessage(`Stock updated successfully for ${entry.productName}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Update stock error:', err);
      setError(err.message || 'Failed to update stock. Please check the endpoint.');
      setTimeout(() => setError(null), 5000);
    }
  };

const handleBulkUpdate = async () => {
  const validEntries = stockEntries
    .filter(entry => entry.productId && entry.newQuantity && !isNaN(entry.newQuantity))
    .map(entry => ({
      productId: parseInt(entry.productId),
      quantity: parseInt(entry.newQuantity)
    }));

  if (validEntries.length === 0) {
    alert('No valid entries to update');
    return;
  }

  try {
    const response = await fetch('https://billing-server-gaha.onrender.com/api/products/stock/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: validEntries })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Bulk update failed. Status: ${response.status}`);
    }

    await fetchProducts();
    
    // Clear the stock entries table after successful update
    setStockEntries([{ 
      productId: '', 
      productName: '', 
      currentStock: 0,
      newQuantity: '' 
    }]);
    setActiveRow(0);
    setActiveField('productId');

    setSuccessMessage(`Successfully updated ${validEntries.length} products`);
    setTimeout(() => setSuccessMessage(''), 3000);
    
  } catch (err) {
    console.error('Bulk update error:', err);
    setError(err.message || 'Failed to perform bulk update. Please check the endpoint.');
    setTimeout(() => setError(null), 5000);
  }
};

  const resetStockForm = () => {
    setStockEntries([{ 
      productId: '', 
      productName: '', 
      currentStock: 0,
      newQuantity: '' 
    }]);
    setActiveRow(0);
    setActiveField('productId');
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
        const errorText = await response.text();
        throw new Error(errorText || `Product update failed. Status: ${response.status}`);
      }

      await fetchProducts();
      setProductEdit({
        id: '',
        name: '',
        nameTamil: '',
        price: '',
        minStockLevel: ''
      });
      setSuccessMessage('Product details updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Edit product error:', err);
      setError(err.message || 'Failed to update product. Please check the endpoint.');
      setTimeout(() => setError(null), 5000);
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
      
      {loading && <div className="alert alert-info">Loading products...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">Update Stock Quantity</div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th width="5%">#</th>
                  <th width="15%">Product ID</th>
                  <th width="30%">Product Name</th>
                  <th width="15%">Current Stock</th>
                  <th width="15%">New Quantity</th>
                  <th width="20%">Action</th>
                </tr>
              </thead>
              <tbody>
                {stockEntries.map((entry, index) => (
                  <tr key={index} className={activeRow === index ? 'table-active' : ''}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={entry.productId}
                        onChange={(e) => handleStockInputChange(index, 'productId', e.target.value)}
                        onKeyDown={(e) => handleStockKeyDown(e, index, 'productId')}
                        onFocus={() => {
                          setActiveRow(index);
                          setActiveField('productId');
                        }}
                        ref={el => productIdRefs.current[index] = el}
                      />
                    </td>
                    <td>{entry.productName}</td>
                    <td>{entry.currentStock}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={entry.newQuantity}
                        onChange={(e) => handleStockInputChange(index, 'newQuantity', e.target.value)}
                        onKeyDown={(e) => handleStockKeyDown(e, index, 'quantity')}
                        onFocus={() => {
                          setActiveRow(index);
                          setActiveField('quantity');
                        }}
                        ref={el => quantityRefs.current[index] = el}
                        min="0"
                      />
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleUpdateStock(index)}
                        disabled={!entry.productId || !entry.newQuantity || isNaN(entry.newQuantity)}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between mt-3">
            <button 
              className="btn btn-danger" 
              onClick={resetStockForm}
              disabled={stockEntries.length === 1 && !stockEntries[0].productId && !stockEntries[0].newQuantity}
            >
              Clear
            </button>
            <div>
              <button 
                className="btn btn-secondary me-2"
                onClick={() => setStockEntries([...stockEntries, { 
                  productId: '', 
                  productName: '', 
                  currentStock: 0,
                  newQuantity: '' 
                }])}
              >
                Add Row
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleBulkUpdate}
                disabled={!stockEntries.some(entry => entry.productId && entry.newQuantity && !isNaN(entry.newQuantity))}
              >
                Bulk Update
              </button>
            </div>
          </div>
        </div>
      </div>

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