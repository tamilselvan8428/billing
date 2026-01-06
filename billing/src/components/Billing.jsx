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
  const [openBills, setOpenBills] = useState(() => {
    try {
      const savedBills = localStorage.getItem('billing_openBills_v1');
      if (savedBills) {
        const parsed = JSON.parse(savedBills);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved bills from localStorage:', e);
    }
    return [{
      id: Date.now(),
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
        createNewBill();
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
    fetchBillHistory();
  }, []);

  useEffect(() => {
    fetchBillHistory();
  }, [dateFilter]);

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

  const createNewBill = () => {
    const newBill = { 
      id: Date.now(),
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
    const filtered = products.filter(product => 
      product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.nameTamil?.toLowerCase().includes(searchTerm.toLowerCase())
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
      billItems: [{ productId: '', quantity: '', productName: '', productNameTamil: '', price: 0, productSearch: '' }],
      activeRow: 0,
      activeField: 'productSearch',
      productSearch: '',
      showProductDropdown: false
    });
  };

  const BillForm = ({ bill, products, filteredProducts, loadingProducts, error, updateBillState, onProductSearch, onSelectProduct, onRemoveItem, onPrint, onProductKeyDown, onQuantityKeyDown, onClearBill, productSearchRefs, quantityRefs, dropdownRefs, calculateTotal }) => {
    return (
      <div className="card">
        <div className="card-body">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Product</th>
                <th>Tamil Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bill.billItems.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={item.productSearch}
                      onChange={(e) => onProductSearch(e.target.value, index)}
                      onKeyDown={(e) => onProductKeyDown(e, index)}
                      ref={(el) => (productSearchRefs.current[index] = el)}
                      placeholder="Search product"
                    />
                    {bill.showProductDropdown && filteredProducts.length > 0 && (
                      <ul className="list-group">
                        {filteredProducts.map((product, idx) => (
                          <li
                            key={idx}
                            className={`list-group-item product-item-${index}`}
                            onClick={() => onSelectProduct(product, index)}
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
                    )}
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
                <td colSpan="2"><strong>₹{calculateTotal().toFixed(2)}</strong></td>
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
              disabled={bill.isPrinting || calculateTotal() === 0 || !bill.customerName || !bill.mobileNumber}
            >
              {bill.isPrinting ? 'Printing...' : 'Print Bill'}
            </button>
          </div>
        </div>
      </div>
    );
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
                  className="ms-2 btn btn-sm btn-outline-danger"
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
              <button className="btn btn-sm btn-primary" onClick={createNewBill}>
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
                  <div>
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
                  </div>
                )}
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </ErrorBoundary>
    </div>
  );
};

export default Billing;