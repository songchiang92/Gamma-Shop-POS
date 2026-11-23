import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
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
  CFormTextarea,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api, imageUrl, money } from '../../api/client'
import type { PageResponse, ProductRequest, ProductResponse } from '../../api/types'

const emptyForm: ProductRequest = { sku: '', name: '', description: '', price: '0.00', slotQuantity: 0, active: true }
const MAX_IMAGES = 5

const removeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: -8,
  right: -8,
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: 'none',
  background: '#dc3545',
  color: '#fff',
  lineHeight: 1,
  cursor: 'pointer',
  fontSize: 16,
}

interface StagedImage {
  key: string
  file: File
  previewUrl: string
}

export function ProductsPage() {
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductRequest>(emptyForm)

  const [selected, setSelected] = useState<ProductResponse | null>(null)
  const [slotValue, setSlotValue] = useState('0')
  const [restockValue, setRestockValue] = useState('0')

  // Image gallery is edited locally (staged adds + marked-for-removal) and only hits the
  // server when "Save changes" is clicked - nothing is uploaded or deleted before that.
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<Set<number>>(new Set())
  const [savingImages, setSavingImages] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<PageResponse<ProductResponse>>('/api/admin/products?page=0&size=100')
      setProducts(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(product: ProductResponse) {
    setEditingId(product.id)
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      slotQuantity: product.slotQuantity,
      active: product.active,
    })
    setSelected(product)
    setSlotValue(String(product.slotQuantity))
    discardImageChanges()
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (editingId) {
        await api.put(`/api/admin/products/${editingId}`, form)
        setNotice('Product updated.')
      } else {
        await api.post('/api/admin/products', form)
        setNotice('Product created.')
      }
      resetForm()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product')
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm('Delete this product?')) return
    setError(null)
    try {
      await api.del(`/api/admin/products/${id}`)
      if (selected?.id === id) setSelected(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete product')
    }
  }

  async function setSlot() {
    if (!selected) return
    setError(null)
    try {
      const updated = await api.patch<ProductResponse>(`/api/admin/products/${selected.id}/slot`, {
        quantity: Number(slotValue),
      })
      setSelected(updated)
      load()
      setNotice('Stock level set.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set stock')
    }
  }

  async function restock() {
    if (!selected) return
    setError(null)
    try {
      const updated = await api.post<ProductResponse>(`/api/admin/products/${selected.id}/reslot`, {
        quantity: Number(restockValue),
      })
      setSelected(updated)
      setSlotValue(String(updated.slotQuantity))
      load()
      setNotice('Stock restocked.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restock')
    }
  }

  function visibleExistingImages() {
    return selected ? selected.images.filter((img) => !removedImageIds.has(img.id)) : []
  }

  function totalImageCount() {
    return visibleExistingImages().length + stagedImages.length
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    const remaining = MAX_IMAGES - totalImageCount()
    const picked = Array.from(files).slice(0, Math.max(0, remaining))
    if (files.length > picked.length) {
      setError(`A product can have at most ${MAX_IMAGES} images - only added ${picked.length} of the ${files.length} you picked.`)
    }
    const staged = picked.map((file) => ({
      key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setStagedImages((prev) => [...prev, ...staged])
  }

  function removeStaged(key: string) {
    setStagedImages((prev) => {
      const target = prev.find((s) => s.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((s) => s.key !== key)
    })
  }

  function markExistingRemoved(imageId: number) {
    setRemovedImageIds((prev) => new Set(prev).add(imageId))
  }

  function discardImageChanges() {
    setStagedImages((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.previewUrl))
      return []
    })
    setRemovedImageIds(new Set())
  }

  async function saveImageChanges() {
    if (!selected) return
    setSavingImages(true)
    setError(null)
    try {
      for (const imageId of removedImageIds) {
        await api.del(`/api/admin/products/${selected.id}/images/${imageId}`)
      }
      const keptCount = visibleExistingImages().length
      for (let i = 0; i < stagedImages.length; i++) {
        const formData = new FormData()
        formData.set('file', stagedImages[i].file)
        formData.set('sortOrder', String(keptCount + i))
        await api.postForm(`/api/admin/products/${selected.id}/images`, formData)
      }
      const refreshed = await api.get<ProductResponse>(`/api/products/${selected.id}`)
      setSelected(refreshed)
      discardImageChanges()
      load()
      setNotice('Image changes saved.')
    } catch (err) {
      setError(
        (err instanceof Error ? err.message : 'Could not save image changes') +
          ' - some changes may have gone through; check the list below and retry any that are missing.',
      )
      const refreshed = await api.get<ProductResponse>(`/api/products/${selected.id}`)
      setSelected(refreshed)
      discardImageChanges()
      load()
    } finally {
      setSavingImages(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Products</h2>

      {error && (
        <CAlert data-testid="products-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="products-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>{editingId ? `Edit product #${editingId}` : 'Create product'}</CCardHeader>
        <CCardBody>
          <CForm onSubmit={submitForm} className="d-flex flex-column gap-3">
            <div className="d-flex gap-3 flex-wrap">
              <CFormInput
                data-testid="product-form-sku"
                label="SKU"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                style={{ width: 180 }}
              />
              <CFormInput
                data-testid="product-form-name"
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ flex: 1, minWidth: 200 }}
              />
            </div>
            <CFormTextarea
              data-testid="product-form-description"
              label="Description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="d-flex gap-3 flex-wrap align-items-end">
              <CFormInput
                data-testid="product-form-price"
                label="Price"
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                style={{ width: 140 }}
              />
              <CFormInput
                data-testid="product-form-slot-quantity"
                label="Initial stock (slot quantity)"
                type="number"
                required
                value={form.slotQuantity}
                onChange={(e) => setForm({ ...form, slotQuantity: Number(e.target.value) })}
                style={{ width: 200 }}
              />
              <CFormCheck
                data-testid="product-form-active"
                label="Active"
                checked={form.active ?? true}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            </div>
            <div className="d-flex gap-2">
              <CButton data-testid="product-form-submit" type="submit" color="primary">
                {editingId ? 'Save changes' : 'Create product'}
              </CButton>
              {editingId && (
                <CButton data-testid="product-form-cancel" type="button" color="secondary" variant="outline" onClick={resetForm}>
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
              <CTableHeaderCell>ID</CTableHeaderCell>
              <CTableHeaderCell>Name</CTableHeaderCell>
              <CTableHeaderCell>SKU</CTableHeaderCell>
              <CTableHeaderCell>Price</CTableHeaderCell>
              <CTableHeaderCell>Stock</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell></CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {products.map((p) => (
              <CTableRow data-testid={`product-row-${p.id}`} key={p.id}>
                <CTableDataCell className="text-body-secondary">{p.id}</CTableDataCell>
                <CTableDataCell>{p.name}</CTableDataCell>
                <CTableDataCell>{p.sku}</CTableDataCell>
                <CTableDataCell>{money(p.price)}</CTableDataCell>
                <CTableDataCell>{p.availableQuantity}</CTableDataCell>
                <CTableDataCell>
                  <CBadge color={p.active ? 'success' : 'secondary'}>{p.active ? 'Active' : 'Inactive'}</CBadge>
                </CTableDataCell>
                <CTableDataCell className="d-flex gap-2">
                  <CButton data-testid={`product-manage-${p.id}`} size="sm" color="secondary" onClick={() => startEdit(p)}>
                    Manage
                  </CButton>
                  <CButton data-testid={`product-delete-${p.id}`} size="sm" color="danger" variant="outline" onClick={() => deleteProduct(p.id)}>
                    Delete
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      )}

      {selected && (
        <CCard data-testid={`product-manage-panel-${selected.id}`}>
          <CCardHeader>Stock &amp; images - {selected.name}</CCardHeader>
          <CCardBody className="d-flex flex-column gap-4">
            <div className="d-flex gap-4 flex-wrap">
              <div className="d-flex gap-2 align-items-end">
                <CFormInput
                  data-testid="product-slot-value"
                  label="Set stock to"
                  type="number"
                  value={slotValue}
                  onChange={(e) => setSlotValue(e.target.value)}
                  style={{ width: 140 }}
                />
                <CButton data-testid="product-set-slot" color="secondary" onClick={setSlot}>
                  Set
                </CButton>
              </div>
              <div className="d-flex gap-2 align-items-end">
                <CFormInput
                  data-testid="product-restock-value"
                  label="Restock (+ units)"
                  type="number"
                  value={restockValue}
                  onChange={(e) => setRestockValue(e.target.value)}
                  style={{ width: 140 }}
                />
                <CButton data-testid="product-restock-submit" color="secondary" onClick={restock}>
                  Add stock
                </CButton>
              </div>
            </div>

            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="m-0">
                  Images ({totalImageCount()}/{MAX_IMAGES})
                </h6>
                {(stagedImages.length > 0 || removedImageIds.size > 0) && (
                  <CBadge color="warning">Unsaved changes</CBadge>
                )}
              </div>

              <div className="d-flex gap-2 flex-wrap mb-3">
                {visibleExistingImages().map((img) => (
                  <div key={img.id} style={{ position: 'relative', width: 100, height: 100 }}>
                    <img
                      src={imageUrl(img.imageUrl)}
                      alt=""
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                    />
                    <button
                      type="button"
                      data-testid={`product-image-remove-${img.id}`}
                      onClick={() => markExistingRemoved(img.id)}
                      title="Remove (only takes effect after Save)"
                      style={removeButtonStyle}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {stagedImages.map((staged, i) => (
                  <div key={staged.key} style={{ position: 'relative', width: 100, height: 100 }}>
                    <img
                      src={staged.previewUrl}
                      alt=""
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, display: 'block', opacity: 0.85 }}
                    />
                    <CBadge color="info" style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 10 }}>
                      new
                    </CBadge>
                    <button
                      type="button"
                      data-testid={`product-image-remove-staged-${i}`}
                      onClick={() => removeStaged(staged.key)}
                      title="Remove from selection"
                      style={removeButtonStyle}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {totalImageCount() === 0 && <p className="text-body-secondary small m-0">No images yet.</p>}
              </div>

              <div className="d-flex gap-2 align-items-end flex-wrap">
                <CFormInput
                  data-testid="product-image-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  label={`Add photos (up to ${MAX_IMAGES} total)`}
                  onChange={(e) => {
                    addFiles(e.target.files)
                    e.target.value = ''
                  }}
                  disabled={totalImageCount() >= MAX_IMAGES}
                  style={{ maxWidth: 300 }}
                />
                <CButton
                  data-testid="product-image-save"
                  color="primary"
                  onClick={saveImageChanges}
                  disabled={savingImages || (stagedImages.length === 0 && removedImageIds.size === 0)}
                >
                  {savingImages ? <CSpinner size="sm" /> : 'Save changes'}
                </CButton>
                <CButton
                  data-testid="product-image-discard"
                  color="secondary"
                  variant="outline"
                  onClick={discardImageChanges}
                  disabled={stagedImages.length === 0 && removedImageIds.size === 0}
                >
                  Discard
                </CButton>
              </div>
              <p className="text-body-secondary small mt-2 mb-0">
                Removing or adding a photo only takes effect once you click Save changes - nothing is uploaded or
                deleted until then.
              </p>
            </div>
          </CCardBody>
        </CCard>
      )}
    </div>
  )
}
