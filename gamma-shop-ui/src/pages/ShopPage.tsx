import { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardText,
  CCardTitle,
  CCol,
  CFormCheck,
  CFormInput,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react-pro'
import { api, imageUrl, money } from '../api/client'
import type { CartResponse, PageResponse, ProductResponse } from '../api/types'
import { useAuth } from '../state/AuthContext'
import type { Route } from '../routes'
import { RotatingImage } from '../components/RotatingImage'

export function ShopPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { user, isGuest, continueAsGuest } = useAuth()
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)

  const [selected, setSelected] = useState<ProductResponse | null>(null)
  const [quantities, setQuantities] = useState<Record<number, number>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      let result: PageResponse<ProductResponse>
      if (query.trim()) {
        result = await api.get(`/api/products/search?q=${encodeURIComponent(query.trim())}&page=0&size=50`)
      } else if (minPrice || maxPrice || inStockOnly) {
        const params = new URLSearchParams({ page: '0', size: '50' })
        if (minPrice) params.set('minPrice', minPrice)
        if (maxPrice) params.set('maxPrice', maxPrice)
        if (inStockOnly) params.set('inStock', 'true')
        result = await api.get(`/api/products/filter?${params.toString()}`)
      } else {
        result = await api.get('/api/products?page=0&size=50')
      }
      setProducts(result.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addToCart(product: ProductResponse) {
    setError(null)
    setNotice(null)
    try {
      if (!user && !isGuest) {
        await continueAsGuest()
      }
      const quantity = quantities[product.id] ?? 1
      await api.post<CartResponse>('/api/cart/items', { productId: product.id, quantity })
      setNotice(`Added ${quantity} x ${product.name} to your cart.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart')
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h2 className="m-0">Browse products</h2>
        <CButton data-testid="shop-go-to-cart" size="sm" color="primary" onClick={() => onNavigate('cart')}>
          Go to cart &rarr;
        </CButton>
      </div>

      <CCard>
        <CCardBody className="d-flex flex-wrap gap-3 align-items-end">
          <CFormInput
            data-testid="shop-search"
            label="Search"
            placeholder="Product name or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 200 }}
          />
          <CFormInput
            data-testid="shop-min-price"
            label="Min price"
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{ width: 130 }}
          />
          <CFormInput
            data-testid="shop-max-price"
            label="Max price"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ width: 130 }}
          />
          <CFormCheck
            data-testid="shop-instock-filter"
            label="In stock only"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          <CButton data-testid="shop-filter-apply" color="primary" onClick={load}>
            Apply
          </CButton>
        </CCardBody>
      </CCard>

      {error && (
        <CAlert data-testid="shop-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="shop-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      {loading ? (
        <CSpinner />
      ) : products.length === 0 ? (
        <p className="text-body-secondary">No products match.</p>
      ) : (
        <CRow xs={{ cols: 1 }} md={{ cols: 3 }} className="g-3">
          {products.map((product) => (
            <CCol key={product.id}>
              <CCard data-testid={`product-card-${product.id}`} style={{ height: '100%' }}>
                <RotatingImage images={product.images} alt={product.name} height={160} onClick={() => setSelected(product)} />
                <CCardBody className="d-flex flex-column gap-2">
                  <CCardTitle style={{ cursor: 'pointer' }} onClick={() => setSelected(product)}>
                    {product.name}
                  </CCardTitle>
                  <CCardText className="text-body-secondary mb-0" style={{ fontSize: 13 }}>
                    SKU {product.sku}
                  </CCardText>
                  <div className="d-flex align-items-center gap-2">
                    <strong>{money(product.price)}</strong>
                    {product.availableQuantity > 0 ? (
                      <CBadge color="success">{product.availableQuantity} in stock</CBadge>
                    ) : (
                      <CBadge color="secondary">Out of stock</CBadge>
                    )}
                  </div>
                  {product.promotionCodes.length > 0 && (
                    <div className="d-flex gap-1 flex-wrap">
                      {product.promotionCodes.map((code) => (
                        <CBadge key={code} color="warning">
                          {code}
                        </CBadge>
                      ))}
                    </div>
                  )}
                </CCardBody>
                <CCardFooter className="d-flex gap-2 align-items-center">
                  <CFormInput
                    data-testid={`product-qty-${product.id}`}
                    type="number"
                    min={1}
                    max={Math.max(1, product.availableQuantity)}
                    value={quantities[product.id] ?? 1}
                    onChange={(e) =>
                      setQuantities((prev) => ({ ...prev, [product.id]: Math.max(1, Number(e.target.value)) }))
                    }
                    style={{ width: 80 }}
                    disabled={product.availableQuantity === 0}
                  />
                  <CButton
                    data-testid={`add-to-cart-${product.id}`}
                    color="primary"
                    disabled={product.availableQuantity === 0}
                    onClick={() => addToCart(product)}
                  >
                    Add to cart
                  </CButton>
                </CCardFooter>
              </CCard>
            </CCol>
          ))}
        </CRow>
      )}

      <CModal visible={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected && (
          <>
            <CModalHeader>
              <CModalTitle>{selected.name}</CModalTitle>
            </CModalHeader>
            <CModalBody className="d-flex flex-column gap-3">
              {selected.images.length > 0 && (
                <div className="d-flex gap-2 flex-wrap">
                  {selected.images.map((img) => (
                    <img
                      key={img.id}
                      src={imageUrl(img.imageUrl)}
                      alt={selected.name}
                      style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 6 }}
                    />
                  ))}
                </div>
              )}
              <p>{selected.description || 'No description provided.'}</p>
              <div className="d-flex gap-3">
                <span>
                  <strong>Price:</strong> {money(selected.price)}
                </span>
                <span>
                  <strong>Available:</strong> {selected.availableQuantity}
                </span>
                <span>
                  <strong>SKU:</strong> {selected.sku}
                </span>
              </div>
              <CButton
                data-testid={`product-modal-add-to-cart-${selected.id}`}
                color="primary"
                disabled={selected.availableQuantity === 0}
                onClick={() => {
                  addToCart(selected)
                  setSelected(null)
                }}
              >
                Add to cart
              </CButton>
            </CModalBody>
          </>
        )}
      </CModal>
    </div>
  )
}
