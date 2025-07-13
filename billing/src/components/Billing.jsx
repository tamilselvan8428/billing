import React, { useState, useEffect, useRef } from 'react';

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [billItems, setBillItems] = useState([{ 
    productId: '', 
    quantity: '', 
    productName: '', 
    productNameTamil: '',
    price: 0
  }]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeField, setActiveField] = useState('productSearch');
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [savedContacts, setSavedContacts] = useState([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const productSearchRefs = useRef([]);
  const quantityRefs = useRef([]);
  const customerNameRef = useRef(null);
  const mobileNumberRef = useRef(null);
  const dropdownRef = useRef(null);
  const productDropdownRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        setError(null);
        const response = await fetch('https://billing-server-gaha.onrender.com/api/products');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
    loadSavedContacts();
  }, []);

  useEffect(() => {
    if (productSearch) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.nameTamil.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowProductDropdown(true);
    } else {
      setFilteredProducts(products);
      setShowProductDropdown(false);
    }
  }, [productSearch, products]);

  const loadSavedContacts = async () => {
    try {
      const response = await fetch('https://billing-server-gaha.onrender.com/api/contacts');
      if (response.ok) {
        const data = await response.json();
        setSavedContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  const selectContact = (contact) => {
    setCustomerName(contact.name);
    setMobileNumber(contact.mobileNumber);
    setShowContactDropdown(false);
    setContactSearch('');
    setTimeout(() => {
      if (productSearchRefs.current[0]) {
        productSearchRefs.current[0].focus();
      }
    }, 0);
  };

  const selectProduct = (product, index) => {
    // Check if product is out of stock
    if (product.stock <= 0) {
      alert(`${product.nameTamil || product.name} is out of stock`);
      return;
    }

    const updatedItems = [...billItems];
    updatedItems[index] = {
      ...updatedItems[index],
      productId: product._id,
      productName: product.name,
      productNameTamil: product.nameTamil,
      price: product.price
    };
    setBillItems(updatedItems);
    setProductSearch('');
    setShowProductDropdown(false);
    setTimeout(() => {
      if (quantityRefs.current[index]) {
        quantityRefs.current[index].focus();
      }
    }, 0);
  };

  const handleContactSave = async () => {
    if (!customerName || !mobileNumber || !/^\d{10}$/.test(mobileNumber)) return;
    
    try {
      const response = await fetch('https://billing-server-gaha.onrender.com/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerName,
          mobileNumber
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadSavedContacts();
      }
    } catch (err) {
      console.error('Error saving contact:', err);
    }
  };

  const handleCustomerNameBlur = (e) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget)) {
      return;
    }
    setTimeout(() => setShowContactDropdown(false), 200);
    if (customerName && mobileNumber && /^\d{10}$/.test(mobileNumber)) {
      handleContactSave();
    }
  };

  const handleMobileNumberBlur = () => {
    if (customerName && mobileNumber && /^\d{10}$/.test(mobileNumber)) {
      handleContactSave();
    }
  };

  const filteredContacts = savedContacts.filter(contact => 
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.mobileNumber.includes(contactSearch)
  );

  const contactExists = savedContacts.some(contact => 
    contact.name.toLowerCase() === customerName.toLowerCase()
  );

  useEffect(() => {
    if (activeField === 'productSearch' && productSearchRefs.current[activeRow]) {
      productSearchRefs.current[activeRow].focus();
    } else if (activeField === 'quantity' && quantityRefs.current[activeRow]) {
      quantityRefs.current[activeRow].focus();
    }
  }, [activeRow, activeField]);

  const handleInputChange = (index, field, value) => {
    const updatedItems = [...billItems];
    updatedItems[index][field] = value;
    setBillItems(updatedItems);
  };

  const handleProductKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length === 1) {
        selectProduct(filteredProducts[0], index);
      }
    } else if (e.key === 'ArrowDown' && showProductDropdown) {
      e.preventDefault();
      const firstItem = document.querySelector(`.product-item-${index}`);
      if (firstItem) firstItem.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setActiveField('quantity');
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

  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (field === 'quantity') {
        const product = products.find(p => p._id === billItems[index].productId);
        if (product) {
          // If product is out of stock
          if (product.stock <= 0) {
            // Remove the row
            const updatedItems = [...billItems];
            updatedItems.splice(index, 1);
            setBillItems(updatedItems);
            
            // Adjust active row if needed
            if (index >= updatedItems.length) {
              setActiveRow(updatedItems.length - 1);
            } else {
              setActiveRow(index);
            }
            setActiveField('productSearch');
            
            alert(`${product.nameTamil || product.name} is out of stock and has been removed from the bill`);
            return;
          }
          
          const quantity = parseInt(billItems[index].quantity);
          
          // If quantity exceeds available stock
          if (quantity > product.stock) {
            alert(`Only ${product.stock} items available for ${product.nameTamil || product.name}`);
            return;
          }
        }

        if (index === billItems.length - 1) {
          setBillItems([...billItems, { 
            productId: '', 
            quantity: '', 
            productName: '', 
            productNameTamil: '',
            price: 0
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
        const product = products.find(p => p._id === billItems[index].productId);
        if (product && product.stock <= 0) {
          // Remove the row if product is out of stock
          const updatedItems = [...billItems];
          updatedItems.splice(index, 1);
          setBillItems(updatedItems);
          
          // Adjust active row if needed
          if (index >= updatedItems.length) {
            setActiveRow(updatedItems.length - 1);
          } else {
            setActiveRow(index);
          }
          setActiveField('productSearch');
          
          alert(`${product.nameTamil || product.name} is out of stock and has been removed from the bill`);
          return;
        }

        if (index === billItems.length - 1) {
          setBillItems([...billItems, { 
            productId: '', 
            quantity: '', 
            productName: '', 
            productNameTamil: '',
            price: 0
          }]);
        }
        setActiveRow(index + 1);
        setActiveField('productSearch');
      }
    }
  };

  const handleCustomerNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mobileNumberRef.current) {
        mobileNumberRef.current.focus();
      }
    } else if (e.key === 'ArrowDown' && showContactDropdown && filteredContacts.length > 0) {
      e.preventDefault();
      const firstItem = document.querySelector('.contact-item');
      if (firstItem) firstItem.focus();
    }
  };

  const handleMobileNumberKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (productSearchRefs.current[0]) {
        productSearchRefs.current[0].focus();
      }
    }
  };

  const calculateTotal = (item) => {
    if (!item.productId || !item.quantity) return 0;
    return item.price * parseInt(item.quantity);
  };

  const grandTotal = billItems.reduce((sum, item) => sum + calculateTotal(item), 0);

  const resetForm = () => {
    setBillItems([{ 
      productId: '', 
      quantity: '', 
      productName: '', 
      productNameTamil: '',
      price: 0
    }]);
    setActiveRow(0);
    setActiveField('productSearch');
    setCustomerName('');
    setMobileNumber('');
    setTimeout(() => {
      if (customerNameRef.current) {
        customerNameRef.current.focus();
      }
    }, 0);
  };

  const handlePrint = async () => {
    if (billItems.filter(item => item.productId && item.quantity).length === 0) {
      alert('Please add items to the bill before printing');
      return;
    }
    if (!customerName || !mobileNumber) {
      alert('Please enter customer name and mobile number');
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      alert('Mobile number must be 10 digits');
      return;
    }

    setIsPrinting(true);

    try {
      const validItems = billItems
        .filter(item => item.productId && item.quantity)
        .map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price)
        }));

      const response = await fetch('https://billing-server-gaha.onrender.com/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: validItems,
          customerName,
          mobileNumber
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create bill');
      }

      const productsResponse = await fetch('https://billing-server-gaha.onrender.com/api/products');
      if (!productsResponse.ok) {
        throw new Error('Failed to refresh product data');
      }
      const updatedProducts = await productsResponse.json();
      setProducts(updatedProducts);

      const now = new Date();
      const date = now.toLocaleDateString('ta-IN');
      const time = now.toLocaleTimeString('ta-IN');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup was blocked. Please allow popups for this site.');
        setIsPrinting(false);
        return;
      }

      const validBillItems = billItems.filter(item => item.productId && item.quantity);

      const billContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>ராஜா ஸ்னாக்ஸ் பில்</title>
            <meta charset="UTF-8">
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { 
                width: 80mm;
                margin: 0;
                padding: 2mm;
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.2;
              }
              .header { 
                text-align: center; 
                margin-bottom: 2mm; 
              }
              .shop-name { 
                font-weight: bold; 
                font-size: 16px; 
                margin: 0; 
              }
              .bill-title { 
                font-weight: bold; 
                font-size: 15px; 
                margin: 1px 0; 
              }
              .contact { 
                font-size: 12px; 
                margin: 1px 0 2px 0; 
              }
              .customer-info { 
                margin-bottom: 2mm;
                display: flex;
                justify-content: space-between;
              }
              .customer-details {
                text-align: left;
              }
              .date-time {
                text-align: right;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 2mm; 
              }
              th, td { 
                padding: 2mm 0; 
                text-align: left; 
              }
              th { 
                border-bottom: 1px dashed #000; 
              }
              .item-row td { 
                border-bottom: 1px dashed #ddd; 
                padding: 2mm 0; 
              }
              .total-row { 
                font-weight: bold; 
                border-top: 1px dashed #000; 
                border-bottom: 1px dashed #000; 
              }
              .footer { 
                text-align: center; 
                margin-top: 2mm; 
                font-size: 12px; 
              }
            </style>
          </head>
          <body>
            <div class="header">
              <p class="shop-name">ராஜா ஸ்னாக்ஸ்</p>
              <p class="bill-title">கேஷ் பில்</p>
              <p class="contact">தொலைபேசி: 9842263860</p>
            </div>
            
            <div class="customer-info">
              <div class="customer-details">
                <div>வாடிக்கையாளர்: ${customerName}</div>
                <div>அலைபேசி: ${mobileNumber}</div>
              </div>
              <div class="date-time">
                <div>தேதி: ${date}</div>
                <div>நேரம்: ${time}</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th width="10%">#</th>
                  <th width="40%">பொருள்</th>
                  <th width="15%">அளவு</th>
                  <th width="15%">விலை</th>
                  <th width="20%">மொத்தம்</th>
                </tr>
              </thead>
              <tbody>
                ${validBillItems.map((item, idx) => `
                  <tr class="item-row">
                    <td>${idx + 1}</td>
                    <td>${item.productNameTamil}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price.toFixed(2)}</td>
                    <td>₹${calculateTotal(item).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <table>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">மொத்த தொகை:</td>
                <td>₹${grandTotal.toFixed(2)}</td>
              </tr>
            </table>
            
            <div class="footer">
              <p>என்றும் உங்களுடன் ராஜா ஸ்னாக்ஸ் !!! மீண்டும் வருக...</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(billContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          setIsPrinting(false);
          resetForm();
        }, 200);
      };
    } catch (err) {
      console.error('Error creating bill:', err);
      alert(`Error: ${err.message}`);
      setIsPrinting(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Billing</h2>
      
      {loadingProducts && <div className="alert alert-info">Loading products...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="row mb-3 no-print">
        <div className="col-md-6">
          <label className="form-label">Customer Name</label>
          <div className="position-relative">
            <input
              type="text"
              className="form-control"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setContactSearch(e.target.value);
                const exists = savedContacts.some(contact => 
                  contact.name.toLowerCase() === e.target.value.toLowerCase()
                );
                setShowContactDropdown(!exists && e.target.value.length > 0);
              }}
              onFocus={() => {
                if (savedContacts.length > 0 && customerName.length > 0) {
                  const exists = savedContacts.some(contact => 
                    contact.name.toLowerCase() === customerName.toLowerCase()
                  );
                  setShowContactDropdown(!exists);
                }
              }}
              onBlur={handleCustomerNameBlur}
              ref={customerNameRef}
              placeholder="Type customer name"
              onKeyDown={handleCustomerNameKeyDown}
            />
            {showContactDropdown && savedContacts.length > 0 && (
              <div 
                className="card position-absolute w-100" 
                style={{ zIndex: 1000 }}
                ref={dropdownRef}
              >
                <div className="card-body p-2">
                  <input
                    type="text"
                    className="form-control form-control-sm mb-2"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredContacts.length > 0 ? (
                      <ul className="list-group list-group-flush">
                        {filteredContacts.map((contact, index) => (
                          <li 
                            key={index}
                            className="list-group-item list-group-item-action p-2 contact-item"
                            onClick={() => selectContact(contact)}
                            onMouseDown={(e) => e.preventDefault()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                selectContact(contact);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                const nextItem = e.currentTarget.nextElementSibling;
                                if (nextItem) nextItem.focus();
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                const prevItem = e.currentTarget.previousElementSibling;
                                if (prevItem) prevItem.focus();
                                else customerNameRef.current.focus();
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                            tabIndex={0}
                          >
                            <div className="d-flex justify-content-between">
                              <span>{contact.name}</span>
                              <span className="text-muted">{contact.mobileNumber}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center text-muted p-2">No contacts found</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <label className="form-label">Mobile Number</label>
          <input
            type="text"
            className="form-control"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            onBlur={handleMobileNumberBlur}
            ref={mobileNumberRef}
            onKeyDown={handleMobileNumberKeyDown}
            placeholder="10 digit mobile number"
            maxLength="10"
          />
        </div>
      </div>
      
      <div className="table-responsive mb-4">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th width="5%">#</th>
              <th width="20%">Product (English)</th>
              <th width="20%">Product (Tamil)</th>
              <th width="10%">Quantity</th>
              <th width="10%">Price</th>
              <th width="10%">Total</th>
              <th width="15%">Available</th>
            </tr>
          </thead>
          <tbody>
            {billItems.map((item, index) => (
              <tr key={index} className={activeRow === index ? 'table-active' : ''}>
                <td>{index + 1}</td>
                <td>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={item.productId ? item.productName : productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        handleInputChange(index, 'productSearch', e.target.value);
                      }}
                      onKeyDown={(e) => handleProductKeyDown(e, index)}
                      onFocus={() => {
                        setActiveRow(index);
                        setActiveField('productSearch');
                        if (!item.productId) {
                          setShowProductDropdown(true);
                        }
                      }}
                      ref={el => productSearchRefs.current[index] = el}
                      placeholder="Search product..."
                    />
                    {showProductDropdown && activeRow === index && (
                      <div 
                        className="card position-absolute w-100" 
                        style={{ zIndex: 1000 }}
                        ref={productDropdownRef}
                      >
                        <div className="card-body p-2">
                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredProducts.length > 0 ? (
                              <ul className="list-group list-group-flush">
                                {filteredProducts.map((product, idx) => (
                                  <li 
                                    key={idx}
                                    className={`list-group-item list-group-item-action p-2 product-item-${index}`}
                                    onClick={() => selectProduct(product, index)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onKeyDown={(e) => handleProductItemKeyDown(e, product, index)}
                                    style={{ cursor: 'pointer' }}
                                    tabIndex={0}
                                  >
                                    <div className="d-flex justify-content-between">
                                      <span>{product.name}</span>
                                      <span className="text-muted">₹${product.price.toFixed(2)}</span>
                                    </div>
                                    <div className="text-muted small">{product.nameTamil}</div>
                                    <div className="text-muted small">Available: {product.stock}</div>
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
                </td>
                <td>{item.productNameTamil || '-'}</td>
                <td>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={item.quantity}
                    onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                    onFocus={() => {
                      setActiveRow(index);
                      setActiveField('quantity');
                    }}
                    ref={el => quantityRefs.current[index] = el}
                    min="1"
                    max={products.find(p => p._id === item.productId)?.stock || ''}
                  />
                </td>
                <td>₹{item.price.toFixed(2)}</td>
                <td>₹{calculateTotal(item).toFixed(2)}</td>
                <td>
                  {item.productId ? (
                    products.find(p => p._id === item.productId)?.stock || 0
                  ) : '-'}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan="5" className="text-end"><strong>Grand Total:</strong></td>
              <td colSpan="2"><strong>₹{grandTotal.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between no-print">
        <button 
          className="btn btn-danger" 
          onClick={resetForm}
          disabled={billItems.length === 1 && !billItems[0].productId && !billItems[0].quantity}
        >
          Clear Bill
        </button>
        <div>
          <button 
            className="btn btn-primary" 
            onClick={handlePrint}
            disabled={isPrinting || grandTotal === 0 || !customerName || !mobileNumber}
          >
            {isPrinting ? 'Printing...' : 'Print Bill'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billing;