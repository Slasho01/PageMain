import { useState } from 'react'
import { Link } from 'react-router-dom'
import { get, post } from '../../api'
import Icon from '../../components/Icon'
import { Empty, ErrorBox, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { useStore } from '../../store'
import { useToast } from '../../toast'
import { ESTATUS } from '../../utils'

const RANGOS = [['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['365', 'Último año']]
const iso = (d) => d.toISOString().slice(0, 10)

function LowStock() {
  const [umbral, setUmbral] = useState(5)
  const { data, error, loading, reload } = useFetch(() => get(`/admin/stock-bajo?umbral=${umbral}`), [umbral])
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="row between" style={{ padding: '18px 20px 6px' }}>
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>Stock bajo</h2>
        <label className="row xs muted" style={{ '--gap': '6px' }}>Umbral
          <input className="input" type="number" min="0" value={umbral} onChange={(e) => setUmbral(Math.max(0, Number(e.target.value)))} style={{ width: 70 }} />
        </label>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data && (data.length === 0 ? <Empty icon="package" title={`Nada con ${umbral} o menos`} /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Producto</th><th className="r">Stock</th></tr></thead>
          <tbody>{data.map((i, k) => (
            <tr key={k}>
              <td><Link className="link" to={`/producto/${i.slug}`}>{i.nombre}</Link>{i.variante && <span className="muted"> · {i.variante}</span>}</td>
              <td className="r num"><span className={i.stock === 0 ? 'badge badge-bad' : i.stock <= 2 ? 'badge badge-warn' : ''}>{i.stock}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      ))}
    </div>
  )
}

function BarChart({ data, money }) {
  if (!data.length) return <Empty icon="chart" title="Sin ventas en el período" />
  const max = Math.max(...data.map((d) => d.ingresos), 1)
  const W = 720, H = 220, pad = 28
  const bw = (W - pad * 2) / data.length
  const fmtDay = (f) => new Date(f + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  // mostrar como máximo ~8 etiquetas en el eje X
  const step = Math.ceil(data.length / 8)
  return (
    <div className="table-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Ingresos por día" style={{ maxWidth: '100%' }}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad} x2={W - pad} y1={pad + (H - pad * 2) * (1 - t)} y2={pad + (H - pad * 2) * (1 - t)} stroke="var(--line)" strokeWidth="1" />
            <text x={4} y={pad + (H - pad * 2) * (1 - t) + 4} fontSize="9" fill="var(--muted)">{money(Math.round(max * t)).replace(/\s/g, '')}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.ingresos / max) * (H - pad * 2)
          return (
            <g key={d.fecha}>
              <rect x={pad + i * bw + bw * 0.15} y={H - pad - h} width={bw * 0.7} height={Math.max(h, d.ingresos > 0 ? 2 : 0)} rx="2" fill="var(--volt)">
                <title>{fmtDay(d.fecha)}: {money(d.ingresos)} · {d.pedidos} pedido(s)</title>
              </rect>
              {i % step === 0 && <text x={pad + i * bw + bw / 2} y={H - pad + 12} fontSize="9" fill="var(--muted)" textAnchor="middle">{fmtDay(d.fecha)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Metrics() {
  const { moneyBase } = useStore()
  const toast = useToast()
  const [procesando, setProcesando] = useState(false)
  const procesar = async () => {
    setProcesando(true)
    try {
      const r = await post('/admin/notificaciones/procesar', {})
      toast(`Enviados: ${r.avisos_stock} aviso(s) de stock y ${r.recordatorios_carrito} recordatorio(s) de carrito`)
    } catch (e) { toast.error(e) } finally { setProcesando(false) }
  }
  const [rango, setRango] = useState('30')
  const [custom, setCustom] = useState({ desde: '', hasta: '' })
  const usarCustom = custom.desde && custom.hasta
  const params = usarCustom ? { desde: custom.desde, hasta: custom.hasta }
    : (() => { const h = new Date(); const d = new Date(); d.setDate(d.getDate() - (Number(rango) - 1)); return { desde: iso(d), hasta: iso(h) } })()
  const { data, error, loading, reload } = useFetch(() => get('/admin/metricas', params), [params.desde, params.hasta])
  const money = moneyBase
  const m = data?.resumen

  const tiles = m ? [
    { label: 'Ingresos (ventas pagadas)', value: money(m.ingresos), icon: 'card', main: true },
    { label: 'Pedidos', value: m.pedidos, icon: 'receipt' },
    { label: 'Ticket promedio', value: money(m.ticket_promedio), icon: 'tag' },
    { label: 'Unidades vendidas', value: m.unidades, icon: 'package' },
    { label: 'Pendientes de pago', value: m.pendientes, sub: m.ingresos_pendientes > 0 ? money(m.ingresos_pendientes) : null, icon: 'clock' },
    { label: 'Clientes nuevos', value: m.clientes_nuevos, icon: 'user' },
  ] : []

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="row between">
        <div className="tabs" style={{ border: 'none', gap: 2 }}>
          {RANGOS.map(([v, l]) => (
            <button key={v} className={!usarCustom && rango === v ? 'on' : ''} onClick={() => { setCustom({ desde: '', hasta: '' }); setRango(v) }}>{l}</button>
          ))}
        </div>
        <div className="row" style={{ '--gap': '8px' }}>
          <label className="row" style={{ '--gap': '6px' }}>
            <input className="input" type="date" value={custom.desde} max={custom.hasta || undefined} onChange={(e) => setCustom({ ...custom, desde: e.target.value })} aria-label="Desde" style={{ width: 'auto' }} />
            <span className="muted">—</span>
            <input className="input" type="date" value={custom.hasta} min={custom.desde || undefined} onChange={(e) => setCustom({ ...custom, hasta: e.target.value })} aria-label="Hasta" style={{ width: 'auto' }} />
          </label>
          <button className="btn btn-sm" onClick={procesar} disabled={procesando} title="Envía ahora los avisos de reposición y los recordatorios de carrito pendientes">
            <Icon name="mail" size={15} />{procesando ? 'Enviando…' : 'Notificaciones'}
          </button>
        </div>
      </div>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : m && (
        <>
          <div className="points-hero" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {tiles.map((t) => (
              <div key={t.label} className={`points-stat ${t.main ? 'main' : ''}`}>
                <div className="xs muted row" style={{ '--gap': '6px' }}><Icon name={t.icon} size={14} />{t.label}</div>
                <div className="big">{t.value}</div>
                {t.sub && <div className="small muted">{t.sub}</div>}
              </div>
            ))}
          </div>

          <div className="card">
            <div className="row between" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 'var(--fs-lg)' }}>Ingresos por día</h2>
              <span className="xs muted">{data.desde} a {data.hasta}</span>
            </div>
            <BarChart data={data.por_dia} money={money} />
          </div>

          <div className="two-col">
            <div className="card" style={{ padding: 0 }}>
              <h2 style={{ fontSize: 'var(--fs-lg)', padding: '18px 20px 6px' }}>Productos más vendidos</h2>
              {data.top_productos.length === 0 ? <Empty icon="package" title="Sin ventas" /> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>Producto</th><th className="r">Unidades</th><th className="r">Ingresos</th></tr></thead>
                  <tbody>{data.top_productos.map((p, i) => (
                    <tr key={i}>
                      <td>{p.producto_id ? <Link className="link" to={`/producto/${p.producto_id}`}>{p.nombre}</Link> : p.nombre}</td>
                      <td className="r num">{p.unidades}</td>
                      <td className="r num strong">{money(p.ingresos)}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
            <div className="card stack" style={{ '--gap': '8px' }}>
              <h2 style={{ fontSize: 'var(--fs-lg)' }}>Pedidos por estado</h2>
              {data.por_estado.map((e) => {
                const s = ESTATUS[e.estatus] || { short: e.estatus, tone: '' }
                return (
                  <div key={e.estatus} className="row between">
                    <span className={`badge badge-${s.tone}`}><span className="dot" />{s.short}</span>
                    <span className="small"><b className="num">{e.total}</b> <span className="muted">· {money(e.monto)}</span></span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
      <LowStock />
    </div>
  )
}
