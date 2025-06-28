import React, { useState, useEffect, useRef } from 'react';

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [billItems, setBillItems] = useState([{ 
    productId: '', 
    quantity: '', 
    productName: '', 
    price: 0
  }]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeField, setActiveField] = useState('productId');
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  
  const productIdRefs = useRef([]);
  const quantityRefs = useRef([]);

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
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    // Focus the active field whenever it changes
    if (activeField === 'productId' && productIdRefs.current[activeRow]) {
      productIdRefs.current[activeRow].focus();
    } else if (activeField === 'quantity' && quantityRefs.current[activeRow]) {
      quantityRefs.current[activeRow].focus();
    }
  }, [activeRow, activeField]);

  const handleInputChange = (index, field, value) => {
    const updatedItems = [...billItems];
    
    if (field === 'productId') {
      const productId = parseInt(value);
      if (!isNaN(productId)) {
        const product = products.find(p => p._id === productId);
        if (product) {
          updatedItems[index].productName = product.nameTamil;
          updatedItems[index].price = product.price; // Fixed price from product
        } else {
          updatedItems[index].productName = '';
          updatedItems[index].price = 0;
        }
      }
      updatedItems[index][field] = value;
    } else {
      updatedItems[index][field] = value;
    }
    
    setBillItems(updatedItems);
  };

  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (field === 'productId') {
        if (billItems[index].productId && billItems[index].productName) {
          setActiveField('quantity');
        }
      } else if (field === 'quantity') {
        const product = products.find(p => p._id === parseInt(billItems[index].productId));
        if (product && parseInt(billItems[index].quantity) > product.stock) {
          alert(`Only ${product.stock} items available for ${product.nameTamil}`);
          return;
        }

        if (index === billItems.length - 1) {
          setBillItems([...billItems, { 
            productId: '', 
            quantity: '', 
            productName: '', 
            price: 0
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
        if (index === billItems.length - 1) {
          setBillItems([...billItems, { 
            productId: '', 
            quantity: '', 
            productName: '', 
            price: 0
          }]);
        }
        setActiveRow(index + 1);
        setActiveField('productId');
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
      price: 0
    }]);
    setActiveRow(0);
    setActiveField('productId');
    setCustomerName('');
    setMobileNumber('');
    // Focus on first product ID field after reset
    setTimeout(() => {
      if (productIdRefs.current[0]) {
        productIdRefs.current[0].focus();
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

    setIsPrinting(true);

    try {
      // First save the bill (which updates stock)
      const validItems = billItems
        .filter(item => item.productId && item.quantity)
        .map(item => ({
          productId: parseInt(item.productId),
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

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.availableStock !== undefined) {
          throw new Error(`${errorData.message}. Please adjust your quantity.`);
        }
        throw new Error(errorData.message || 'Failed to create bill');
      }

      // Refresh products to get updated stock levels
      const productsResponse = await fetch('https://billing-server-gaha.onrender.com/api/products');
      const updatedProducts = await productsResponse.json();
      setProducts(updatedProducts);

      // Generate print content
      const now = new Date();
      const date = now.toLocaleDateString('ta-IN');
      const time = now.toLocaleTimeString('ta-IN');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup was blocked. Please allow popups for this site.');
        setIsPrinting(false);
        return;
      }

      // Calculate how many items can fit per page (adjust based on your printer)
      const itemsPerPage = 8; // Adjust this number based on your thermal printer
      const validBillItems = billItems.filter(item => item.productId && item.quantity);
      const totalPages = Math.ceil(validBillItems.length / itemsPerPage);

      let billContent = '';
      
      for (let page = 0; page < totalPages; page++) {
        const startIdx = page * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const pageItems = validBillItems.slice(startIdx, endIdx);
        
        billContent += `
          <!DOCTYPE html>
          <html>
            <head>
              <title>ராஜா ஸ்னாக்ஸ் பில்</title>
              <meta charset="UTF-8">
              <style>
                @page { 
                  size: 80mm auto; /* Adjusted for better thermal paper usage */
                  margin: 0;
                }
                body { 
                  width: 80mm;
                  margin: 0;
                  padding: 2mm;
                  font-family: Arial, sans-serif;
                  font-size: 10px;
                  line-height: 1.2;
                }
                .header {
                  text-align: center;
                  margin-bottom: 2mm;
                }
                .shop-name {
                  font-weight: bold;
                  font-size: 12px;
                  margin: 0;
                }
                .bill-title {
                  font-weight: bold;
                  font-size: 11px;
                  margin: 1px 0;
                }
                .contact {
                  font-size: 9px;
                  margin: 1px 0 2px 0;
                }
                .customer-info {
                  margin-bottom: 2mm;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 2mm;
                }
                th, td {
                  padding: 1mm 0;
                  text-align: left;
                }
                th {
                  border-bottom: 1px dashed #000;
                }
                .item-row td {
                  border-bottom: 1px dashed #ddd;
                  padding: 1mm 0;
                }
                .total-row {
                  font-weight: bold;
                  border-top: 1px dashed #000;
                  border-bottom: 1px dashed #000;
                }
                .footer {
                  text-align: center;
                  margin-top: 2mm;
                  font-size: 9px;
                }
                .page-break {
                  page-break-after: always;
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
                <div>தேதி: ${date}</div>
                <div>நேரம்: ${time}</div>
                <div>வாடிக்கையாளர்: ${customerName}</div>
                <div>அலைபேசி: ${mobileNumber}</div>
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
                  ${pageItems.map((item, idx) => `
                    <tr class="item-row">
                      <td>${startIdx + idx + 1}</td>
                      <td>${item.productName}</td>
                      <td>${item.quantity}</td>
                      <td>₹${item.price.toFixed(2)}</td>
                      <td>₹${calculateTotal(item).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              ${page === totalPages - 1 ? `
                <table>
                  <tr class="total-row">
                    <td colspan="4" style="text-align: right;">மொத்த தொகை:</td>
                    <td>₹${grandTotal.toFixed(2)}</td>
                  </tr>
                </table>
                
                <div class="footer">
                  <p>என்றும் உங்களுடன் ராஜா ஸ்னாக்ஸ் !!! மீண்டும் வருக...</p>
                </div>
              ` : ''}
              
              ${page < totalPages - 1 ? '<div class="page-break"></div>' : ''}
            </body>
          </html>
        `;
      }

      printWindow.document.open();
      printWindow.document.write(billContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          setIsPrinting(false);
          resetForm(); // Reset the form after printing
        }, 200);
      };
    } catch (err) {
      console.error('Error creating bill:', err);
      alert(err.message);
      setIsPrinting(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Billing</h2>
      
      {loadingProducts && <div className="alert alert-info">Loading products...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {/* Customer Details */}
      <div className="row mb-3 no-print">
        <div className="col-md-6">
          <label className="form-label">Customer Name</label>
          <input
            type="text"
            className="form-control"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Mobile Number</label>
          <input
            type="text"
            className="form-control"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />
        </div>
      </div>
      
      {/* Billing Table */}
      <div className="table-responsive mb-4">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th width="5%">#</th>
              <th width="20%">Product ID</th>
              <th width="25%">Product Name (Tamil)</th>
              <th width="15%">Quantity</th>
              <th width="15%">Price</th>
              <th width="15%">Total</th>
            </tr>
          </thead>
          <tbody>
            {billItems.map((item, index) => (
              <tr key={index} className={activeRow === index ? 'table-active' : ''}>
                <td>{index + 1}</td>
                <td>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={item.productId}
                    onChange={(e) => handleInputChange(index, 'productId', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index, 'productId')}
                    onFocus={() => {
                      setActiveRow(index);
                      setActiveField('productId');
                    }}
                    ref={el => productIdRefs.current[index] = el}
                  />
                </td>
                <td>{item.productName}</td>
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
                    max={products.find(p => p._id === parseInt(item.productId))?.stock || ''}
                  />
                  {item.productId && (
                    <small className="text-muted">
                      Available: {products.find(p => p._id === parseInt(item.productId))?.stock || 0}
                    </small>
                  )}
                </td>
                <td>
                  {item.price.toFixed(2)} {/* Display price as read-only */}
                </td>
                <td>₹{calculateTotal(item).toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan="5" className="text-end"><strong>Grand Total:</strong></td>
              <td><strong>₹{grandTotal.toFixed(2)}</strong></td>
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