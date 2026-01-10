import React, { useState, useEffect, useRef } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by Error Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="alert alert-danger">Something went wrong. Please try again.</div>;
    }
    return this.props.children;
  }
}

const Billing = () => {
  // State for active tabs
  const generateBillNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    return `BILL-${year}${month}${day}-${random}`;
  };

  const [openBills, setOpenBills] = useState(() => {
    try {
      const savedBills = localStorage.getItem('billing_openBills_v1');
      if (savedBills) {
        const parsed = JSON.parse(savedBills);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure each bill has a billNumber
          return parsed.map(bill => ({
            ...bill,
            billNumber: bill.billNumber || generateBillNumber()
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse saved bills from localStorage:', e);
    }
    return [{
      id: Date.now(),
      billNumber: generateBillNumber(),
      billItems: [{
        productId: '',
        quantity: '',
        productName: '',
        productNameTamil: '',
        price: 0
      }],
      activeRow: 0,
      activeField: 'productSearch',
      productSearch: '',
      showProductDropdown: false,
      isPrinting: false
    }];
  });
  const [tabIndex, setTabIndex] = useState(() => {
    try {
      const savedTabIndex = localStorage.getItem('billing_tabIndex_v1');
      if (savedTabIndex !== null) {
        const idx = parseInt(savedTabIndex, 10);
        if (!isNaN(idx)) return idx;
      }
    } catch (e) {
      console.error('Failed to parse saved tab index from localStorage:', e);
    }
    return 0;
  });
  
  // State for bill history
  const [billHistory, setBillHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState({
    totalAmount: 0,
    billCount: 0,
    averageBill: 0
  });
  
  // Shared state
  const [products, setProducts] = useState([]);
  const [savedContacts, setSavedContacts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const productSearchRefs = useRef([]);
  const quantityRefs = useRef([]);
  const dropdownRefs = useRef(null);

  // Persist bill tabs across navigation using localStorage

  useEffect(() => {
    try {
      localStorage.setItem('billing_openBills_v1', JSON.stringify(openBills));
      localStorage.setItem('billing_tabIndex_v1', String(tabIndex));
    } catch (e) {
      console.error('Failed to persist bill state:', e);
    }
  }, [openBills, tabIndex]);

  // Add F2 key listener for printing
// Global keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e) => {
    const activeBill = openBills[tabIndex];
    if (!activeBill) return;

    switch (e.key) {
      case 'F2':
      case 'F3': // PRINT BILL
        e.preventDefault();
        if (!activeBill.isPrinting) {
          handlePrint(activeBill.id);
        }
        break;

      case 'F4': // NEW BILL
        e.preventDefault();
        addNewBill();
        break;

      case 'F6': // CLEAR BILL
        e.preventDefault();
        resetForm(activeBill.id);
        break;

      case 'Escape': // CLOSE DROPDOWNS
        e.preventDefault();
        updateBillState(activeBill.id, {
          showProductDropdown: false
        });
        break;

      default:
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [openBills, tabIndex]);


  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetch('https://billing-server-gaha.onrender.com/api/products');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
    loadSavedContacts();
    fetchBillHistory();
  }, []);

  useEffect(() => {
    fetchBillHistory();
  }, [dateFilter]);

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

  const fetchBillHistory = async () => {
    try {
      setHistoryLoading(true);
      const [historyRes, summaryRes] = await Promise.all([
        fetch(`https://billing-server-gaha.onrender.com/api/bills?date=${dateFilter}`),
        fetch(`https://billing-server-gaha.onrender.com/api/bills/summary?date=${dateFilter}`)
      ]);
      
      if (!historyRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const historyData = await historyRes.json();
      const summaryData = await summaryRes.json();
      
      setBillHistory(historyData.bills || []);
      setDailySummary({
        totalAmount: summaryData.summary?.totalAmount || 0,
        billCount: summaryData.summary?.billCount || 0,
        averageBill: summaryData.summary?.averageBill || 0
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const addNewBill = () => {
    const newBill = {
      id: Date.now(),
      billNumber: generateBillNumber(),
      billItems: [{
        productId: '',
        quantity: '',
        productName: '',
        productNameTamil: '',
        price: 0
      }],
      activeRow: 0,
      activeField: 'productSearch',
      productSearch: '',
      showProductDropdown: false,
      isPrinting: false
    };
    setOpenBills([...openBills, newBill]);
    setTabIndex(openBills.length);
  };

  const closeBill = (index) => {
    const updatedBills = [...openBills];
    updatedBills.splice(index, 1);
    setOpenBills(updatedBills);
    setTabIndex(Math.min(index, updatedBills.length - 1));
  };

  const updateBillState = (billId, updates) => {
    setOpenBills(openBills.map(bill => 
      bill.id === billId ? { ...bill, ...updates } : bill
    ));
  };

  const handleProductSearch = (billId, searchTerm, index) => {
    if (typeof searchTerm !== 'string') {
      searchTerm = ''; // Ensure searchTerm is a string
    }
    const searchLower = searchTerm.toLowerCase();
    const filtered = products.filter(product => 
      (product?.name?.toLowerCase() || '').includes(searchLower) ||
      (product?.nameTamil?.toLowerCase() || '').includes(searchLower)
    );
    setFilteredProducts(filtered);
    
    // Update only the active row's product search
    const bill = openBills.find(b => b.id === billId);
    const updatedBillItems = [...bill.billItems];
    updatedBillItems[index] = {
      ...updatedBillItems[index],
      productSearch: searchTerm
    };
    
    updateBillState(billId, {
      billItems: updatedBillItems,
      productSearch: searchTerm,
      showProductDropdown: searchTerm.length > 0,
      activeRow: index
    });
  };

  const selectProduct = (billId, product, index) => {
    if (!product || product.stock <= 0) {
      alert(`${product?.nameTamil || product?.name || 'Product'} is out of stock`);
      return;
    }

    const bill = openBills.find(b => b.id === billId);
    const updatedItems = [...bill.billItems];
    updatedItems[index] = {
      ...updatedItems[index],
      productId: product._id,
      productName: product.name,
      productNameTamil: product.nameTamil,
      price: product.price || 0,
      productSearch: product.name // Keep product name visible
    };
    
    updateBillState(billId, {
      billItems: updatedItems,
      productSearch: product.name, // Show selected product name
      showProductDropdown: false,
      activeField: 'quantity',
      activeRow: index
    });
    
    setTimeout(() => {
      if (quantityRefs.current[index]) {
        quantityRefs.current[index].focus();
      }
    }, 0);
  };

  const handleProductKeyDown = (billId, e, index) => {
    const bill = openBills.find(b => b.id === billId);
    const currentItem = bill.billItems[index];

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (bill.showProductDropdown && filteredProducts.length > 0) {
          const firstProduct = filteredProducts[0];
          selectProduct(billId, firstProduct, index);
        } else if (currentItem.productId && currentItem.quantity) {
          // If product is already selected and quantity is entered, move to next row
          const nextIndex = Math.min(index + 1, bill.billItems.length - 1);
          updateBillState(billId, { 
            activeRow: nextIndex,
            activeField: 'productSearch',
            showProductDropdown: false
          });
          if (productSearchRefs.current[nextIndex]) {
            productSearchRefs.current[nextIndex].focus();
          }
        } else if (quantityRefs.current[index]) {
          quantityRefs.current[index].focus();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!bill.showProductDropdown && filteredProducts.length > 0) {
          updateBillState(billId, { showProductDropdown: true });
        }
        if (filteredProducts.length > 0) {
          const firstItem = document.querySelector(`.product-item-${index}`);
          if (firstItem) {
            firstItem.focus();
            // Prevent scrolling the page
            e.stopPropagation();
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (document.activeElement.classList.contains('product-item')) {
          // If we're on a product item, move focus back to search input
          if (productSearchRefs.current[index]) {
            productSearchRefs.current[index].focus();
          }
        }
        e.stopPropagation();
        break;
      case 'Escape':
        updateBillState(billId, { showProductDropdown: false });
        e.stopPropagation();
        break;
      case 'Tab':
        updateBillState(billId, { showProductDropdown: false });
        break;
      default:
        break;
    }
  };

  const handleQuantityKeyDown = (billId, e, index) => {
    const bill = openBills.find(b => b.id === billId);
    
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const product = products.find(p => p._id === bill.billItems[index].productId);
      if (product) {
        if (product.stock <= 0) {
          removeBillItem(billId, index);
          alert(`${product.nameTamil || product.name} is out of stock and has been removed from the bill`);
          return;
        }
        
        const quantity = parseInt(bill.billItems[index].quantity || 0);
        if (quantity > product.stock) {
          alert(`Only ${product.stock} items available for ${product.nameTamil || product.name}`);
          return;
        }
      }

      const nextRowIndex = index + 1;
      
      if (nextRowIndex >= bill.billItems.length) {
        updateBillState(billId, {
          billItems: [...bill.billItems, { 
            productId: '', 
            quantity: '', 
            productName: '', 
            productNameTamil: '',
            price: 0,
            productSearch: ''
          }],
          activeRow: nextRowIndex,
          activeField: 'productSearch'
        });
      } else {
        updateBillState(billId, {
          activeRow: nextRowIndex,
          activeField: 'productSearch'
        });
      }

      setTimeout(() => {
        if (productSearchRefs.current[nextRowIndex]) {
          productSearchRefs.current[nextRowIndex].focus();
        }
      }, 0);
    } else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0) {
        e.preventDefault();
        updateBillState(billId, { 
          activeField: 'productSearch',
          activeRow: index
        });
      }
    } else if (e.key === 'Backspace' && bill.billItems[index].quantity === '' && e.target.selectionStart === 0) {
      e.preventDefault();
      updateBillState(billId, { 
        activeField: 'productSearch',
        activeRow: index
      });
    }
  };

  const removeBillItem = (billId, index) => {
    const bill = openBills.find(b => b.id === billId);
    const updatedItems = [...bill.billItems];
    updatedItems.splice(index, 1);
    
    if (updatedItems.length === 0) {
      updatedItems.push({ 
        productId: '', 
        quantity: '', 
        productName: '', 
        productNameTamil: '',
        price: 0,
        productSearch: ''
      });
    }
    
    updateBillState(billId, {
      billItems: updatedItems,
      activeRow: Math.min(index, updatedItems.length - 1),
      activeField: 'productSearch'
    });
  };

  const calculateTotal = (bill) => {
    return bill.billItems.reduce((sum, item) => {
      if (!item.productId || !item.quantity) return sum;
      return sum + ((item.price || 0) * parseInt(item.quantity || 0));
    }, 0);
  };

  const resetForm = (billId) => {
    updateBillState(billId, {
      billItems: [{ 
        productId: '', 
        quantity: '', 
        productName: '', 
        productNameTamil: '',
        price: 0,
        productSearch: ''
      }],
      activeRow: 0,
      activeField: 'productSearch',
      productSearch: ''
    });
  };

  const handlePrint = async (billId) => {
    updateBillState(billId, { isPrinting: true });
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const bill = openBills.find(b => b.id === billId);
      const validItems = bill.billItems
        .filter(item => item.productId && item.quantity)
        .map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity || 0),
          price: parseFloat(item.price || 0),
          nameTamil: item.productNameTamil || ''
        }));

      if (validItems.length === 0) {
        alert('Please add items to the bill before printing');
        updateBillState(billId, { isPrinting: false });
        return;
      }

      updateBillState(billId, { isPrinting: true });

      try {
        const isExistingBill = Boolean(bill._id);
        
        if (isExistingBill && !bill._id) {
          throw new Error('Cannot update bill: Missing bill ID');
        }
        
        const url = isExistingBill 
          ? `https://billing-server-gaha.onrender.com/api/bills/${bill._id}`
          : 'https://billing-server-gaha.onrender.com/api/bills';
          
        const method = isExistingBill ? 'PUT' : 'POST';
        
        const requestBody = {
          items: validItems,
          customerName: bill.customerName || 'Walk-in Customer',
          mobileNumber: bill.mobileNumber || '0000000000'
        };
        
        // Only include billNumber for new bills
        if (!isExistingBill) {
          requestBody.billNumber = bill.billNumber;
        }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create bill');
      }

      const productsResponse = await fetch('https://billing-server-gaha.onrender.com/api/products');
      setProducts(await productsResponse.json());
      await fetchBillHistory();

      const now = new Date();
      const date = now.toLocaleDateString('ta-IN');
      const time = now.toLocaleTimeString('ta-IN');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup was blocked. Please allow popups for this site.');
        updateBillState(billId, { isPrinting: false });
        return;
      }

      const validBillItems = bill.billItems.filter(item => item.productId && item.quantity);

const billContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>ராஜா ஸ்னாக்ஸ் பில்</title>
      <meta charset="UTF-8">
      <style>
        @page { 
          size: auto;  /* Changed from 80mm to auto to fit content */
          margin: 0; 
          padding: 2mm;
        }
        body { 
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;  /* Center the content */
          padding: 2mm;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.2;
          box-sizing: border-box;  /* Include padding in width calculation */
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
          flex-wrap: wrap;  /* Allow wrapping on small screens */
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
          table-layout: fixed;  /* Better table layout control */
          word-wrap: break-word; /* Break long words */
        }
        th, td { 
          padding: 2mm 0; 
          text-align: left; 
          word-break: break-word; /* Ensure text breaks to prevent overflow */
        }
        th { 
          border-bottom: 1px dashed #000; 
        }
        .item-row td { 
          border-bottom: 1px dashed #ddd; 
          padding: 2mm 0; 
          vertical-align: top;  /* Align content to top of cell */
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
        /* Add media print specific styles */
        @media print {
          body {
            width: 100%;
            margin: 0;
            padding: 2mm;
          }
          /* Ensure tables don't break across pages */
          table { 
            page-break-inside: avoid;
          }
          /* Ensure each item stays together */
          .item-row {
            page-break-inside: avoid;
          }
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
                <div>பில் எண்: ${bill.billNumber}</div>
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
                  <th width="20%" style="padding-right: 10px;">விலை</th>
                  <th width="15%">மொத்தம்</th>
                </tr>
              </thead>
              <tbody>
                ${validBillItems.map((item, idx) => `
                  <tr class="item-row">
                    <td>${idx + 1}</td>
                    <td>${item.productNameTamil || '-'}</td>
                    <td>${item.quantity}</td>
                    <td style="padding-right: 10px;">₹${(item.price || 0).toFixed(2)}</td>
                    <td>₹${((item.price || 0) * parseInt(item.quantity || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <table>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">மொத்த தொகை:</td>
                <td>₹${calculateTotal(bill).toFixed(2)}</td>
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
          updateBillState(billId, {
            isPrinting: false,
            billItems: [{ 
              productId: '', 
              quantity: '', 
              productName: '', 
              productNameTamil: '',
              price: 0,
              productSearch: ''
            }],
            activeRow: 0,
            activeField: 'productSearch',
            productSearch: '',
            showProductDropdown: false
          });
        }, 200);
      };
    } catch (err) {
      console.error('Error creating bill:', err);
      alert(`Error: ${err.message}`);
      updateBillState(billId, { isPrinting: false });
    }
    } catch (err) {
      console.error('Unexpected error in handlePrint:', err);
      alert(`Error: ${err.message}`);
      updateBillState(billId, { isPrinting: false });
    } finally {
      // Ensure printing state is reset
      updateBillState(billId, { isPrinting: false });
    }

  };

  const reprintBill = async (bill) => {
  try {
    // Set printing state to true if this is an open bill
    if (bill.id) {
      updateBillState(bill.id, { isPrinting: true });
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Popup was blocked. Please allow popups for this site.');
    }
    
    // If this is a bill from history, fetch the full details
    let billToPrint = bill;
    if (!bill.items && bill._id) {
      const response = await fetch(`https://billing-server-gaha.onrender.com/api/bills/${bill._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bill details');
      }
      billToPrint = await response.json();
    }  

    const now = new Date();
    const date = now.toLocaleDateString('ta-IN');
    const time = now.toLocaleTimeString('ta-IN');

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
              <div>பில் எண்: ${billToPrint.billNumber}</div>
            </div>
            <div class="date-time">
              <div>தேதி: ${new Date(billToPrint.createdAt).toLocaleDateString('ta-IN')}</div>
              <div>நேரம்: ${new Date(billToPrint.createdAt).toLocaleTimeString('ta-IN')}</div>
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
              ${billToPrint.items.map((item, idx) => `
                <tr class="item-row">
                  <td>${idx + 1}</td>
                  <td>${item.product?.nameTamil || '-'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${(item.price || 0).toFixed(2)}</td>
                  <td>₹${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <table>
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">மொத்த தொகை:</td>
              <td>₹${(billToPrint.totalAmount || 0).toFixed(2)}</td>
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

    await new Promise((resolve, reject) => {
      printWindow.onload = () => {
        try {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            resolve();
          }, 200);
        } catch (err) {
          printWindow.close();
          reject(err);
        }
      };
      
      // Fallback in case onload doesn't fire
      setTimeout(() => {
        if (!printWindow.closed) {
          try {
            printWindow.print();
            printWindow.close();
            resolve();
          } catch (err) {
            printWindow.close();
            reject(err);
          }
        }
      }, 1000);
    });
  } catch (err) {
    console.error('Error in reprintBill:', err);
    alert(`Error reprinting bill: ${err.message}`);
  } finally {
    // Ensure we always reset the printing state
    if (bill?.id) {
      updateBillState(bill.id, { isPrinting: false });
    }
  }
};

const editBill = (bill) => {
  // Check if this bill is already open in a tab
  const existingTabIndex = openBills.findIndex(b => b.billNumber === bill.billNumber);
  
  if (existingTabIndex >= 0) {
    // Switch to the existing tab
    setTabIndex(existingTabIndex);
    return;
  }

  const newBill = {
    id: Date.now(),
    _id: bill._id, // Include the MongoDB _id for updates
    billNumber: bill.billNumber,
    billItems: bill.items.map(item => ({
      productId: item.productId || '',
      quantity: item.quantity.toString(),
      productName: item.nameTamil || '',
      productNameTamil: item.nameTamil || '',
      price: item.price || 0,
      productSearch: item.nameTamil || ''
    })),
    activeRow: 0,
    activeField: 'productSearch',
    productSearch: '',
    showProductDropdown: false,
    isPrinting: false,
    isExistingBill: true,
    customerName: bill.customerName || 'Walk-in Customer',
    mobileNumber: bill.mobileNumber || '0000000000'
  };

  // If no items, add an empty row
  if (newBill.billItems.length === 0) {
    newBill.billItems.push({
      productId: '',
      quantity: '',
      productName: '',
      productNameTamil: '',
      price: 0,
      productSearch: ''
    });
  }

  setOpenBills([...openBills, newBill]);
  setTabIndex(openBills.length);
};
  return (
    <div className="container mt-4">
      <ErrorBoundary>
        <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)}>
          <TabList>
            {openBills.map((bill, index) => (
              <Tab key={bill.id}>
                Bill {index + 1}
                <button 
                  className="close-tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeBill(index);
                  }}
                >
                  &times;
                </button>
              </Tab>
            ))}
            <Tab>
              <button 
                className="btn btn-sm btn-primary" 
                onClick={(e) => {
                  e.stopPropagation();
                  addNewBill();
                }}
                style={{margin: '0 5px', padding: '2px 8px', fontSize: '14px', lineHeight: '1.5'}}
              >
                + New Bill
              </button>
            </Tab>
            <Tab>Bill History</Tab>
          </TabList>

          {openBills.map((bill) => (
            <TabPanel key={bill.id}>
              <BillForm 
                bill={bill}
                products={products}
                filteredProducts={filteredProducts}
                loadingProducts={loadingProducts}
                error={error}
                updateBillState={updateBillState}
                onProductSearch={(value, index) => handleProductSearch(bill.id, value, index)}
                onSelectProduct={(product, index) => selectProduct(bill.id, product, index)}
                onRemoveItem={(index) => removeBillItem(bill.id, index)}
                onPrint={() => handlePrint(bill.id)}
                onProductKeyDown={(e, index) => handleProductKeyDown(bill.id, e, index)}
                onQuantityKeyDown={(e, index) => handleQuantityKeyDown(bill.id, e, index)}
                onClearBill={() => resetForm(bill.id)}
                productSearchRefs={productSearchRefs}
                quantityRefs={quantityRefs}
                dropdownRefs={dropdownRefs}
                calculateTotal={() => calculateTotal(bill)}
              />
            </TabPanel>
          ))}

          <TabPanel>
            <div className="text-center p-4">
              <p>Click the "+ New Bill" button in the tab bar to create a new bill.</p>
            </div>
          </TabPanel>

          <TabPanel>
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h4>Bill History</h4>
                <div>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="card-body">
                {historyLoading ? (
                  <div className="text-center">Loading...</div>
                ) : (
                  <>
                    <div className="row mb-4">
                      <div className="col-md-4">
                        <div className="card text-white bg-primary">
                          <div className="card-body">
                            <h5 className="card-title">Total Bills</h5>
                            <p className="card-text display-6">{dailySummary.billCount}</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card text-white bg-success">
                          <div className="card-body">
                            <h5 className="card-title">Total Amount</h5>
                            <p className="card-text display-6">₹{dailySummary.totalAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card text-white bg-info">
                          <div className="card-body">
                            <h5 className="card-title">Average Bill</h5>
                            <p className="card-text display-6">₹{dailySummary.averageBill.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Bill No</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billHistory.map((bill) => (
                            <tr key={bill._id}>
                              <td>{bill.billNumber}</td>
                              <td>{new Date(bill.createdAt).toLocaleString()}</td>
                              <td>{bill.items.length}</td>
                              <td>₹{(bill.totalAmount || 0).toFixed(2)}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-info me-2"
                                  onClick={() => editBill(bill)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => reprintBill(bill)}
                                >
                                  Reprint
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </ErrorBoundary>
    </div>
  );
};

const BillForm = ({
  bill,
  products,
  filteredProducts,
  loadingProducts,
  error,
  updateBillState,
  onProductSearch,
  onSelectProduct,
  onRemoveItem,
  onPrint,
  onProductKeyDown,
  onQuantityKeyDown,
  onClearBill,
  productSearchRefs,
  quantityRefs,
  dropdownRefs,
  calculateTotal
}) => {
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const dropdownContainerRef = useRef(null);

  const handleCustomerNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      //   mobileNumberRefs.current.focus();
      // }
    } else if (e.key === 'ArrowDown' && filteredContacts.length > 0) {
      e.preventDefault();
      setShowContactDropdown(true);
      const firstItem = document.querySelector('.contact-item');
      if (firstItem) firstItem.focus();
    } else if (e.key === 'Escape') {
      setShowContactDropdown(false);
    }
  };

  const handleCustomerNameBlur = (e) => {
    // Use setTimeout to allow click events on dropdown items to fire first
    setTimeout(() => {
      // Check if the newly focused element is not inside our dropdown
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(document.activeElement)) {
        setShowContactDropdown(false);
      }
    }, 200);
  };

  const handleMobileNumberKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // if (productSearchRefs.current[0]) {
      //   productSearchRefs.current[0].focus();
      // }
    }
  };

  return (
    <>
      {loadingProducts && <div className="alert alert-info">Loading products...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="form-group">
            <label className="form-label">Bill Number</label>
            <input
              type="text"
              className="form-control"
              value={bill.billNumber || ''}
              readOnly
              style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa' }}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="text"
              className="form-control"
              value={new Date().toLocaleDateString()}
              readOnly
              style={{ backgroundColor: '#f8f9fa' }}
            />
          </div>
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
              <th width="10%">Action</th>
            </tr>
          </thead>
          <tbody>
            {bill.billItems.map((item, index) => (
              <tr key={index} className={bill.activeRow === index ? 'table-active' : ''}>
                <td>{index + 1}</td>
                <td>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={item.productId ? item.productName : (item.productSearch || '')}
                      onChange={(e) => onProductSearch(e.target.value, index)}
                      onKeyDown={(e) => onProductKeyDown(e, index)}
                      onFocus={() => {
                        if (!item.productId) {
                          onProductSearch('', index);
                        }
                      }}
                      ref={(el) => (productSearchRefs.current[index] = el)}
                      placeholder="Search product..."
                    />
                    {bill.showProductDropdown && bill.activeRow === index && (
                      <div className="card position-absolute w-100" style={{ zIndex: 1000 }}>
                        <div className="card-body p-2">
                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredProducts.length > 0 ? (
                              <ul className="list-group list-group-flush">
                                {filteredProducts.map((product, idx) => (
                                  <li 
                                    key={product._id}
                                    className={`list-group-item list-group-item-action p-2 product-item-${index}`}
                                    onClick={() => onSelectProduct(product, index)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        onSelectProduct(product, index);
                                      } else if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        const nextItem = e.currentTarget.nextElementSibling;
                                        if (nextItem) nextItem.focus();
                                      } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        const prevItem = e.currentTarget.previousElementSibling;
                                        if (prevItem) prevItem.focus();
                                        else productSearchRefs.current[index].focus();
                                      }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    tabIndex={0}
                                  >
                                    <div className="d-flex justify-content-between">
                                      <span>{product.name}</span>
                                      <span className="text-muted">₹{(product.price || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="text-muted small">{product.nameTamil}</div>
                                    <div className="text-muted small">Available: {product.stock || 0}</div>
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
                    onChange={(e) => {
                      const updatedItems = [...bill.billItems];
                      updatedItems[index].quantity = e.target.value;
                      updateBillState(bill.id, { billItems: updatedItems });
                    }}
                    onKeyDown={(e) => onQuantityKeyDown(e, index)}
                    ref={(el) => (quantityRefs.current[index] = el)}
                    min="1"
                  />
                </td>
                <td>₹{(item.price || 0).toFixed(2)}</td>
                <td>₹{((item.price || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}</td>
                <td>
                  {item.productId ? (
                    products.find(p => p._id === item.productId)?.stock || 0
                  ) : '-'}
                </td>
                <td>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => onRemoveItem(index)}
                    disabled={bill.billItems.length === 1 && !bill.billItems[0].productId && !bill.billItems[0].quantity}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan="6" className="text-end"><strong>Grand Total:</strong></td>
              <td colSpan="2"><strong>₹{calculateTotal(bill).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between no-print">
        <button 
          className="btn btn-danger" 
          onClick={onClearBill}
          disabled={bill.billItems.length === 1 && !bill.billItems[0].productId && !bill.billItems[0].quantity}
        >
          Clear Bill
        </button>
        <div>
          <button 
            className="btn btn-primary" 
            onClick={onPrint}
            disabled={bill.isPrinting || calculateTotal(bill) === 0}
          >
            {bill.isPrinting ? 'Printing...' : 'Print Bill'}
          </button>
        </div>
      </div>
    </>
  );
};

export default Billing;