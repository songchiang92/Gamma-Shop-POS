import { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CProgress,
  CProgressBar,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api, money } from '../../api/client'
import type { ShipmentOrderResponse, ShipmentResponse } from '../../api/types'

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function ShipmentsPage() {
  const [unassigned, setUnassigned] = useState<ShipmentOrderResponse[]>([])
  const [vans, setVans] = useState<ShipmentResponse[]>([])
  const [history, setHistory] = useState<ShipmentResponse[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [targetVan, setTargetVan] = useState('')

  const [newVanLabel, setNewVanLabel] = useState('')
  const [newVanCapacity, setNewVanCapacity] = useState('12')
  const [busy, setBusy] = useState(false)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [unassignedOrders, planning, dispatched] = await Promise.all([
        api.get<ShipmentOrderResponse[]>('/api/admin/shipments/unassigned'),
        api.get<ShipmentResponse[]>('/api/admin/shipments?status=PLANNING'),
        api.get<ShipmentResponse[]>('/api/admin/shipments?status=DISPATCHED'),
      ])
      setUnassigned(unassignedOrders)
      setVans(planning)
      setHistory(dispatched)
      setSelected((prev) => {
        const stillThere = new Set(unassignedOrders.map((o) => o.orderId))
        return new Set([...prev].filter((id) => stillThere.has(id)))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load shipments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const groups = useMemo(() => {
    const byCity = new Map<string, ShipmentOrderResponse[]>()
    for (const order of unassigned) {
      const key = order.shippingCity && order.shippingCity.trim() ? order.shippingCity : '(no address yet)'
      if (!byCity.has(key)) byCity.set(key, [])
      byCity.get(key)!.push(order)
    }
    return [...byCity.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [unassigned])

  function toggle(orderId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  function toggleGroup(city: string, orders: ShipmentOrderResponse[]) {
    const ids = orders.filter((o) => o.shippingCity && o.shippingCity.trim()).map((o) => o.orderId)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
    void city
  }

  async function createVan() {
    if (!newVanLabel.trim()) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/admin/shipments', {
        vanLabel: newVanLabel.trim(),
        capacity: Number(newVanCapacity) || 12,
      })
      setNewVanLabel('')
      setNewVanCapacity('12')
      loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create van')
    } finally {
      setBusy(false)
    }
  }

  async function addSelectedToVan() {
    if (!targetVan || selected.size === 0) return
    setBusy(true)
    setError(null)
    let added = 0
    const skipped: string[] = []
    for (const orderId of selected) {
      try {
        await api.post(`/api/admin/shipments/${targetVan}/orders/${orderId}`)
        added++
      } catch (err) {
        const order = unassigned.find((o) => o.orderId === orderId)
        skipped.push(`${order?.orderNumber ?? orderId}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }
    setSelected(new Set())
    setNotice(
      `Loaded ${added} order(s) onto the van.` + (skipped.length ? ` Skipped ${skipped.length}: ${skipped.join('; ')}` : ''),
    )
    await loadAll()
    setBusy(false)
  }

  async function removeOrder(vanId: number, orderId: number) {
    setError(null)
    try {
      await api.del(`/api/admin/shipments/${vanId}/orders/${orderId}`)
      loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove order')
    }
  }

  async function updateCapacity(vanId: number, capacity: number) {
    setError(null)
    try {
      await api.patch(`/api/admin/shipments/${vanId}/capacity`, { capacity })
      loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update capacity')
    }
  }

  async function dispatchVan(vanId: number) {
    if (!confirm('Dispatch this van? Every loaded order will be marked SHIPPED.')) return
    setError(null)
    try {
      await api.post(`/api/admin/shipments/${vanId}/dispatch`)
      setNotice('Van dispatched.')
      loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dispatch van')
    }
  }

  async function deleteVan(vanId: number) {
    if (!confirm('Cancel this van? Its orders go back to the unassigned pool.')) return
    setError(null)
    try {
      await api.del(`/api/admin/shipments/${vanId}`)
      loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete van')
    }
  }

  if (loading) return <CSpinner />

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <h2 className="m-0">Shipments</h2>
        <p className="text-body-secondary m-0">
          Route paid orders onto vans by delivery city instead of one-at-a-time - one van, one city, everything on
          it.
        </p>
      </div>

      {error && (
        <CAlert data-testid="shipments-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert data-testid="shipments-notice" color="success" dismissible onClose={() => setNotice(null)}>
          {notice}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>New van</CCardHeader>
        <CCardBody className="d-flex gap-3 align-items-end flex-wrap">
          <CFormInput
            data-testid="shipment-new-van-label"
            label="Van label"
            placeholder="e.g. Van 1"
            value={newVanLabel}
            onChange={(e) => setNewVanLabel(e.target.value)}
            style={{ width: 200 }}
          />
          <CFormInput
            data-testid="shipment-new-van-capacity"
            label="Capacity"
            type="number"
            min={1}
            value={newVanCapacity}
            onChange={(e) => setNewVanCapacity(e.target.value)}
            style={{ width: 120 }}
          />
          <CButton data-testid="shipment-create-van" color="primary" onClick={createVan} disabled={!newVanLabel.trim() || busy}>
            Create van
          </CButton>
          <span className="text-body-secondary small">
            City is locked in from the first order loaded. Capacity defaults to 12 orders but you can raise or lower
            it per van.
          </span>
        </CCardBody>
      </CCard>

      {vans.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {vans.map((van) => {
            const full = van.loadedCount >= van.capacity
            return (
              <CCard data-testid={`van-card-${van.id}`} key={van.id}>
                <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span>
                    <strong>{van.vanLabel}</strong> <CBadge color="secondary">{van.city ?? 'no city yet'}</CBadge>
                  </span>
                  <div className="d-flex gap-2 align-items-center">
                    <CButton
                      data-testid={`van-dispatch-${van.id}`}
                      size="sm"
                      color="success"
                      onClick={() => dispatchVan(van.id)}
                      disabled={van.loadedCount === 0}
                    >
                      Dispatch
                    </CButton>
                    <CButton data-testid={`van-cancel-${van.id}`} size="sm" color="danger" variant="outline" onClick={() => deleteVan(van.id)}>
                      Cancel van
                    </CButton>
                  </div>
                </CCardHeader>
                <CCardBody className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ flex: 1 }}>
                      <CProgress>
                        <CProgressBar color={full ? 'danger' : 'success'} value={(van.loadedCount / van.capacity) * 100}>
                          {van.loadedCount} / {van.capacity}
                        </CProgressBar>
                      </CProgress>
                    </div>
                    <CFormInput
                      data-testid={`van-capacity-${van.id}`}
                      type="number"
                      min={1}
                      defaultValue={van.capacity}
                      style={{ width: 90 }}
                      onBlur={(e) => {
                        const value = Number(e.target.value)
                        if (value && value !== van.capacity) updateCapacity(van.id, value)
                      }}
                      title="Adjust capacity - staff judgment call for smaller items"
                    />
                  </div>

                  {van.orders.length === 0 ? (
                    <p className="text-body-secondary small m-0">No orders loaded yet - check some in below.</p>
                  ) : (
                    <CTable small responsive>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Order</CTableHeaderCell>
                          <CTableHeaderCell>Address</CTableHeaderCell>
                          <CTableHeaderCell>Customer</CTableHeaderCell>
                          <CTableHeaderCell>Items</CTableHeaderCell>
                          <CTableHeaderCell></CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {van.orders.map((order) => (
                          <CTableRow data-testid={`van-order-row-${order.orderId}`} key={order.orderId}>
                            <CTableDataCell>{order.orderNumber}</CTableDataCell>
                            <CTableDataCell>{order.shippingAddress}</CTableDataCell>
                            <CTableDataCell>{order.userEmail}</CTableDataCell>
                            <CTableDataCell>{order.itemCount}</CTableDataCell>
                            <CTableDataCell>
                              <CButton
                                data-testid={`van-remove-order-${order.orderId}`}
                                size="sm"
                                color="secondary"
                                variant="outline"
                                onClick={() => removeOrder(van.id, order.orderId)}
                              >
                                Remove
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </CCardBody>
              </CCard>
            )
          })}
        </div>
      )}

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>Unassigned orders, ready to ship - grouped by city</span>
          <div className="d-flex gap-2 align-items-center">
            <CFormSelect
              data-testid="shipment-target-van-select"
              size="sm"
              value={targetVan}
              onChange={(e) => setTargetVan(e.target.value)}
              style={{ width: 220 }}
            >
              <option value="">Add {selected.size || ''} selected to van...</option>
              {vans.map((van) => (
                <option key={van.id} value={van.id}>
                  {van.vanLabel} ({van.city ?? 'no city yet'}) - {van.loadedCount}/{van.capacity}
                </option>
              ))}
            </CFormSelect>
            <CButton
              data-testid="shipment-add-to-van"
              size="sm"
              color="primary"
              onClick={addSelectedToVan}
              disabled={!targetVan || selected.size === 0 || busy}
            >
              Add to van
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="d-flex flex-column gap-4">
          {groups.length === 0 ? (
            <p className="text-body-secondary m-0">No paid orders waiting to be routed right now.</p>
          ) : (
            groups.map(([city, orders]) => {
              const selectableIds = orders.filter((o) => o.shippingCity && o.shippingCity.trim()).map((o) => o.orderId)
              const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
              return (
                <div key={city} data-testid={`unassigned-group-${slug(city)}`}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    {selectableIds.length > 0 && (
                      <CFormCheck
                        data-testid={`unassigned-select-city-${slug(city)}`}
                        checked={allSelected}
                        onChange={() => toggleGroup(city, orders)}
                      />
                    )}
                    <strong>{city}</strong>
                    <CBadge color="secondary">{orders.length}</CBadge>
                  </div>
                  <CTable small responsive hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: 36 }}></CTableHeaderCell>
                        <CTableHeaderCell>Order</CTableHeaderCell>
                        <CTableHeaderCell>Address</CTableHeaderCell>
                        <CTableHeaderCell>Customer</CTableHeaderCell>
                        <CTableHeaderCell>Items</CTableHeaderCell>
                        <CTableHeaderCell>Total</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {orders.map((order) => {
                        const hasAddress = !!(order.shippingCity && order.shippingCity.trim())
                        return (
                          <CTableRow data-testid={`unassigned-row-${order.orderId}`} key={order.orderId}>
                            <CTableDataCell>
                              {hasAddress ? (
                                <CFormCheck
                                  data-testid={`unassigned-select-${order.orderId}`}
                                  checked={selected.has(order.orderId)}
                                  onChange={() => toggle(order.orderId)}
                                />
                              ) : (
                                <span title="Fix this order's address in the Order Queue first">-</span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>{order.orderNumber}</CTableDataCell>
                            <CTableDataCell>{order.shippingAddress ?? <em>missing</em>}</CTableDataCell>
                            <CTableDataCell>{order.userEmail}</CTableDataCell>
                            <CTableDataCell>{order.itemCount}</CTableDataCell>
                            <CTableDataCell>{money(order.grandTotal)}</CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                </div>
              )
            })
          )}
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader data-testid="shipment-history-toggle" style={{ cursor: 'pointer' }} onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Hide' : 'Show'} dispatched vans ({history.length})
        </CCardHeader>
        {showHistory && (
          <CCardBody className="d-flex flex-column gap-3">
            {history.length === 0 ? (
              <p className="text-body-secondary m-0">No vans dispatched yet.</p>
            ) : (
              history.map((van) => (
                <div data-testid={`van-history-${van.id}`} key={van.id} className="border rounded p-3">
                  <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                    <strong>
                      {van.vanLabel} - {van.city}
                    </strong>
                    <span className="text-body-secondary small">
                      Dispatched {van.dispatchedAt ? new Date(van.dispatchedAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="small text-body-secondary">
                    {van.orders.map((o) => o.orderNumber).join(', ')} ({van.loadedCount} orders)
                  </div>
                </div>
              ))
            )}
          </CCardBody>
        )}
      </CCard>
    </div>
  )
}
