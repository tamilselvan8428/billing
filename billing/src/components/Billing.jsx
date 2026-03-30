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
    const year = date.getFullYear().toString(); // Full year (2026)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get next sequential number
    const today = `${day}${month}${year}`;
    const lastBillNumber = localStorage.getItem(`lastBillNumber_${today}`) || '000';
    const nextNumber = String(parseInt(lastBillNumber) + 1).padStart(3, '0');
    
    // Save the new number for today
    localStorage.setItem(`lastBillNumber_${today}`, nextNumber);
    
    // Use DDMMYYYYNNN format (without BILL- prefix)
    return `${day}${month}${year}${nextNumber}`;
  };

  // Function to check bill number format and normalize it
  const normalizeBillNumber = (billNumber) => {
    // If it's the new format (DDMMYYYYNNN), return as is
    if (/^\d{8}\d{3}$/.test(billNumber)) {
      return billNumber;
    }
    // If it's the old format (BILL-YYMMDD-NNNN), convert to new format
    if (/^BILL-\d{2}\d{2}\d{2}-\d{4}$/.test(billNumber)) {
      const match = billNumber.match(/^BILL-(\d{2})(\d{2})(\d{2})-(\d{4})$/);
      if (match) {
        const year = match[1];
        const month = match[2];
        const day = match[3];
        const number = match[4];
        // Convert YY to full year (assuming 2000s)
        const fullYear = year.startsWith('0') ? `20${year}` : year;
        return `${day}${month}${fullYear}${number}`;
      }
    }
    return billNumber;
  };

  const [openBills, setOpenBills] = useState(() => {
    // Try to load saved bills from localStorage first
    try {
      const savedBills = localStorage.getItem('billing_openBills_v1');
      if (savedBills) {
        const parsedBills = JSON.parse(savedBills);
        if (parsedBills && parsedBills.length > 0) {
          return parsedBills;
        }
      }
    } catch (e) {
      console.error('Failed to load saved bills:', e);
    }
    
    // Only create new bill if no saved bills found
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
  
  // Shared state with caching
  const [products, setProducts] = useState([]);
  const [savedContacts, setSavedContacts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [lastDataFetch, setLastDataFetch] = useState(null);

  const productSearchRefs = useRef([]);
  const quantityRefs = useRef([]);
  const dropdownRefs = useRef(null);

  // Request queue to prevent overwhelming the server
  const requestQueue = useRef([]);
  const isProcessingQueue = useRef(false);

  const processQueue = async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;
    
    while (requestQueue.current.length > 0) {
      const request = requestQueue.current.shift();
      try {
        await request();
        // Add delay between queue items
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('Queue request failed:', error);
      }
    }
    
    isProcessingQueue.current = false;
  };

  const addToQueue = (request) => {
    requestQueue.current.push(request);
    processQueue();
  };
  // Helper function to fetch with retry for 429 errors and rate limiting protection
  const fetchWithRetry = async (url, options = {}, retries = 5, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429) {
          if (i === retries - 1) {
            throw new Error('Server busy - please try again in a moment');
          }
          console.log(`⏳ Rate limited, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // More conservative backoff
          continue;
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`❌ Request failed, retrying in ${delay}ms... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  };
  const updateBillState = (billId, updates) => {
    setOpenBills(prevBills => 
      prevBills.map(bill => 
        bill.id === billId ? { ...bill, ...updates } : bill
      )
    );
  };

  // Persist bill tabs across navigation using localStorage

  useEffect(() => {
    try {
      localStorage.setItem('billing_openBills_v1', JSON.stringify(openBills));
      localStorage.setItem('billing_tabIndex_v1', String(tabIndex));
      console.log('💾 Bills saved to localStorage');
    } catch (e) {
      console.error('Failed to save bills to localStorage:', e);
    }
  }, [openBills, tabIndex]);

  // Ensure bills persist when component unmounts (navigation)
  useEffect(() => {
    return () => {
      try {
        // Save current state before unmounting
        localStorage.setItem('billing_openBills_v1', JSON.stringify(openBills));
        localStorage.setItem('billing_tabIndex_v1', String(tabIndex));
      } catch (e) {
        console.error('Failed to save bills on unmount:', e);
      }
    };
  }, [openBills, tabIndex]);

  // Add F2 key listener for printing
// Global keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e) => {
    const activeBill = openBills[tabIndex];
    if (!activeBill) return;

    switch (e.key) {
      case 'F2':
      case 'F3': // PRINT BILL - Direct print without preview
        e.preventDefault();
        if (!activeBill.isPrinting) {
          handleDirectPrint(activeBill.id);
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


  // Async function to load all data with balanced approach (fast but safe)
  const loadAllDataBalanced = async () => {
    // Skip if data was fetched recently (within 5 minutes)
    const now = Date.now();
    if (lastDataFetch && (now - lastDataFetch) < 5 * 60 * 1000) {
      console.log('Using cached data');
      return;
    }

    try {
      setLoadingProducts(true);
      
      // Load data in small batches to prevent server overload
      console.log('🔄 Loading data in balanced batches...');
      
      // Batch 1: Products (most important)
      console.log('📦 Loading products...');
      const productsRes = await fetchWithRetry('https://billing-server-gaha.onrender.com/api/products');
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData || []);
        console.log('✅ Products loaded');
      }
      
      // Small delay to prevent overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Batch 2: Contacts and History together
      console.log('👥 Loading contacts and history...');
      const [contactsRes, historyRes] = await Promise.allSettled([
        fetchWithRetry('https://billing-server-gaha.onrender.com/api/contacts'),
        fetchWithRetry(`https://billing-server-gaha.onrender.com/api/bills?date=${dateFilter}`)
      ]);
      
      if (contactsRes.status === 'fulfilled' && contactsRes.value.ok) {
        const contactsData = await contactsRes.value.json();
        setSavedContacts(contactsData.contacts || []);
        console.log('✅ Contacts loaded');
      }
      
      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const historyData = await historyRes.value.json();
        setBillHistory(historyData.bills || []);
        console.log('✅ Bill history loaded');
      }
      
      // Small delay before final batch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Batch 3: Summary (least critical)
      console.log('📊 Loading summary...');
      const summaryRes = await fetchWithRetry(`https://billing-server-gaha.onrender.com/api/bills/summary?date=${dateFilter}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setDailySummary({
          totalAmount: summaryData.summary?.totalAmount || 0,
          billCount: summaryData.summary?.billCount || 0,
          averageBill: summaryData.summary?.averageBill || 0
        });
        console.log('✅ Summary loaded');
      }
      
      // Update cache timestamp
      setLastDataFetch(now);
      console.log('✅ All data loaded successfully (balanced approach)');
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data. Please try again later.');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Delete bill function
  const deleteBill = async (billId, billNumber) => {
    if (!window.confirm(`Are you sure you want to delete bill ${billNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting bill:', billId);
      const response = await fetchWithRetry(`https://billing-server-gaha.onrender.com/api/bills/${billId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete bill');
      }

      // Refresh bill history
      await fetchBillHistory();
      
      console.log('✅ Bill deleted successfully');
      alert('Bill deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting bill:', error);
      alert('Failed to delete bill. Please try again.');
    }
  };
  const refreshAllData = async () => {
    console.log('🔄 Manual refresh triggered...');
    setLastDataFetch(0); // Reset cache to force refresh
    await loadAllDataBalanced();
  };
  
  // Call balanced loading function when component mounts
  useEffect(() => {
    loadAllDataBalanced();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeBill = openBills[tabIndex];
      if (activeBill && productSearchRefs.current[0]) {
        productSearchRefs.current[0].focus();
      }
    }, 150); // Slightly longer delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [tabIndex]); // Only depend on tabIndex, not openBills

  useEffect(() => {
    fetchBillHistory();
  }, [dateFilter]);

  // Upload all bills from backup to server
  const uploadAllBills = async () => {
    try {
      const backupBills = JSON.parse(localStorage.getItem('billing_savedBills_backup') || '[]');
      
      if (backupBills.length === 0) {
        alert('No bills in backup to upload.');
        return;
      }

      console.log(`Starting upload of ${backupBills.length} bills...`);
      let successCount = 0;
      
      for (const bill of backupBills) {
        try {
          const response = await fetchWithRetry('https://billing-server-gaha.onrender.com/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bill)
          });
          
          if (response.ok) {
            successCount++;
            console.log(`✅ Uploaded bill: ${bill.billNumber}`);
          } else {
            console.error(`❌ Failed to upload bill: ${bill.billNumber}`);
          }
        } catch (error) {
          console.error(`❌ Error uploading bill ${bill.billNumber}:`, error);
        }
      }
      
      alert(`Upload complete! ${successCount}/${backupBills.length} bills uploaded successfully.`);
    } catch (error) {
      console.error('Error during upload:', error);
      alert('Failed to upload bills. Please try again.');
    }
  };

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
      case 'Tab':
        e.preventDefault();
        if (currentItem.productId) {
          // If product is selected, move to quantity field
          if (quantityRefs.current[index]) {
            quantityRefs.current[index].focus();
          }
        } else {
          // If no product selected, try to select first matching product
          if (bill.showProductDropdown && filteredProducts.length > 0) {
            const firstProduct = filteredProducts[0];
            selectProduct(billId, firstProduct, index);
          }
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
    
    // Auto-focus on the new bill's first product search field
    setTimeout(() => {
      if (productSearchRefs.current[0]) {
        productSearchRefs.current[0].focus();
      }
    }, 100);
  };

  const closeBill = (index) => {
    const newOpenBills = openBills.filter((_, i) => i !== index);
    setOpenBills(newOpenBills);
    if (tabIndex >= newOpenBills.length) {
      setTabIndex(Math.max(0, newOpenBills.length - 1));
    }
  };

  const resetForm = (billId) => {
    // Clear the bill without confirmation
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
      productSearch: '',
      showProductDropdown: false
    });
    
    // Auto-focus on the first product search field after clearing
    setTimeout(() => {
      if (productSearchRefs.current[0]) {
        productSearchRefs.current[0].focus();
      }
    }, 100);
  };

  const handleDirectPrint = async (billId) => {
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
      
      const response = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create bill');
      }

      // Bill successfully saved to database
      console.log('✅ Bill saved to database:', responseData.billNumber || bill.billNumber);

      const now = new Date();
      
      // Create iframe for direct printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '80mm';
      iframe.style.height = '0px';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Pre-calculate all values to avoid repeated calculations
      const total = calculateTotal(bill);
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
              .header { text-align: center; margin-bottom: 2mm; }
              .shop-name { font-weight: bold; font-size: 16px; margin: 0; }
              .bill-title { font-weight: bold; font-size: 15px; margin: 1px 0; }
              .contact { font-size: 12px; margin: 1px 0 2px 0; }
              .customer-info { margin-bottom: 2mm; display: flex; justify-content: space-between; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
              th, td { padding: 2mm 0; text-align: left; }
              th { border-bottom: 1px dashed #000; }
              .item-row td { border-bottom: 1px dashed #ddd; padding: 2mm 0; }
              .total-row { font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; font-size: 16px; }
              .footer { text-align: center; margin-top: 2mm; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <p class="shop-name">ராஜா ஸ்னாக்ஸ்</p>
              <p class="bill-title">கேஷ் பில்</p>
              <p class="contact">தொலைபேசி: 9842263860</p>
            </div>
            
            <div class="customer-info">
              <div>பில் எண்: ${bill.billNumber}</div>
              <div>
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
                ${validItems.map((item, idx) => `
                  <tr class="item-row">
                    <td>${idx + 1}</td>
                    <td>${item.nameTamil || '-'}</td>
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
                <td>₹${total.toFixed(2)}</td>
              </tr>
            </table>
            
            <div class="footer">
              <p>என்றும் உங்களுடன் ராஜா ஸ்னாக்ஸ் !!! மீண்டும் வருக...</p>
            </div>
          </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(billContent);
      iframeDoc.close();

      // Wait for content to load, then print
      setTimeout(() => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
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
      
      // Auto-focus on the first product search field after printing
      setTimeout(() => {
        if (productSearchRefs.current[0]) {
          productSearchRefs.current[0].focus();
        }
      }, 600);
    } catch (err) {
      console.error('Error creating bill:', err);
      alert(`Error: ${err.message}`);
      updateBillState(billId, { isPrinting: false });
      
      // Auto-focus on the first product search field even after error
      setTimeout(() => {
        if (productSearchRefs.current[0]) {
          productSearchRefs.current[0].focus();
        }
      }, 100);
    }
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
      
      const response = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create bill');
      }

      // Bill successfully saved to database
      console.log('✅ Bill saved to database:', responseData.billNumber || bill.billNumber);
      } catch (saveError) {
        console.error('Error saving bill to database:', saveError);
        alert(`Failed to save bill: ${saveError.message}`);
        updateBillState(billId, { isPrinting: false });
        return;
      }

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
                font-size: 16px;
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
@page {
  size: 80mm auto;
  margin: 0;
}

html, body {
  width: 80mm;
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  font-size: 14px;
}

.header {
  text-align: center;
  margin-bottom: 2mm;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 2mm 0;
}

.item-row,
tr,
td,
th {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

.total-row {
  font-weight: bold;
  border-top: 1px dashed #000;
  border-bottom: 1px dashed #000;
  font-size: 16px;
}

.footer {
  text-align: center;
  margin-top: 2mm;
  font-size: 12px;
}

@media print {
  body {
    overflow: visible !important;
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
          }, 100);
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

const editBill = async (bill) => {
  try {
    // Fetch full bill details from database
    console.log('🔍 Loading bill for editing:', bill._id);
    const response = await fetchWithRetry(`https://billing-server-gaha.onrender.com/api/bills/${bill._id}`);
    
    if (!response.ok) {
      throw new Error('Failed to load bill details');
    }
    
    const fullBill = await response.json();
    
    // Check if this bill is already open in a tab
    const existingTabIndex = openBills.findIndex(b => b.billNumber === bill.billNumber);
    
    if (existingTabIndex >= 0) {
      // Switch to the existing tab
      setTabIndex(existingTabIndex);
      return;
    }

    const newBill = {
      id: Date.now(),
      _id: fullBill._id, // Include the MongoDB _id for updates
      billNumber: fullBill.billNumber,
      billItems: fullBill.items.map(item => ({
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
      customerName: fullBill.customerName || 'Walk-in Customer',
      mobileNumber: fullBill.mobileNumber || '0000000000'
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
    console.log('✅ Bill loaded for editing');
    
  } catch (error) {
    console.error('Error loading bill for edit:', error);
    alert('Failed to load bill for editing. Please try again.');
  }
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
            <Tab>Bill History</Tab>
          </TabList>

          <div className="mb-3">
            <button 
              className="btn btn-primary"
              onClick={addNewBill}
              style={{fontSize: '14px', lineHeight: '1.5'}}
            >
              + New Bill
            </button>
          </div>

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

          {openBills.length === 0 && (
            <TabPanel>
              <div className="text-center p-4">
                <p>Click the "+ New Bill" button to create a new bill.</p>
              </div>
            </TabPanel>
          )}

          <TabPanel>
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h4>Bill History</h4>
                <div className="d-flex gap-2 align-items-center">
                  <input 
                    type="date" 
                    className="form-control" 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={refreshAllData}
                    title="Refresh data"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
              <div className="card-body">
                {historyLoading ? (
                  <div className="text-center">Loading...</div>
                ) : (
                  <>
                    <div className="row mb-4">
                      <div className="col-md-3">
                        <div className="card text-white bg-primary">
                          <div className="card-body text-center">
                            <h5 className="card-title">📊 Total Bills</h5>
                            <p className="card-text display-6">{dailySummary.billCount}</p>
                            <small>Bills for {dateFilter}</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card text-white bg-success">
                          <div className="card-body text-center">
                            <h5 className="card-title">💰 Total Sales</h5>
                            <p className="card-text display-6">₹{dailySummary.totalAmount.toFixed(2)}</p>
                            <small>Daily revenue</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card text-white bg-info">
                          <div className="card-body text-center">
                            <h5 className="card-title">📈 Average Bill</h5>
                            <p className="card-text display-6">₹{dailySummary.averageBill.toFixed(2)}</p>
                            <small>Per transaction</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card text-white bg-warning">
                          <div className="card-body text-center">
                            <h5 className="card-title">🕐 Peak Time</h5>
                            <p className="card-text display-6">--</p>
                            <small>Coming soon</small>
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
                              <td>{normalizeBillNumber(bill.billNumber)}</td>
                              <td>{new Date(bill.date).toLocaleString()}</td>
                              <td>{bill.items.length}</td>
                              <td>₹{(bill.grandTotal || 0).toFixed(2)}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-info me-1"
                                  onClick={() => editBill(bill)}
                                  title="Edit this bill"
                                >
                                  ✏️ Edit
                                </button>
                                <button 
                                  className="btn btn-sm btn-primary me-1"
                                  onClick={() => reprintBill(bill)}
                                  title="Reprint this bill"
                                >
                                  🖨️ Reprint
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger"
                                  onClick={() => deleteBill(bill._id, normalizeBillNumber(bill.billNumber))}
                                  title="Delete this bill"
                                >
                                  🗑️ Delete
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
}

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
      {loadingProducts && (
        <div className="alert alert-info text-center">
          <strong>Loading billing system...</strong> Please wait while we fetch your data.
        </div>
      )}
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
              <td colSpan="6" className="text-end"><strong style={{fontSize: '18px', fontWeight: 'bold'}}>Grand Total:</strong></td>
              <td colSpan="2"><strong style={{fontSize: '18px', fontWeight: 'bold'}}>₹{calculateTotal(bill).toFixed(2)}</strong></td>
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
}

export default Billing;