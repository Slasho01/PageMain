import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { productUrl } from '../lib/catalog'
import { useToast } from '../toast'
import { discountPct } from '../utils'
import { useWishlist } from '../wishlist'
import Icon from './Icon'
import Img from './Img'
import Price from './Price'
import { Skeleton, Stars } from './ui'

export function StockLine({ stock }) {
  if (stock <= 0) return <span className="stock-line out"><span className="dot" />Agotado</span>
  if (stock <= 5) return <span className="stock-line low"><span className="dot" />Últimas {stock} unidades</span>
  return <span className="stock-line ok"><span className="dot" />En stock</span>
}

export default function ProductCard({ p, priority }) {
  const { user } = useAuth()
  const cart = useCart()
  const wish = useWishlist()
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const pct = discountPct(p)
  const url = productUrl(p)
  const fav = wish.has(p.id)

  const quickAdd = async () => {
    if (p.variantes > 0) return navigate(url)
    if (!user) return navigate('/login', { state: { from: url } })
    setBusy(true)
    try { await cart.add(p.id, null, 1); toast('Agregado al carrito', { to: '/carrito', label: 'Ver carrito' }) }
    catch (e) { toast.error(e) } finally { setBusy(false) }
  }

  return (
    <article className="pcard">
      <div className="pcard-media">
        <div className="pcard-badges">
          {pct > 0 && <span className="badge badge-deal">−{pct}%</span>}
          {!p.estatus && <span className="badge">Oculto</span>}
        </div>
        <button className={`pcard-fav ${fav ? 'on' : ''}`} onClick={() => wish.toggle(p)} aria-pressed={fav}
          aria-label={fav ? `Quitar ${p.nombre} de favoritos` : `Guardar ${p.nombre} en favoritos`}>
          <Icon name="heart" size={18} />
        </button>
        <div className="pcard-media-inner">
          <Img src={p.imagen_principal} variantes={p.imagen_variantes} alt={p.nombre} eager={priority}
            sizes="(max-width: 520px) 46vw, (max-width: 1100px) 30vw, 240px" />
        </div>
      </div>
      <div className="pcard-body">
        <div className="row between nowrap" style={{ '--gap': '8px' }}>
          {p.marca ? <span className="pcard-brand">{p.marca}</span> : <span />}
          {p.sku && <span className="pcard-sku">SKU {p.sku}</span>}
        </div>
        <Link to={url} className="pcard-name">{p.nombre}</Link>
        <Stars value={p.calificacion?.promedio} count={p.calificacion?.total} size={12} />
        <div className="pcard-foot">
          <div className="stack" style={{ '--gap': '2px' }}>
            <Price precio={p.precio} precioAnterior={p.precio_anterior} />
            <StockLine stock={p.stock} />
          </div>
          <button className="icon-btn" onClick={quickAdd} disabled={busy || p.stock <= 0 || !p.estatus}
            aria-label={p.variantes > 0 ? `Elegir opciones de ${p.nombre}` : `Agregar ${p.nombre} al carrito`}
            title={p.variantes > 0 ? 'Elegir opciones' : 'Agregar al carrito'}>
            <Icon name={p.variantes > 0 ? 'arrow-right' : 'cart'} size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="pcard" aria-hidden>
      <Skeleton h="auto" r={0} style={{ aspectRatio: '1 / 1' }} />
      <div className="pcard-body">
        <Skeleton w="40%" h={10} /><Skeleton h={14} /><Skeleton w="70%" h={14} /><Skeleton w="50%" h={20} style={{ marginTop: 12 }} />
      </div>
    </div>
  )
}

export function ProductGrid({ items, loading, count = 8, rail, priorityCount = 0 }) {
  const cls = rail ? 'rail' : 'grid-products'
  if (loading && !items) return <div className={cls}>{Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
  return (
    <div className={cls} style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
      {items?.map((p, i) => <ProductCard key={p.id} p={p} priority={i < priorityCount} />)}
    </div>
  )
}
