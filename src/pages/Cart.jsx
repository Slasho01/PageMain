import { Link } from 'react-router-dom'
import { useCart } from '../cart'
import Icon from '../components/Icon'
import { ConfirmButton, Empty, ProductThumb, QtyInput, Spinner } from '../components/ui'
import { usePageMeta } from '../seo'
import { shippingFacts, useStore } from '../store'
import { useToast } from '../toast'
import { EarnBadge } from '../components/Points'

export function FreeShippingBar({ subtotal }) {
  const { pais, money } = useStore()
  const { gratisDesde } = shippingFacts(pais)
  if (gratisDesde == null) return null
  const falta = gratisDesde - subtotal
  const pct = Math.min(100, Math.round((subtotal / gratisDesde) * 100))
  return (
    <div className="panel stack" style={{ '--gap': '8px' }}>
      <span className="small row" style={{ '--gap': '8px' }}>
        <Icon name="truck" size={18} />
        {falta > 0 ? <span>Te faltan <b>{money(falta)}</b> para envío gratis a {pais.nombre}</span> : <b style={{ color: 'var(--ok)' }}>¡Tienes envío gratis a {pais.nombre}!</b>}
      </span>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function Cart() {
  const { cart, loaded, setQty, remove, clear, refresh } = useCart()
  const { tienda, money, pais, paginaVisible } = useStore()
  const toast = useToast()
  usePageMeta({ title: 'Carrito', store: tienda.nombre, noindex: true })

  const run = (fn) => async (...a) => { try { await fn(...a) } catch (e) { toast.error(e); refresh() } }
  const unavailable = cart.items.some((i) => !i.disponible)
  const ship = shippingFacts(pais)

  if (!loaded) return <Spinner />
  if (cart.items.length === 0) {
    return <Empty icon="cart" title="Tu carrito está vacío" action={<Link className="btn btn-dark btn-lg" to="/catalogo">Explorar productos</Link>}>Agrega productos y aparecerán aquí.</Empty>
  }

  return (
    <>
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Carrito <span className="muted" style={{ fontWeight: 500 }}>({cart.total_items})</span></h1>
        <ConfirmButton className="btn btn-sm btn-ghost" confirmText="¿Vaciar carrito?" onConfirm={run(clear)}><Icon name="trash" size={16} />Vaciar</ConfirmButton>
      </div>
      <div className="two-col">
        <div className="card">
          {cart.items.map((i) => (
            <div key={i.id} className="line-item">
              <Link to={`/producto/${i.producto_id}`}><ProductThumb src={i.imagen} alt={i.nombre} /></Link>
              <div className="stack" style={{ '--gap': '4px', minWidth: 0 }}>
                {i.marca && <span className="pcard-brand">{i.marca}</span>}
                <Link to={`/producto/${i.producto_id}`} className="strong">{i.nombre}</Link>
                {i.variante && <span className="small muted">{i.variante}</span>}
                <span className="small muted num">{money(i.precio_unitario)} c/u</span>
                {!i.disponible && <span className="badge badge-bad" style={{ alignSelf: 'start' }}>Sólo quedan {i.stock_disponible}</span>}
                <div className="row" style={{ marginTop: 6, '--gap': '8px' }}>
                  <QtyInput size="sm" value={i.cantidad} max={Math.max(i.stock_disponible, 1)} onChange={run((n) => setQty(i.id, n))} />
                  <button className="btn btn-sm btn-ghost" onClick={run(() => remove(i.id))}><Icon name="trash" size={16} />Quitar</button>
                </div>
              </div>
              <strong className="num" style={{ textAlign: 'right' }}>{money(i.subtotal)}</strong>
            </div>
          ))}
        </div>

        <aside className="sticky-col stack" style={{ '--gap': '14px' }}>
          <FreeShippingBar subtotal={cart.total} />
          <div className="card stack" style={{ '--gap': '6px' }}>
            <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 8 }}>Resumen</h2>
            <div className="summary-row"><span>Subtotal</span><span className="num">{money(cart.total)}</span></div>
            <div className="summary-row">
              <span>Envío</span>
              <span className="muted">{ship.metodos.length ? (ship.desde === 0 ? 'Desde gratis' : `Desde ${money(ship.desde)}`) : 'A coordinar'}</span>
            </div>
            <div className="summary-row"><span className="muted xs">Los cupones se aplican en el siguiente paso.</span></div>
            <div className="summary-row total"><span>Total estimado</span><span className="num">{money(cart.total)}</span></div>
            <EarnBadge amount={cart.total} compact />
            <Link className={`btn btn-primary btn-lg btn-block ${unavailable ? 'disabled' : ''}`} to={unavailable ? '#' : '/checkout'}
              aria-disabled={unavailable} onClick={(e) => unavailable && e.preventDefault()} style={{ marginTop: 10, opacity: unavailable ? 0.5 : 1 }}>
              Continuar con la compra <Icon name="arrow-right" size={18} />
            </Link>
            {unavailable && <span className="xs" style={{ color: 'var(--bad)' }}>Ajusta las cantidades marcadas para continuar.</span>}
            <Link className="btn btn-ghost btn-block" to="/catalogo">Seguir comprando</Link>
          </div>
          <div className="stack small muted" style={{ '--gap': '8px', padding: '0 4px' }}>
            <span className="row" style={{ '--gap': '8px' }}><Icon name="lock" size={16} />Tus datos se usan sólo para procesar tu pedido.</span>
            <span className="row" style={{ '--gap': '8px' }}><Icon name="refresh" size={16} />Puedes cancelar mientras el pedido esté pendiente de pago.</span>
            {paginaVisible('devoluciones') && <span className="row" style={{ '--gap': '8px' }}><Icon name="info" size={16} /><Link className="link" to="/p/devoluciones">Política de cambios y devoluciones</Link></span>}
          </div>
        </aside>
      </div>
    </>
  )
}
