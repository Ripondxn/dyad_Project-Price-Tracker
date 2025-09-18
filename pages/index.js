import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 500 });
  const [filters, setFilters] = useState({
    western: true,
    middleEast: true,
    original: true,
    replica: true,
  });
  const [sort, setSort] = useState('price');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [comparisonPair, setComparisonPair] = useState(null);
  const [theme, setTheme] = useState('light');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const loadData = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setLoadingError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout

    try {
      const res = await fetch('/api/fetch-products', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error('Failed to fetch products from the API.');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        throw new Error('API response is not in the expected format.');
      }
    } catch (error) {
      console.error('An error occurred while fetching products:', error);
      if (error.name === 'AbortError') {
        setLoadingError('Data loading timed out. Please try refreshing the page.');
      } else {
        setLoadingError('An error occurred while fetching data. Please try again.');
      }
      setProducts([]);
    } finally {
      if (isInitialLoad) {
        setIsInitialLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadData(true);

    const refreshInterval = setInterval(() => {
      loadData(false);
    }, 300000);

    return () => clearInterval(refreshInterval);
  }, []);

  const brands = useMemo(() => {
    if (!products.length) return [];
    const brandMap = new Map();
    products.forEach(p => {
      if (p.brand) {
        // Normalize by converting to lower case, removing trailing 's, and trimming whitespace
        const normalizedBrand = p.brand.toLowerCase().replace(/'s$/, '').trim();
        if (!brandMap.has(normalizedBrand)) {
          // Store the original casing of the first occurrence
          brandMap.set(normalizedBrand, p.brand.replace(/'s$/, '').trim());
        }
      }
    });
    const uniqueBrands = Array.from(brandMap.values());
    return uniqueBrands.sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let tempProducts = [...products];

    if (searchTerm) {
      tempProducts = tempProducts.filter(p =>
        (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.node || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.details || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedBrand) {
      const normalizedSelectedBrand = selectedBrand.toLowerCase().replace(/'s$/, '').trim();
      tempProducts = tempProducts.filter(p => {
        if (!p.brand) return false;
        const normalizedProductBrand = p.brand.toLowerCase().replace(/'s$/, '').trim();
        return normalizedProductBrand === normalizedSelectedBrand;
      });
    }

    tempProducts = tempProducts.filter(p => typeof p.price === 'number' && p.price >= priceRange.min && p.price <= priceRange.max);

    const regionFiltered = tempProducts.filter(p => {
      if (filters.western && p.region === 'western') return true;
      if (filters.middleEast && p.region === 'middle-east') return true;
      return false;
    });

    const typeFiltered = regionFiltered.filter(p => {
        if (filters.original && !p.isReplica) return true;
        if (filters.replica && p.isReplica) return true;
        return false;
    });
    
    tempProducts = typeFiltered;

    if (sort === 'price') {
      tempProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'name') {
      tempProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      tempProducts.sort((a, b) => (b.id.split('-')[1] || 0) - (a.id.split('-')[1] || 0));
    }

    return tempProducts;
  }, [products, searchTerm, priceRange, filters, sort, selectedBrand]);

  const kpiData = useMemo(() => {
    const totalProducts = filteredProducts.length;
    const averagePrice = totalProducts > 0 ? filteredProducts.reduce((acc, p) => acc + (p.price || 0), 0) / totalProducts : 0;
    const westernCount = filteredProducts.filter(p => p.region === 'western').length;
    const middleEasternCount = filteredProducts.filter(p => p.region === 'middle-east').length;
    
    return {
      totalProducts,
      averagePrice,
      westernCount,
      middleEasternCount,
    };
  }, [filteredProducts]);

  const handleRefresh = () => {
    if (!isRefreshing) {
      loadData(false);
    }
  };

  const handleKpiClick = (region) => {
    if (region === 'western') {
      setFilters({ ...filters, western: true, middleEast: false });
    } else if (region === 'middle-east') {
      setFilters({ ...filters, western: false, middleEast: true });
    } else if (region === 'all') {
      setFilters({ ...filters, western: true, middleEast: true });
    }
  };

  const openComparisonModal = (clickedProduct) => {
    const clickedNameWords = clickedProduct.name.toLowerCase().split(' ').filter(w => w.length > 3);

    const findMatch = (productsList) => {
        return productsList.find(p => {
            const pName = p.name.toLowerCase();
            if (p.id === clickedProduct.id) return false;
            return clickedNameWords.some(word => pName.includes(word));
        });
    };

    const originalsME = products.filter(p => p.region === 'middle-east' && !p.isReplica);
    const originalsW = products.filter(p => p.region === 'western' && !p.isReplica);
    const replicas = products.filter(p => p.isReplica);

    let pair = {
        middleEastern: null,
        western: null,
        replica: null,
    };

    if (clickedProduct.isReplica) {
        pair.replica = clickedProduct;
        pair.middleEastern = findMatch(originalsME);
        pair.western = findMatch(originalsW);
    } else if (clickedProduct.region === 'middle-east') {
        pair.middleEastern = clickedProduct;
        pair.western = findMatch(originalsW);
        pair.replica = findMatch(replicas);
    } else { // Western
        pair.western = clickedProduct;
        pair.middleEastern = findMatch(originalsME);
        pair.replica = findMatch(replicas);
    }

    setComparisonPair(pair);
  };

  const closeComparisonModal = () => {
    setComparisonPair(null);
  };

  const formatPrice = (product) => {
    if (!product || typeof product.price !== 'number') return 'N/A';
    return `€${product.price.toFixed(2)}`;
  };

  return (
    <div>
      <Head>
        <title>Perfume Price Comparison Dashboard</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>
      <div className="container">
        <header>
          <div className="logo">
            <Image src="/logo.avif" alt="Perfume Price Tracker Logo" width={150} height={50} style={{ objectFit: 'contain' }} />
            <h1>Perfume Price Tracker</h1>
          </div>
          <div className="search-container">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input type="text" id="searchInput" placeholder="Search by brand, name, or notes..." onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="user-section">
            <button className="btn btn-outline" id="refreshBtn" onClick={handleRefresh} disabled={isRefreshing}>
              <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i> {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button className="btn btn-outline" onClick={toggleTheme} title="Toggle Theme">
              <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
            </button>
            <button className="btn btn-primary">
              <i className="fas fa-user"></i> Sign In
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="filters-panel">
            <h2><i className="fas fa-filter"></i> Filters</h2>
            
            <div className="filter-group">
              <h3>Region</h3>
              <div className="filter-options">
                <div className="filter-option">
                  <input type="checkbox" id="westernFilter" checked={filters.western} onChange={() => setFilters({...filters, western: !filters.western})} />
                  <label htmlFor="westernFilter">Western Perfumes</label>
                </div>
                <div className="filter-option">
                  <input type="checkbox" id="middleEastFilter" checked={filters.middleEast} onChange={() => setFilters({...filters, middleEast: !filters.middleEast})} />
                  <label htmlFor="middleEastFilter">Middle Eastern Perfumes</label>
                </div>
              </div>
            </div>

            <div className="filter-group">
              <h3>Product Type</h3>
              <div className="filter-options">
                <div className="filter-option">
                  <input type="checkbox" id="originalFilter" checked={filters.original} onChange={() => setFilters({...filters, original: !filters.original})} />
                  <label htmlFor="originalFilter">Original</label>
                </div>
                <div className="filter-option">
                  <input type="checkbox" id="replicaFilter" checked={filters.replica} onChange={() => setFilters({...filters, replica: !filters.replica})} />
                  <label htmlFor="replicaFilter">Replica</label>
                </div>
              </div>
            </div>

            <div className="filter-group">
              <h3>Brand</h3>
              <div className="brand-filter-options">
                <div className="filter-option">
                  <input type="radio" id="brand-all" name="brand" checked={selectedBrand === ''} onChange={() => setSelectedBrand('')} />
                  <label htmlFor="brand-all">All Brands</label>
                </div>
                {brands.map(brand => (
                  <div className="filter-option" key={brand}>
                    <input type="radio" id={`brand-${brand}`} name="brand" value={brand} checked={selectedBrand === brand} onChange={(e) => setSelectedBrand(e.target.value)} />
                    <label htmlFor={`brand-${brand}`}>{brand}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="filter-group">
              <h3>Price Range</h3>
              <div className="filter-options">
                <div className="filter-option">
                  <label htmlFor="minPrice">Min: €{priceRange.min}</label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    value={priceRange.min}
                    className="range-slider"
                    id="minPrice"
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value <= priceRange.max) {
                        setPriceRange({ ...priceRange, min: value });
                      }
                    }}
                  />
                </div>
                <div className="filter-option">
                  <label htmlFor="maxPrice">Max: €{priceRange.max}</label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    value={priceRange.max}
                    className="range-slider"
                    id="maxPrice"
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= priceRange.min) {
                        setPriceRange({ ...priceRange, max: value });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="filter-group">
              <h3>Sort By</h3>
              <div className="filter-options">
                <div className="filter-option">
                  <input type="radio" id="sortPrice" name="sort" checked={sort === 'price'} onChange={() => setSort('price')} />
                  <label htmlFor="sortPrice">Price (Low to High)</label>
                </div>
                <div className="filter-option">
                  <input type="radio" id="sortName" name="sort" checked={sort === 'name'} onChange={() => setSort('name')} />
                  <label htmlFor="sortName">Name (A-Z)</label>
                </div>
                <div className="filter-option">
                  <input type="radio" id="sortNewest" name="sort" checked={sort === 'newest'} onChange={() => setSort('newest')} />
                  <label htmlFor="sortNewest">Newest First</label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="main-content">
            <div className="kpi-cards">
              <div className="kpi-card clickable" onClick={() => handleKpiClick('all')}>
                <div className="kpi-header">
                  <div className="kpi-title">Total Products</div>
                  <div className="kpi-icon icon-primary"><i className="fas fa-box"></i></div>
                </div>
                <div className="kpi-value">{kpiData.totalProducts}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header">
                  <div className="kpi-title">Average Price</div>
                  <div className="kpi-icon icon-success"><i className="fas fa-euro-sign"></i></div>
                </div>
                <div className="kpi-value">€{kpiData.averagePrice.toFixed(2)}</div>
              </div>
              <div className="kpi-card clickable" onClick={() => handleKpiClick('western')}>
                <div className="kpi-header">
                  <div className="kpi-title">Western Perfumes</div>
                  <div className="kpi-icon" style={{ background: '#e3f2fd', color: 'var(--western)' }}><i className="fas fa-globe-americas"></i></div>
                </div>
                <div className="kpi-value">{kpiData.westernCount}</div>
              </div>
              <div className="kpi-card clickable" onClick={() => handleKpiClick('middle-east')}>
                <div className="kpi-header">
                  <div className="kpi-title">Middle Eastern</div>
                  <div className="kpi-icon icon-warning"><i className="fas fa-globe-asia"></i></div>
                </div>
                <div className="kpi-value">{kpiData.middleEasternCount}</div>
              </div>
            </div>
            
            <div className="products-section">
              <div className="section-header">
                <h2>Popular Perfumes</h2>
                <a href="#" className="view-all">View All <i className="fas fa-chevron-right"></i></a>
              </div>
              
              <div className="products-grid" id="productsGrid">
                {isInitialLoading ? (
                  <div className="loading" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '15px', color: 'var(--text-light)' }}>
                      Fetching latest prices from multiple sources... This may take a moment.
                    </p>
                  </div>
                ) : loadingError ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--error)' }}>
                    <p>{loadingError}</p>
                  </div>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <div className="product-card" key={product.id}>
                      <div className="product-image">
                          <img src={product.image || 'https://via.placeholder.com/300'} alt={product.name || 'Perfume'} />
                          <div className={`product-type-tag ${product.isReplica ? 'tag-replica' : 'tag-original'}`}>
                            {product.isReplica ? 'Replica' : 'Original'}
                          </div>
                          <div className="product-image-tag tag-location">
                              {product.region === 'middle-east' ? 'Dubai' : 'Western'}
                          </div>
                          <button className="product-favorite-btn"><i className="far fa-heart"></i></button>
                      </div>
                      <div className="product-info">
                          <div className="product-row">
                              <div className="product-brand">{product.brand || 'Unknown Brand'}</div>
                              <div className="product-rating">
                                  <i className="fas fa-star"></i> 4.7 (198)
                              </div>
                          </div>
                          <h3 className="product-name">{product.name || 'Unnamed Product'}</h3>
                          <div className="product-row">
                              <div className="product-node">{product.node || 'Perfume'}</div>
                              <div className="product-size">100ml</div>
                          </div>
                          <div className="product-row">
                              <div className="product-price">
                                  <span>{formatPrice(product)}</span>
                              </div>
                              <div className="product-trend">
                                  <i className="fas fa-chart-line"></i>
                              </div>
                          </div>
                          <div className="product-actions">
                              {product.source === 'dubaioud.ie' && product.variantId ? (
                                <a
                                  href={`https://dubaioud.ie/cart/add?id=${product.variantId}&quantity=1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-add-to-cart"
                                >
                                  <i className="fas fa-shopping-cart"></i> Add to Cart
                                </a>
                              ) : (
                                <button className="btn-add-to-cart" disabled>
                                  <i className="fas fa-shopping-cart"></i> Add to Cart
                                </button>
                              )}
                              <button className="btn-compare" onClick={() => openComparisonModal(product)}>Compare</button>
                          </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px 0' }}>
                    No products found matching your criteria.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {comparisonPair && (
        <div className="comparison-modal" style={{ display: 'flex' }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Product Comparison</h2>
                    <button className="close-modal" onClick={closeComparisonModal}><i className="fas fa-times"></i></button>
                </div>
                <div className="modal-body">
                    {comparisonPair.middleEastern || comparisonPair.western || comparisonPair.replica ? (
                        <table className="comparison-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Middle Eastern</th>
                                    <th>Western</th>
                                    <th>Replica</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <th>Image</th>
                                    <td>{comparisonPair.middleEastern ? <img src={comparisonPair.middleEastern.image} alt={comparisonPair.middleEastern.name} width="100" /> : 'N/A'}</td>
                                    <td>{comparisonPair.western ? <img src={comparisonPair.western.image} alt={comparisonPair.western.name} width="100" /> : 'N/A'}</td>
                                    <td>{comparisonPair.replica ? <img src={comparisonPair.replica.image} alt={comparisonPair.replica.name} width="100" /> : 'N/A'}</td>
                                </tr>
                                <tr>
                                    <th>Name</th>
                                    <td>{comparisonPair.middleEastern?.name || 'N/A'}</td>
                                    <td>{comparisonPair.western?.name || 'N/A'}</td>
                                    <td>{comparisonPair.replica?.name || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <th>Brand</th>
                                    <td>{comparisonPair.middleEastern?.brand || 'N/A'}</td>
                                    <td>{comparisonPair.western?.brand || 'N/A'}</td>
                                    <td>{comparisonPair.replica?.brand || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <th>Price</th>
                                    <td>{formatPrice(comparisonPair.middleEastern)}</td>
                                    <td>{formatPrice(comparisonPair.western)}</td>
                                    <td>
                                        {formatPrice(comparisonPair.replica)}
                                        {(() => {
                                            const replicaPrice = comparisonPair.replica?.price;
                                            if (typeof replicaPrice !== 'number') return null;

                                            const mePrice = comparisonPair.middleEastern?.price;
                                            const wPrice = comparisonPair.western?.price;
                                            
                                            let cheapestOriginalPrice = Infinity;
                                            if (typeof mePrice === 'number') cheapestOriginalPrice = Math.min(cheapestOriginalPrice, mePrice);
                                            if (typeof wPrice === 'number') cheapestOriginalPrice = Math.min(cheapestOriginalPrice, wPrice);

                                            if (cheapestOriginalPrice === Infinity) return null;

                                            const isHigher = replicaPrice > cheapestOriginalPrice;
                                            const diff = Math.abs(replicaPrice - cheapestOriginalPrice);

                                            return (
                                                <span className={`price-difference ${isHigher ? 'price-higher' : 'price-lower'}`} style={{fontSize: '12px', marginLeft: '5px'}}>
                                                    <i className={`fas fa-arrow-${isHigher ? 'up' : 'down'}`}></i>
                                                    €{diff.toFixed(2)} vs original
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                                <tr>
                                    <th>Details</th>
                                    <td style={{fontSize: '12px'}}>{comparisonPair.middleEastern?.details.substring(0, 150) || 'N/A'}...</td>
                                    <td style={{fontSize: '12px'}}>{comparisonPair.western?.details.substring(0, 150) || 'N/A'}...</td>
                                    <td style={{fontSize: '12px'}}>{comparisonPair.replica?.details.substring(0, 150) || 'N/A'}...</td>
                                </tr>
                                <tr>
                                    <th>Source</th>
                                    <td>
                                        {comparisonPair.middleEastern?.sourceUrl ? (
                                            <a href={comparisonPair.middleEastern.sourceUrl} target="_blank" rel="noopener noreferrer">
                                                View Source
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td>
                                        {comparisonPair.western?.sourceUrl ? (
                                            <a href={comparisonPair.western.sourceUrl} target="_blank" rel="noopener noreferrer">
                                                View Source
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td>
                                        {comparisonPair.replica?.sourceUrl ? (
                                            <a href={comparisonPair.replica.sourceUrl} target="_blank" rel="noopener noreferrer">
                                                View Source
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <p>No comparison available for this product.</p>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}