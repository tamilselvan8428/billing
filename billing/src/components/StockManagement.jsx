import React, { useState, useEffect, useRef } from 'react';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [stockEntries, setStockEntries] = useState([{ 
    productId: '', 
    productName: '', 
    productNameTamil: '',
    currentStock: 0,
    newQuantity: '',
    productSearch: ''
  }]);
  const [productEdit, setProductEdit] = useState({
    id: '',
    name: '',
    nameTamil: '',
    price: '',
    minStockLevel: ''
  });
  const [activeRow, setActiveRow] = useState(0);
  const [activeField, setActiveField] = useState('productSearch');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showEditProductDropdown, setShowEditProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [editProductSearch, setEditProductSearch] = useState('');
  
  const productSearchRefs = useRef([]);
  const quantityRefs = useRef([]);
  const editProductSearchRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeField === 'productSearch' && productSearchRefs.current[activeRow]) {
      productSearchRefs.current[activeRow].focus();
    } else if (activeField === 'quantity' && quantityRefs.current[activeRow]) {
      quantityRefs.current[activeRow].focus();
    }
  }, [activeRow, activeField]);

  useEffect(() => {
    if (stockEntries[activeRow]?.productSearch) {
      const searchTerm = stockEntries[activeRow].productSearch.toLowerCase();
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.nameTamil.toLowerCase().includes(searchTerm)
      );
      setFilteredProducts(filtered);
      setShowProductDropdown(true);
    } else {
      setFilteredProducts(products);
      setShowProductDropdown(false);
    }
  }, [stockEntries, activeRow, products]);

  useEffect(() => {
    if (editProductSearch) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(editProductSearch.toLowerCase()) ||
        product.nameTamil.toLowerCase().includes(editProductSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowEditProductDropdown(true);
    } else {
      setFilteredProducts(products);
      setShowEditProductDropdown(false);
    }
  }, [editProductSearch, products]);

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
      
      setProducts(data.sort((a, b) => a.name.localeCompare(b.name)));
      setFilteredProducts(data);
    } catch (err) {
      console.error('Fetch products error:', err);
      setError(err.message || 'Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = (product, index) => {
    const updatedEntries = [...stockEntries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      productId: product._id,
      productName: product.name,
      productNameTamil: product.nameTamil,
      currentStock: product.stock,
      productSearch: ''
    };
    setStockEntries(updatedEntries);
    setShowProductDropdown(false);
    setTimeout(() => {
      if (quantityRefs.current[index]) {
        quantityRefs.current[index].focus();
      }
    }, 0);
  };

  const selectEditProduct = (product) => {
    setProductEdit({
      id: product._id,
      name: product.name,
      nameTamil: product.nameTamil,
      price: product.price,
      minStockLevel: product.minStockLevel
    });
    setEditProductSearch(product.nameTamil || product.name);
    setShowEditProductDropdown(false);
  };

  const handleStockInputChange = (index, field, value) => {
    const updatedEntries = [...stockEntries];
    updatedEntries[index][field] = value;
    setStockEntries(updatedEntries);
  };

  const handleProductKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length === 1) {
        selectProduct(filteredProducts[0], index);
      }
    } else if (e.key === 'ArrowDown' && showProductDropdown) {
      e.preventDefault();
      const firstItem = document.querySelector(`.stock-product-item-${index}`);
      if (firstItem) firstItem.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setActiveField('quantity');
    }
  };

  const handleEditProductKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length === 1) {
        selectEditProduct(filteredProducts[0]);
      }
    } else if (e.key === 'ArrowDown' && showEditProductDropdown) {
      e.preventDefault();
      const firstItem = document.querySelector('.edit-product-item');
      if (firstItem) firstItem.focus();
    }
  };

  const handleProductItemKeyDown = (e, product, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      selectProduct(product, index);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextItem = e.currentTarget.nextElementSibling;
      if (nextItem) nextItem.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevItem = e.currentTarget.previousElementSibling;
      if (prevItem) prevItem.focus();
      else productSearchRefs.current[index].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      productSearchRefs.current[index].focus();
      setShowProductDropdown(false);
    }
  };

  const handleEditProductItemKeyDown = (e, product) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      selectEditProduct(product);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextItem = e.currentTarget.nextElementSibling;
      if (nextItem) nextItem.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevItem = e.currentTarget.previousElementSibling;
      if (prevItem) prevItem.focus();
      else editProductSearchRef.current.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editProductSearchRef.current.focus();
      setShowEditProductDropdown(false);
    }
  };

  const handleStockKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'quantity') {
        if (index === stockEntries.length - 1) {
          setStockEntries([...stockEntries, { 
            productId: '', 
            productName: '', 
            productNameTamil: '',
            currentStock: 0,
            newQuantity: '',
            productSearch: ''
          }]);
        }
        setActiveRow(index + 1);
        setActiveField('productSearch');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (field === 'productSearch') {
        setActiveField('quantity');
      } else if (field === 'quantity') {
        if (index === stockEntries.length - 1) {
          setStockEntries([...stockEntries, { 
            productId: '', 
            productName: '', 
            productNameTamil: '',
            currentStock: 0,
            newQuantity: '',
            productSearch: ''
          }]);
        }
        setActiveRow(index + 1);
        setActiveField('productSearch');
      }
    }
  };

  const handleUpdateStock = async (index) => {
    const entry = stockEntries[index];
    if (!entry.productId || !entry.newQuantity || isNaN(entry.newQuantity)) {
      alert('Please select a product and enter valid quantity');
      return;
    }

    try {
      const response = await fetch('https://billing-server-gaha.onrender.com/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: entry.productId,
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

      setSuccessMessage(`Stock updated successfully for ${entry.productNameTamil || entry.productName}`);
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
        productId: entry.productId,
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
      
      setStockEntries([{ 
        productId: '', 
        productName: '', 
        productNameTamil: '',
        currentStock: 0,
        newQuantity: '',
        productSearch: ''
      }]);
      setActiveRow(0);
      setActiveField('productSearch');

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
      productNameTamil: '',
      currentStock: 0,
      newQuantity: '',
      productSearch: ''
    }]);
    setActiveRow(0);
    setActiveField('productSearch');
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
      setEditProductSearch('');
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
    setEditProductSearch(product.nameTamil || product.name);
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
                  <th width="25%">Product</th>
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
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={entry.productId ? entry.productNameTamil || entry.productName : entry.productSearch}
                          onChange={(e) => {
                            handleStockInputChange(index, 'productSearch', e.target.value);
                          }}
                          onKeyDown={(e) => handleProductKeyDown(e, index)}
                          onFocus={() => {
                            setActiveRow(index);
                            setActiveField('productSearch');
                            if (!entry.productId) {
                              setShowProductDropdown(true);
                            }
                          }}
                          ref={el => productSearchRefs.current[index] = el}
                          placeholder="Search product..."
                        />
                        {showProductDropdown && activeRow === index && (
                          <div className="card position-absolute w-100" style={{ zIndex: 1000 }}>
                            <div className="card-body p-2">
                              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {filteredProducts.length > 0 ? (
                                  <ul className="list-group list-group-flush">
                                    {filteredProducts.map((product, idx) => (
                                      <li 
                                        key={idx}
                                        className={`list-group-item list-group-item-action p-2 stock-product-item-${index}`}
                                        onClick={() => selectProduct(product, index)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onKeyDown={(e) => handleProductItemKeyDown(e, product, index)}
                                        style={{ cursor: 'pointer' }}
                                        tabIndex={0}
                                      >
                                        <div className="d-flex justify-content-between">
                                          <span>{product.nameTamil || product.name}</span>
                                        </div>
                                        <div className="text-muted small">
                                          {product.nameTamil && product.name !== product.nameTamil ? product.name : ''}
                                        </div>
                                        <div className="text-muted small">Stock: {product.stock}</div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-center text-muted p-2">No products found</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {entry.productId && (
                        <div className="small text-muted">
                          {entry.productNameTamil && entry.productName !== entry.productNameTamil ? entry.productName : ''}
                        </div>
                      )}
                    </td>
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
                  productNameTamil: '',
                  currentStock: 0,
                  newQuantity: '',
                  productSearch: ''
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
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control"
                    value={editProductSearch}
                    onChange={(e) => setEditProductSearch(e.target.value)}
                    onKeyDown={handleEditProductKeyDown}
                    onFocus={() => {
                      if (editProductSearch.length > 0) {
                        setShowEditProductDropdown(true);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowEditProductDropdown(false), 200)}
                    ref={editProductSearchRef}
                    placeholder="Search product..."
                  />
                  {showEditProductDropdown && (
                    <div className="card position-absolute w-100" style={{ zIndex: 1000 }}>
                      <div className="card-body p-2">
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {filteredProducts.length > 0 ? (
                            <ul className="list-group list-group-flush">
                              {filteredProducts.map((product, idx) => (
                                <li 
                                  key={idx}
                                  className="list-group-item list-group-item-action p-2 edit-product-item"
                                  onClick={() => selectEditProduct(product)}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onKeyDown={(e) => handleEditProductItemKeyDown(e, product)}
                                  style={{ cursor: 'pointer' }}
                                  tabIndex={0}
                                >
                                  <div className="d-flex justify-content-between">
                                    <span>{product.nameTamil || product.name}</span>
                                  </div>
                                  <div className="text-muted small">
                                    {product.nameTamil && product.name !== product.nameTamil ? product.name : ''}
                                  </div>
                                  <div className="text-muted small">Price: ₹{product.price.toFixed(2)}</div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-center text-muted p-2">No products found</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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