import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { fileUrl, get, post } from '../api'
import Icon from '../components/Icon'
import { ErrorBox, Spinner } from '../components/ui'
import { payWithMercadoPago } from '../lib/payments'
import { usePageMeta } from '../seo'
import { useStore } from '../store'
import { shortId } from '../utils'

export default function OrderConfirmation() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const location = useLocation()
  const { tienda, pagos, moneyAt } = useStore()
  const [o, setO] = useState(null)
  const [error, setError] = useState(null)
  const [payErr, setPayErr] = useState(location.state?.error || null)
  const [paying, setPaying] = useState(false)
  usePageMeta({ title: 'Pedido recibido', store: tienda.nombre, noindex: true })

  // Al volver de Mercado Pago, sincronizar el pago (por si el webhook aún no llegó)
  useEffect(() => {
    const paymentId = sp.get('payment_id') || sp.get('collection_id')
    const load = paymentId && paymentId !== 'null'
      ? post(`/ordenes/${id}/pago/verificar`, { payment_id: paymentId }).catch(() => get(`/ordenes/${id}`))
      : get(`/ordenes/${id}`)
    load.then(setO).catch(setError)
  }, [id, sp])

  if (error) return <ErrorBox error={error} />
  if (!o) return <Spinner />
  const m = (v) => moneyAt(v, o.moneda, o.tasa_cambio)
  const pago = pagos.find((p) => p.nombre === o.metodo_pago)
  const online = o.pago_proveedor === 'mercadopago'
  const paid = o.estatus !== 'pendiente' && o.estatus !== 'cancelado'
  const vuelta = sp.get('pago')
  const pay = async () => { setPaying(true); setPayErr(null); try { await payWithMercadoPago(o.id) } catch (e) { setPayErr(e.message); setPaying(false) } }

  const header = paid ? { icon: 'check', tone: 'ok', title: '¡Pago confirmado!', text: 'Ya estamos preparando tu pedido.' }
    : online && vuelta === 'rechazado' ? { icon: 'alert', tone: 'bad', title: 'El pago no se completó', text: 'Tu pedido sigue reservado. Puedes intentar pagar de nuevo.' }
    : online && vuelta === 'pendiente' ? { icon: 'clock', tone: 'warn', title: 'Pago en proceso', text: 'Mercado Pago está procesando tu pago. Te avisaremos cuando se confirme.' }
    : { icon: 'check', tone: 'ok', title: `¡Gracias, ${o.nombre_comprador?.split(' ')[0] || 'por tu compra'}!`, text: 'Recibimos tu pedido.' }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }} className="stack">
      <div className="card pad-lg" style={{ textAlign: 'center' }}>
        <div className="empty-icon" style={{ margin: '0 auto 12px', background: `var(--${header.tone}-soft)`, color: `var(--${header.tone})` }}><Icon name={header.icon} size={30} /></div>
        <h1 className="page-title">{header.title}</h1>
        <p className="muted">{header.text} Pedido <strong className="num">#{shortId(o.id)}</strong>{o.email_comprador && <>. Confirmación enviada a <strong>{o.email_comprador}</strong></>}.</p>
        {payErr && <div className="alert alert-bad" style={{ textAlign: 'left', marginBottom: 12 }}><Icon name="alert" size={18} />{payErr}</div>}
        <div className="row" style={{ justifyContent: 'center' }}>
          {online && o.estatus === 'pendiente' && vuelta !== 'pendiente' && (
            <button className="btn btn-primary btn-lg" onClick={pay} disabled={paying}><Icon name="lock" size={18} />{paying ? 'Abriendo Mercado Pago…' : `Pagar ${m(o.total)} con Mercado Pago`}</button>
          )}
          <Link className="btn btn-dark" to={`/cuenta/pedidos/${o.id}`}>Ver estado del pedido</Link>
          <Link className="btn" to="/catalogo">Seguir comprando</Link>
        </div>
      </div>

      <div className="card stack">
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>Próximos pasos</h2>
        <div className="trust-list">
          <div className="trust-item"><Icon name="card" />
            <div>
              <strong>Pago: {o.metodo_pago}</strong>
              {online ? <div className="muted">{paid ? 'Pago aprobado por Mercado Pago.' : 'Pago online con Mercado Pago (tarjetas y saldo).'}</div>
                : pago?.instrucciones ? <div className="pre-line" style={{ marginTop: 6 }}>{pago.instrucciones}</div>
                : <div className="muted">La tienda te contactará para coordinar el pago. Tu pedido queda reservado como pendiente.</div>}
            </div>
          </div>
          <div className="trust-item"><Icon name="truck" /><div><strong>Entrega: {o.metodo_envio}</strong><div className="muted">{o.direccion_envio}</div></div></div>
          {o.documento_url && (
            <div className="trust-item"><Icon name="receipt" /><div><strong>{o.tipo_documento === 'factura' ? 'Factura' : 'Boleta'}</strong><div><a className="link" href={fileUrl(o.documento_url)} target="_blank" rel="noopener noreferrer">Descargar documento</a></div></div></div>
          )}
        </div>
      </div>

      <div className="card">
        {o.detalles.map((d) => (
          <div key={d.id} className="row nowrap between" style={{ padding: '8px 0', '--gap': '12px' }}>
            <div className="small"><div className="strong">{d.nombre_producto}</div>{d.nombre_variante && <div className="muted xs">{d.nombre_variante}</div>}<div className="muted xs">{d.cantidad} × {m(d.precio_unitario)}</div></div>
            <span className="num small">{m(d.precio_unitario * d.cantidad)}</span>
          </div>
        ))}
        <hr className="divider" />
        <div className="summary-row"><span>Subtotal</span><span className="num">{m(o.subtotal)}</span></div>
        {o.descuento > 0 && <div className="summary-row" style={{ color: 'var(--ok)' }}><span>Descuento</span><span className="num">−{m(o.descuento)}</span></div>}
            {o.descuento_puntos > 0 && <div className="summary-row" style={{ color: 'var(--ok)' }}><span>Puntos canjeados ({o.puntos_usados})</span><span className="num">−{m(o.descuento_puntos)}</span></div>}
        <div className="summary-row"><span>Envío</span><span className="num">{o.costo_envio === 0 ? (o.metodo_envio?.includes('coordinar') ? 'A coordinar' : 'Gratis') : m(o.costo_envio)}</span></div>
        <div className="summary-row total"><span>Total</span><span className="num">{m(o.total)}</span></div>
        {online && o.moneda !== 'CLP' && <p className="xs muted" style={{ margin: 0 }}>Mercado Pago cobra el equivalente en pesos chilenos.</p>}
      </div>
    </div>
  )
}
