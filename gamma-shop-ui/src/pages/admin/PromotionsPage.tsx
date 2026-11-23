import { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api, money } from '../../api/client'
import type { DiscountType, PageResponse, ProductResponse, PromotionRequest, PromotionResponse } from '../../api/types'

const emptyForm: PromotionRequest = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '10',
  startsAt: '',
  endsAt: '',
  active: true,
}

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PromotionRequest>(emptyForm)
  const [productId, setProductId] = useState('')
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [selected, setSelected] = useState<PromotionResponse | null>(null)

  const productName = (id: number) => products.find((p) => p.id === id)?.name

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<PageResponse<PromotionResponse>>('/api/admin/promotions?page=0&size=100')
      setPromotions(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load promotions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    api
      .get<PageResponse<ProductResponse>>('/api/admin/products?page=0&size=200')
      .then((data) => setProducts(data.content))
      .catch(() => setProducts([]))
  }, [])

  function startEdit(promo: PromotionResponse) {
    setEditingId(promo.id)
    setSelected(promo)
    setForm({
      code: promo.code,
      name: promo.name,
      description: promo.description ?? '',
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      startsAt: promo.startsAt ?? '',
      endsAt: promo.endsAt ?? '',
      active: promo.active,
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { ...form, startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined }
      if (editingId) {
        await api.put(`/api/admin/promotions/${editingId}`, payload)
        setNotice('Promotion updated.')
      } else {
        await api.post('/api/admin/promotions', payload)
        setNotice('Promotion created.')
      }
      resetForm()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save promotion')
    }
  }

  async function deletePromotion(id: number) {
    if (!confirm('Delete this promotion?')) return
    setError(null)
    try {
      await api.del(`/api/admin/promotions/${id}`)
      if (selected?.id === id) setSelected(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete promotion')
    }
  }

  async function assignProduct() {
    if (!selected || !productId) return
    setError(null)
    try {
      const updated = await api.post<PromotionResponse>(`/api/admin/promotions/${selected.id}/products/${productId}`)
      setSelected(updated)
      setProductId('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign product')
    }
  }

  async function removeProduct(id: number) {
    if (!selected) return
    setError(null)
    try {
      const updated = await api.del<PromotionResponse>(`/api/admin/promotions/${selected.id}/products/${id}`)
      setSelected(updated)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove product')
    }
  }

  async function notify() {
    if (!selected) return
    setError(null)
    try {
      const result = await api.post<{ message: string; recipients: number }>(`/api/admin/promotions/${selected.id}/notify`)
      setNotice(`${result.message} (${result.recipients} recipients)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not notify customers')
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Promotions</h2>

      {error && (
        <CAlert data-testid="promotions-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="promotions-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>{editingId ? `Edit promotion #${editingId}` : 'Create promotion'}</CCardHeader>
        <CCardBody>
          <CForm onSubmit={submitForm} className="d-flex flex-column gap-3">
            <div className="d-flex gap-3 flex-wrap">
              <CFormInput
                data-testid="promo-form-code"
                label="Code"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                style={{ width: 160 }}
              />
              <CFormInput
                data-testid="promo-form-name"
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ flex: 1, minWidth: 200 }}
              />
            </div>
            <CFormTextarea
              data-testid="promo-form-description"
              label="Description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="d-flex gap-3 flex-wrap align-items-end">
              <CFormSelect
                data-testid="promo-form-discount-type"
                label="Discount type"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType })}
                style={{ width: 180 }}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </CFormSelect>
              <CFormInput
                data-testid="promo-form-discount-value"
                label="Discount value"
                type="number"
                step="0.01"
                required
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                style={{ width: 160 }}
              />
              <CFormInput
                data-testid="promo-form-starts-at"
                label="Starts at"
                type="datetime-local"
                value={form.startsAt ?? ''}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
              <CFormInput
                data-testid="promo-form-ends-at"
                label="Ends at"
                type="datetime-local"
                value={form.endsAt ?? ''}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
              <CFormCheck
                data-testid="promo-form-active"
                label="Active"
                checked={form.active ?? true}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            </div>
            <div className="d-flex gap-2">
              <CButton data-testid="promo-form-submit" type="submit" color="primary">
                {editingId ? 'Save changes' : 'Create promotion'}
              </CButton>
              {editingId && (
                <CButton data-testid="promo-form-cancel" type="button" color="secondary" variant="outline" onClick={resetForm}>
                  Cancel edit
                </CButton>
              )}
            </div>
          </CForm>
        </CCardBody>
      </CCard>

      {loading ? (
        <CSpinner />
      ) : (
        <CTable responsive hover small align="middle">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Code</CTableHeaderCell>
              <CTableHeaderCell>Name</CTableHeaderCell>
              <CTableHeaderCell>Discount</CTableHeaderCell>
              <CTableHeaderCell>Valid now</CTableHeaderCell>
              <CTableHeaderCell>Products</CTableHeaderCell>
              <CTableHeaderCell></CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {promotions.map((p) => (
              <CTableRow data-testid={`promo-row-${p.id}`} key={p.id}>
                <CTableDataCell>{p.code}</CTableDataCell>
                <CTableDataCell>{p.name}</CTableDataCell>
                <CTableDataCell>{p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : money(p.discountValue)}</CTableDataCell>
                <CTableDataCell>
                  <CBadge color={p.currentlyValid ? 'success' : 'secondary'}>{p.currentlyValid ? 'Yes' : 'No'}</CBadge>
                </CTableDataCell>
                <CTableDataCell>{p.productIds.length}</CTableDataCell>
                <CTableDataCell className="d-flex gap-2">
                  <CButton data-testid={`promo-manage-${p.id}`} size="sm" color="secondary" onClick={() => startEdit(p)}>
                    Manage
                  </CButton>
                  <CButton data-testid={`promo-delete-${p.id}`} size="sm" color="danger" variant="outline" onClick={() => deletePromotion(p.id)}>
                    Delete
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      )}

      {selected && (
        <CCard data-testid={`promo-manage-panel-${selected.id}`}>
          <CCardHeader>Products &amp; notification - {selected.code}</CCardHeader>
          <CCardBody className="d-flex flex-column gap-3">
            <div className="d-flex gap-2 flex-wrap">
              {selected.productIds.map((id) => (
                <CBadge key={id} color="secondary" className="d-flex align-items-center gap-1">
                  {productName(id) ?? `Product #${id}`}
                  <span data-testid={`promo-remove-product-${id}`} style={{ cursor: 'pointer' }} onClick={() => removeProduct(id)}>
                    &times;
                  </span>
                </CBadge>
              ))}
              {selected.productIds.length === 0 && <span className="text-body-secondary small">No products assigned yet.</span>}
            </div>
            <div className="d-flex gap-2 align-items-end">
              <CFormSelect
                data-testid="promo-product-id-input"
                label="Add a product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                style={{ width: 320 }}
              >
                <option value="">Select a product...</option>
                {products
                  .filter((p) => !selected.productIds.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
              </CFormSelect>
              <CButton data-testid="promo-assign-product" color="secondary" onClick={assignProduct} disabled={!productId}>
                Assign product
              </CButton>
            </div>
            <div>
              <CButton data-testid="promo-notify" color="warning" onClick={notify}>
                Notify all customers about this promotion
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}
    </div>
  )
}
