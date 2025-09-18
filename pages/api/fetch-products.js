// Helper to strip HTML tags from product descriptions
const stripHtml = (html) => (html ? html.replace(/<[^>]*>?/gm, '') : '');

// Fallback exchange rates in case the live API fails.
const FALLBACK_CAD_TO_EUR_RATE = 0.68;
const FALLBACK_AED_TO_EUR_RATE = 0.25;

// Maps product data for Middle Eastern perfumes (Originals)
const mapMiddleEasternProduct = (product) => {
  const variant = product.variants.length > 0 ? product.variants[0] : null;
  const price = variant ? parseFloat(variant.price) : 0;
  const image = product.images.length > 0 ? product.images[0].src : null;

  return {
    id: `me-${product.id}`,
    brand: product.vendor,
    name: product.title,
    details: stripHtml(product.body_html),
    node: product.product_type || 'Perfume',
    price: price, // Price is already in EUR
    currency: 'EUR',
    image: image,
    isReplica: false,
    region: 'middle-east',
    source: 'dubaioud.ie',
    variantId: variant ? variant.id : null,
    sourceUrl: `https://dubaioud.ie/products/${product.handle}`,
  };
};

// Maps product data for Western perfumes (Originals)
const mapWesternProduct = (product, exchangeRate) => {
    const variant = product.variants.length > 0 ? product.variants[0] : null;
    const priceCAD = variant ? parseFloat(variant.price) : 0;
    const image = product.images.length > 0 ? product.images[0].src : null;
  
    return {
      id: `w-${product.id}`,
      brand: product.vendor,
      name: product.title,
      details: stripHtml(product.body_html),
      node: product.product_type || 'Perfume',
      price: priceCAD * exchangeRate, // Convert price from CAD to EUR
      currency: 'EUR',
      image: image,
      isReplica: false,
      region: 'western',
      source: 'westernperfumes.ca',
      variantId: null,
      sourceUrl: `https://westernperfumes.ca/products/${product.handle}`,
    };
};

// Maps product data for Replica perfumes
const mapReplicaProduct = (product, exchangeRate) => {
    const variant = product.variants.length > 0 ? product.variants[0] : null;
    const priceAED = variant ? parseFloat(variant.price) : 0;
    const image = product.images.length > 0 ? product.images[0].src : null;
  
    return {
      id: `rep-${product.id}`,
      brand: product.vendor,
      name: product.title,
      details: stripHtml(product.body_html),
      node: product.product_type || 'Perfume',
      price: priceAED * exchangeRate, // Convert price from AED to EUR
      currency: 'EUR',
      image: image,
      isReplica: true,
      region: 'middle-east',
      source: 'parfum.ae',
      variantId: null,
      sourceUrl: `https://parfum.ae/products/${product.handle}`,
    };
};

// Helper to fetch with a timeout
const fetchWithTimeout = (url, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    return fetch(url, { signal: controller.signal })
      .finally(() => {
        clearTimeout(id);
      });
};

export default async function handler(req, res) {
  // Fetch live exchange rates
  let cadToEurRate = FALLBACK_CAD_TO_EUR_RATE;
  let aedToEurRate = FALLBACK_AED_TO_EUR_RATE;

  try {
    const cadRateResponse = await fetch('https://api.frankfurter.app/latest?from=CAD&to=EUR');
    if (cadRateResponse.ok) {
      const rateData = await cadRateResponse.json();
      if (rateData && rateData.rates && rateData.rates.EUR) {
        cadToEurRate = rateData.rates.EUR;
      } else {
        console.error('Live CAD exchange rate format is invalid, using fallback.');
      }
    } else {
      console.error('Failed to fetch live CAD exchange rate, using fallback.');
    }
  } catch (error) {
    console.error('Error fetching CAD exchange rate, using fallback:', error);
  }

  try {
    const aedRateResponse = await fetch('https://api.frankfurter.app/latest?from=AED&to=EUR');
    if (aedRateResponse.ok) {
      const rateData = await aedRateResponse.json();
      if (rateData && rateData.rates && rateData.rates.EUR) {
        aedToEurRate = rateData.rates.EUR;
      } else {
        console.error('Live AED exchange rate format is invalid, using fallback.');
      }
    } else {
      console.error('Failed to fetch live AED exchange rate, using fallback.');
    }
  } catch (error) {
    console.error('Error fetching AED exchange rate, using fallback:', error);
  }

  const dubaiOudApiUrl = 'https://dubaioud.ie/products.json?limit=250';
  const westernPerfumesApiUrl = 'https://westernperfumes.ca/products.json?limit=250';
  const parfumAeApiUrl = 'https://parfum.ae/products.json?limit=250';

  try {
    const [dubaiOudResponse, westernPerfumesResponse, parfumAeResponse] = await Promise.allSettled([
      fetchWithTimeout(dubaiOudApiUrl),
      fetchWithTimeout(westernPerfumesApiUrl),
      fetchWithTimeout(parfumAeApiUrl),
    ]);

    let products = [];

    if (dubaiOudResponse.status === 'fulfilled' && dubaiOudResponse.value.ok) {
      const data = await dubaiOudResponse.value.json();
      if (data && Array.isArray(data.products)) {
        products.push(...data.products.map(mapMiddleEasternProduct));
      }
    } else {
      console.error('Failed to fetch data from Dubai Oud API:', dubaiOudResponse.reason || dubaiOudResponse.value?.statusText);
    }

    if (westernPerfumesResponse.status === 'fulfilled' && westernPerfumesResponse.value.ok) {
        const data = await westernPerfumesResponse.value.json();
        if (data && Array.isArray(data.products)) {
          products.push(...data.products.map(p => mapWesternProduct(p, cadToEurRate)));
        }
    } else {
        console.error('Failed to fetch data from Western Perfumes API:', westernPerfumesResponse.reason || westernPerfumesResponse.value?.statusText);
    }

    if (parfumAeResponse.status === 'fulfilled' && parfumAeResponse.value.ok) {
        const data = await parfumAeResponse.value.json();
        if (data && Array.isArray(data.products)) {
          products.push(...data.products.map(p => mapReplicaProduct(p, aedToEurRate)));
        }
    } else {
        console.error('Failed to fetch data from Parfum.ae API:', parfumAeResponse.reason || parfumAeResponse.value?.statusText);
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
}