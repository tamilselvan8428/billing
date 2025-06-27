import React, { useState } from 'react';

const ProductManagement = () => {
  const [formData, setFormData] = useState({
    name: '',
    nameTamil: '',
    price: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Validate price is a number
    const price = parseFloat(formData.price);
    if (isNaN(price)) {
      throw new Error('Please enter a valid price');
    }

    const response = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        nameTamil: formData.nameTamil,
        price: price
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add product');
    }

    const result = await response.json();
    alert(`Product added successfully! ID: ${result._id}`);
    setFormData({ name: '', nameTamil: '', price: '' });
    
  } catch (err) {
    console.error('Error:', err);
    alert(`Error: ${err.message}`);
  }
};

  return (
    <div className="container mt-4">
      <h2>Add New Product</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Product Name (English)</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Product Name (Tamil)</label>
          <input
            type="text"
            className="form-control"
            name="nameTamil"
            value={formData.nameTamil}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Price</label>
          <input
            type="number"
            className="form-control"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Add Product
        </button>
      </form>
    </div>
  );
};

export default ProductManagement;