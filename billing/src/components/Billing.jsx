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
  
  const productIdRefs = useRef([]);
  const quantityRefs = useRef([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/products');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        alert('Failed to load products');
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
    updatedItems[index][field] = value;
    
    if (field === 'productId') {
      const productId = parseInt(value);
      if (!isNaN(productId)) {
        const product = products.find(p => p._id === productId);
        if (product) {
          updatedItems[index].productName = product.nameTamil;
          updatedItems[index].price = product.price;
        } else {
          updatedItems[index].productName = '';
          updatedItems[index].price = 0;
        }
      }
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
        if (billItems[index].quantity) {
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
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      setActiveRow(index - 1);
      setActiveField(field);
    } else if (e.key === 'ArrowDown' && index < billItems.length - 1) {
      e.preventDefault();
      setActiveRow(index + 1);
      setActiveField(field);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (field === 'productId') {
        setActiveField('quantity');
      } else if (index < billItems.length - 1) {
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

  const handleCreateBill = async () => {
    const validItems = billItems
      .filter(item => item.productId && item.quantity)
      .map(item => ({
        productId: parseInt(item.productId),
        quantity: parseInt(item.quantity)
      }));
    
    if (validItems.length === 0) {
      alert('Please add at least one valid item');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/bills', {
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
        throw new Error(errorData.message || 'Failed to create bill');
      }

      const data = await response.json();
      alert('Bill created successfully!');
      setBillItems([{ productId: '', quantity: '', productName: '', price: 0 }]);
      setActiveRow(0);
      setActiveField('productId');
    } catch (err) {
      console.error('Error creating bill:', err);
      alert(err.message);
    }
  };

  const handlePrint = () => {
    if (billItems.filter(item => item.productId && item.quantity).length === 0) {
      alert('Please add items to the bill before printing');
      return;
    }
    if (!customerName || !mobileNumber) {
      alert('Please enter customer name and mobile number');
      return;
    }

    setIsPrinting(true);
    
    // Get current date and time in Tamil format
    const now = new Date();
    const date = now.toLocaleDateString('ta-IN');
    const time = now.toLocaleTimeString('ta-IN');

    // Create a print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup was blocked. Please allow popups for this site.');
      setIsPrinting(false);
      return;
    }

    // Generate the bill content
    const billContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>கேஷ் பில்</title>
          <meta charset="UTF-8">
          <style>
            @page { 
              size: 58mm;
              margin: 0;
            }
            body { 
              width: 58mm;
              margin: 0;
              font-family: 'Arial Unicode MS', 'Tahoma', sans-serif;
              font-size: 10px;
              line-height: 1.2;
            }
            h2, h3 {
              margin: 2px 0;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 2px;
              border-bottom: 1px dashed #000;
            }
            .text-end {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h2>ராஜா ஸ்னாக்ஸ்</h2>
          <h3>கேஷ் பில்</h3>
          <p ><strong>PHONE:9842263860</strong></p>
          <p class="text-end">தேதி: ${date}</p>
          <p>வாடிக்கையாளர்: ${customerName}</p>
          <p>அலைபேசி எண்: ${mobileNumber}</p>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>பொருள்</th>
                <th>அளவு</th>
                <th>விலை</th>
                <th>மொத்தம்</th>
              </tr>
            </thead>
            <tbody>
              ${billItems
                .filter(item => item.productId && item.quantity)
                .map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.productName}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price.toFixed(2)}</td>
                    <td>₹${calculateTotal(item).toFixed(2)}</td>
                  </tr>
                `).join('')}
              <tr>
                <td colspan="4" class="text-end"><strong>மொத்த தொகை:</strong></td>
                <td><strong>₹${grandTotal.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <p class="text-center mt-4">என்றும் உங்களுடன் ராஜா ஸ்னாக்ஸ் !!! மீண்டும் வருக...</p>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(billContent);
    printWindow.document.close();

    // Wait for content to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 200);
    };
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Billing</h2>
      
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
              <th width="25%">Product ID</th>
              <th width="30%">Product Name (Tamil)</th>
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
                  />
                </td>
                <td>₹{item.price.toFixed(2)}</td>
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
          onClick={() => {
            setBillItems([{ productId: '', quantity: '', productName: '', price: 0 }]);
            setActiveRow(0);
            setActiveField('productId');
          }}
          disabled={billItems.length === 1 && !billItems[0].productId && !billItems[0].quantity}
        >
          Clear Bill
        </button>
        <div>
          <button 
            className="btn btn-success me-2" 
            onClick={handleCreateBill}
            disabled={grandTotal === 0 || !customerName || !mobileNumber}
          >
            Save Bill
          </button>
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