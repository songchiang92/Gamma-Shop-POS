import { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CNav,
  CNavItem,
  CNavLink,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import { api, money } from '../../api/client'

type ReportKind = 'daily' | 'monthly' | 'products' | 'top' | 'revenue'

interface DailyRow {
  day: string
  orderCount: number
  revenue: string
}
interface MonthlyRow {
  month: string
  orderCount: number
  revenue: string
}
interface ProductRow {
  productId: number
  productName: string
  unitsSold: number
  sales: string
}
interface RevenueRow {
  orderCount: number
  gross: string
  discounts: string
  net: string
}

const today = new Date().toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportKind>('daily')
  const [start, setStart] = useState(monthAgo)
  const [end, setEnd] = useState(today)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [limit, setLimit] = useState('5')

  const [daily, setDaily] = useState<DailyRow[] | null>(null)
  const [monthly, setMonthly] = useState<MonthlyRow[] | null>(null)
  const [products, setProducts] = useState<ProductRow[] | null>(null)
  const [top, setTop] = useState<ProductRow[] | null>(null)
  const [revenue, setRevenue] = useState<RevenueRow | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function endpointFor(kind: ReportKind) {
    switch (kind) {
      case 'daily':
        return `/api/admin/reports/sales/daily?start=${start}&end=${end}`
      case 'monthly':
        return `/api/admin/reports/sales/monthly?year=${year}`
      case 'products':
        return `/api/admin/reports/products?start=${start}&end=${end}`
      case 'top':
        return `/api/admin/reports/top-products?start=${start}&end=${end}&limit=${limit}`
      case 'revenue':
        return `/api/admin/reports/revenue?start=${start}&end=${end}`
    }
  }

  async function run(kind: ReportKind) {
    setLoading(true)
    setError(null)
    try {
      const path = endpointFor(kind)
      if (kind === 'daily') setDaily(await api.get(path))
      if (kind === 'monthly') setMonthly(await api.get(path))
      if (kind === 'products') setProducts(await api.get(path))
      if (kind === 'top') setTop(await api.get(path))
      if (kind === 'revenue') setRevenue(await api.get(path))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load report')
    } finally {
      setLoading(false)
    }
  }

  async function download(kind: ReportKind, format: 'csv' | 'pdf') {
    setError(null)
    try {
      const path = `${endpointFor(kind)}&format=${format}`
      const blob = await api.getBlob(path)
      downloadBlob(blob, `${kind}-report.${format}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export report')
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <h2 className="m-0">Reports</h2>

      {error && (
        <CAlert data-testid="reports-error" color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      <CNav variant="tabs">
        {(
          [
            ['daily', 'Daily sales'],
            ['monthly', 'Monthly sales'],
            ['products', 'Product sales'],
            ['top', 'Top products'],
            ['revenue', 'Revenue summary'],
          ] as [ReportKind, string][]
        ).map(([key, label]) => (
          <CNavItem key={key}>
            <CNavLink data-testid={`report-tab-${key}`} active={tab === key} onClick={() => setTab(key)} style={{ cursor: 'pointer' }}>
              {label}
            </CNavLink>
          </CNavItem>
        ))}
      </CNav>

      <CCard>
        <CCardHeader>Parameters</CCardHeader>
        <CCardBody className="d-flex gap-3 align-items-end flex-wrap">
          {tab === 'monthly' ? (
            <CFormInput data-testid="report-year" label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} style={{ width: 120 }} />
          ) : (
            <>
              <CFormInput data-testid="report-start-date" label="Start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <CFormInput data-testid="report-end-date" label="End date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </>
          )}
          {tab === 'top' && (
            <CFormInput data-testid="report-limit" label="Limit" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} style={{ width: 100 }} />
          )}
          <CButton data-testid="report-run" color="primary" onClick={() => run(tab)} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : 'Run report'}
          </CButton>
          <CButton data-testid="report-export-csv" color="secondary" variant="outline" onClick={() => download(tab, 'csv')}>
            Export CSV
          </CButton>
          <CButton data-testid="report-export-pdf" color="secondary" variant="outline" onClick={() => download(tab, 'pdf')}>
            Export PDF
          </CButton>
        </CCardBody>
      </CCard>

      {tab === 'daily' && daily && (
        <ReportTable
          headers={['Day', 'Orders', 'Revenue']}
          rows={daily.map((r) => [r.day, String(r.orderCount), money(r.revenue)])}
        />
      )}
      {tab === 'monthly' && monthly && (
        <ReportTable
          headers={['Month', 'Orders', 'Revenue']}
          rows={monthly.map((r) => [r.month, String(r.orderCount), money(r.revenue)])}
        />
      )}
      {tab === 'products' && products && (
        <ReportTable
          headers={['Product ID', 'Product', 'Units sold', 'Sales']}
          rows={products.map((r) => [String(r.productId), r.productName, String(r.unitsSold), money(r.sales)])}
        />
      )}
      {tab === 'top' && top && (
        <ReportTable
          headers={['Product ID', 'Product', 'Units sold', 'Sales']}
          rows={top.map((r) => [String(r.productId), r.productName, String(r.unitsSold), money(r.sales)])}
        />
      )}
      {tab === 'revenue' && revenue && (
        <ReportTable
          headers={['Orders', 'Gross', 'Discounts', 'Net revenue']}
          rows={[[String(revenue.orderCount), money(revenue.gross), money(revenue.discounts), money(revenue.net)]]}
        />
      )}
    </div>
  )
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <CCard data-testid="report-results">
      <CCardBody>
        {rows.length === 0 ? (
          <p className="text-body-secondary m-0">No data for this range.</p>
        ) : (
          <CTable responsive small hover>
            <CTableHead>
              <CTableRow>
                {headers.map((h) => (
                  <CTableHeaderCell key={h}>{h}</CTableHeaderCell>
                ))}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rows.map((row, i) => (
                <CTableRow key={i}>
                  {row.map((cell, j) => (
                    <CTableDataCell key={j}>{cell}</CTableDataCell>
                  ))}
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}
