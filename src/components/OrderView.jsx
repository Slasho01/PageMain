import { Link } from 'react-router-dom'
import { useState } from 'react'
import { fileUrl, post, uploadOrderDocument } from '../api'
import { payWithMercadoPago } from '../lib/payments'
import { useAuth } from '../auth'
import { useStore } from '../store'
import { useToast } from '../toast'
import { dateTime, ESTATUS, shortId } from '../utils'
import Icon from './Icon'
import { ConfirmButton, StatusBadge } from './ui'

const PASOS = [
  ['pendiente', 'Pedido recibido', 'receipt'],
  ['pagado', 'Pago confirmado', 'card'],
  ['enviado', 'En camino', 'truck'],
  ['entregado', 'Entregado', 'check'],
]

export function Tracker({ estatus }) {
  if (estatus === 'cancelado') return <div className="alert alert-bad"><Icon name="x" size={18} />Este pedido fue cancelado. Si ya habías pagado, la tienda gestionará la devolución.</div>
  const idx = PASOS.findIndex(([k]) => k === estatus)
  return (
    <ol className="tracker" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Seguimiento del pedido">
      {PASOS.map(([k, label, icon], i) => (
        <li key={k} className={`tracker-step ${i < idx ? 'done' : i === idx ? 'current' : ''}`} aria-current={i === idx ? 'step' : undefined}>
          <span className="tracker-dot"><Icon name={i <= idx ? (i < idx ? 'check' : icon) : icon} size={16} /></span>
          {label}
        </li>
      ))}
    </ol>
  )
}

/** Detalle de un pedido (lo usan el cliente y el panel de admin). */
export default function OrderView({ o, onUpdate, adminTools, back, canUploadDocument }) {
  const { user } = useAuth()
  const toast = useToast()
  const { moneyAt, pagos } = useStore()
  const m = (v) => moneyAt(v, o.moneda, o.tasa_cambio)
  const puedeCancelar = o.user_id === user?.id && o.estatus === 'pendiente'
  const pagoCfg = pagos.find((p) => p.nombre === o.metodo_pago)
  const pagado = o.pagos.filter((p) => p.estatus === 'completado').reduce((s, p) => s + p.monto, 0)

  const [paying, setPaying] = useState(false)
  const puedePagar = o.user_id === user?.id && o.estatus === 'pendiente' && o.pago_proveedor === 'mercadopago'
  const pagar = async () => { setPaying(true); try { await payWithMercadoPago(o.id) } catch (e) { toast.error(e); setPaying(false) } }
  const cancelar = async () => {
    try { onUpdate(await post(`/ordenes/${o.id}/cancelar`)); toast('Pedido cancelado') } catch (e) { toast.error(e) }
  }

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      {back}
      <div className="row between">
        <div>
          <h1 className="page-title">Pedido <span className="num">#{shortId(o.id)}</span></h1>
          <span className="muted small">Realizado el {dateTime(o.created_at)}</span>
        </div>
        <div className="row">
          <StatusBadge estatus={o.estatus} />
          {puedePagar && <button className="btn btn-primary btn-sm" onClick={pagar} disabled={paying}><Icon name="lock" size={16} />{paying ? 'Abriendo…' : 'Pagar con Mercado Pago'}</button>}
          {puedeCancelar && <ConfirmButton confirmText="¿Cancelar pedido?" onConfirm={cancelar}>Cancelar pedido</ConfirmButton>}
        </div>
      </div>

      <div className="card"><Tracker estatus={o.estatus} />
        {o.estatus === 'pendiente' && (
          <p className="small muted" style={{ margin: '16px 0 0', textAlign: 'center' }}>
            {ESTATUS.pendiente.label}. {pagoCfg?.instrucciones ? 'Revisa las instrucciones de pago más abajo.' : 'La tienda te contactará para coordinar el pago.'}
          </p>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 8 }}>Productos</h2>
          {o.detalles.map((d) => (
            <div key={d.id} className="row nowrap" style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', '--gap': '12px' }}>
              <div className="grow">
                {d.producto_id ? <Link className="strong" to={`/producto/${d.producto_id}`}>{d.nombre_producto}</Link> : <span className="strong">{d.nombre_producto}</span>}
                {d.nombre_variante && <div className="small muted">{d.nombre_variante}</div>}
                <div className="small muted num">{d.cantidad} × {m(d.precio_unitario)}</div>
              </div>
              <span className="num strong">{m(d.precio_unitario * d.cantidad)}</span>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <div className="summary-row"><span>Subtotal</span><span className="num">{m(o.subtotal)}</span></div>
            {o.descuento > 0 && <div className="summary-row" style={{ color: 'var(--ok)' }}><span>Descuento</span><span className="num">−{m(o.descuento)}</span></div>}
            {o.descuento_puntos > 0 && <div className="summary-row" style={{ color: 'var(--ok)' }}><span>Puntos canjeados ({o.puntos_usados})</span><span className="num">−{m(o.descuento_puntos)}</span></div>}
            <div className="summary-row"><span>Envío ({o.metodo_envio || '—'})</span><span className="num">{o.costo_envio === 0 ? (o.metodo_envio?.includes('coordinar') ? 'A coordinar' : 'Gratis') : m(o.costo_envio)}</span></div>
            <div className="summary-row total"><span>Total</span><span className="num">{m(o.total)}</span></div>
            {o.puntos_ganados > 0 && o.estatus !== 'cancelado' && <span className="points-badge compact" style={{ marginTop: 8 }}><Icon name="star" size={14} />Ganaste <b>{o.puntos_ganados} puntos</b> con este pedido</span>}
          </div>
        </div>

        <aside className="stack" style={{ '--gap': '14px' }}>
          <div className="card stack" style={{ '--gap': '8px' }}>
            <h3 className="row" style={{ '--gap': '8px', fontSize: 'var(--fs-md)' }}><Icon name="truck" size={18} />Envío</h3>
            <span className="small">{o.direccion_envio}</span>
            {o.comuna_destino && <span className="xs muted">Comuna (courier): {o.comuna_destino}</span>}
            {o.envio ? (
              <dl className="kv">
                {o.envio.empresa_envio && <><dt>Empresa</dt><dd>{o.envio.empresa_envio}</dd></>}
                {o.envio.codigo_seguimiento && <><dt>Seguimiento</dt><dd className="num strong">{o.envio.codigo_seguimiento}</dd></>}
                {o.envio.estatus && <><dt>Estado</dt><dd>{o.envio.estatus.replace('_', ' ')}</dd></>}
                {o.envio.fecha_envio && <><dt>Enviado</dt><dd>{dateTime(o.envio.fecha_envio)}</dd></>}
                {o.envio.fecha_entrega && <><dt>Entregado</dt><dd>{dateTime(o.envio.fecha_entrega)}</dd></>}
              </dl>
            ) : <span className="small muted">Aún sin datos de seguimiento.</span>}
          </div>
          <div className="card stack" style={{ '--gap': '8px' }}>
            <h3 className="row" style={{ '--gap': '8px', fontSize: 'var(--fs-md)' }}><Icon name="card" size={18} />Pago</h3>
            <span className="small">{o.metodo_pago}</span>
            {o.estatus === 'pendiente' && pagoCfg?.instrucciones && <div className="panel small pre-line">{pagoCfg.instrucciones}</div>}
            {o.pagos.length > 0 && <span className="small muted">Pagado: {m(pagado)} de {m(o.total)}</span>}
            {o.pagos.map((p) => (
              <span key={p.id} className="xs muted">{p.metodo || p.proveedor} · {p.estatus}{p.referencia_externa ? ` · ref. ${p.referencia_externa}` : ''}</span>
            ))}
          </div>
          <div className="card stack" style={{ '--gap': '6px' }}>
            <h3 className="row" style={{ '--gap': '8px', fontSize: 'var(--fs-md)' }}><Icon name="user" size={18} />Comprador</h3>
            <span className="small">{o.nombre_comprador || '—'}</span>
            {o.email_comprador && <span className="small muted">{o.email_comprador}</span>}
            {o.telefono_comprador && <span className="small muted">{o.telefono_comprador}</span>}
          </div>
          {o.tipo_documento && (
            <div className="card stack" style={{ '--gap': '6px' }}>
              <h3 className="row" style={{ '--gap': '8px', fontSize: 'var(--fs-md)' }}><Icon name="receipt" size={18} />{o.tipo_documento === 'factura' ? 'Factura' : 'Boleta'}</h3>
              {o.tipo_documento === 'factura' && (
                <dl className="kv">
                  <dt>RUT</dt><dd className="num">{o.factura_rut}</dd>
                  <dt>Razón social</dt><dd>{o.factura_razon_social}</dd>
                  <dt>Giro</dt><dd>{o.factura_giro}</dd>
                  <dt>Dirección</dt><dd>{o.factura_direccion}</dd>
                </dl>
              )}
              {o.documento_url
                ? <a className="btn btn-sm btn-dark" style={{ alignSelf: 'start' }} href={fileUrl(o.documento_url)} target="_blank" rel="noopener noreferrer"><Icon name="file" size={16} />Descargar {o.tipo_documento === 'factura' ? 'factura' : 'boleta'}</a>
                : !canUploadDocument && <span className="small muted">El documento estará disponible cuando la tienda lo emita.</span>}
              {canUploadDocument && <DocumentUploader o={o} onUpdate={onUpdate} />}
            </div>
          )}
          {adminTools}
        </aside>
      </div>
    </div>
  )
}

function DocumentUploader({ o, onUpdate }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const subir = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try { onUpdate(await uploadOrderDocument(o.id, file)); toast('Documento subido') }
    catch (err) { toast.error(err) } finally { setBusy(false) }
  }
  return (
    <div className="stack" style={{ '--gap': '4px', marginTop: 6 }}>
      <label className="btn btn-sm" style={{ alignSelf: 'start', cursor: 'pointer' }}>
        <Icon name="file" size={16} />{busy ? 'Subiendo…' : o.documento_url ? 'Reemplazar documento' : `Subir ${o.tipo_documento === 'factura' ? 'factura' : 'boleta'}`}
        <input type="file" accept="application/pdf,image/*" hidden disabled={busy} onChange={subir} />
      </label>
      <span className="xs muted">PDF o imagen, hasta 15 MB. El cliente podrá descargarlo.</span>
    </div>
  )
}
