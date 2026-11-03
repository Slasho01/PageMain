import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Img from '../components/Img'
import { brandUrl, categoryUrl, productUrl, rememberViewed } from '../lib/catalog'
import { useWishlist } from '../wishlist'
import { PriceIn } from '../components/header/CurrencySwitcher'
import { EarnBadge, PointsInvite } from '../components/Points'
import { del, get, post, put } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import Icon from '../components/Icon'
import Price from '../components/Price'
import { ProductGrid, StockLine } from '../components/ProductCard'
import { Breadcrumbs, ConfirmButton, Empty, ErrorBox, Pagination, QtyInput, Skeleton, StarInput, Stars } from '../components/ui'
import { useFetch } from '../hooks'
import { usePageMeta } from '../seo'
import { shippingFacts, useStore } from '../store'
import { date } from '../utils'

export default function ProductDetail() {
  const { slug: id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: p, error, loading, reload } = useFetch(() => get(`/productos/${id}`), [id, user?.id])
  // URL antigua (uuid o slug anterior) => URL canónica
  useEffect(() => { if (p && p.slug && p.slug !== id) navigate(productUrl(p), { replace: true }) }, [p, id, navigate])
  if (loading && !p) return <DetailSkeleton />
  if (error) {
    return error.status === 404
      ? <Empty icon="search" title="Producto no encontrado" action={<Link className="btn btn-dark" to="/catalogo">Ir al catálogo</Link>}>Puede que ya no esté disponible.</Empty>
      : <ErrorBox error={error} onRetry={reload} />
  }
  return <ProductView key={p.id} p={p} reload={reload} />
}

function DetailSkeleton() {
  return (
    <div className="pdp" aria-busy>
      <Skeleton h="auto" style={{ aspectRatio: '1/1' }} r={18} />
      <div className="stack" style={{ '--gap': '16px' }}>
        <Skeleton w="30%" h={12} /><Skeleton h={36} /><Skeleton w="40%" h={32} /><Skeleton h={120} /><Skeleton h={52} r={999} />
      </div>
    </div>
  )
}

function Gallery({ images, nombre }) {
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  useEffect(() => { setI(0); setZoom(false) }, [images])
  const img = images[Math.min(i, images.length - 1)]
  const go = (d) => { setZoom(false); setI((x) => (x + d + images.length) % images.length) }

  return (
    <div className="gallery">
      {images.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Imágenes del producto">
          {images.map((im, k) => (
            <button key={im.id} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => { setI(k); setZoom(false) }} aria-label={`Imagen ${k + 1}`}>
              <Img src={im.image_url} variantes={im.variantes} sizes="76px" eager />
            </button>
          ))}
        </div>
      )}
      <div className={`gallery-main ${zoom ? 'zoom' : ''}`} style={images.length > 1 ? undefined : { gridColumn: '1 / -1' }}
        onClick={() => img && setZoom((z) => !z)}
        onMouseMove={(e) => {
          if (!zoom) return
          const r = e.currentTarget.getBoundingClientRect()
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
        }}>
        {img ? <Img key={img.id} src={img.image_url} variantes={img.variantes} alt={img.alt_text || nombre} eager
          sizes="(max-width: 960px) 100vw, 640px" style={{ transformOrigin: origin }} />
          : <Icon name="image" size={64} className="placeholder-img" />}
        {images.length > 1 && (
          <>
            <button className="icon-btn gallery-nav prev" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Imagen anterior"><Icon name="chevron-left" /></button>
            <button className="icon-btn gallery-nav next" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Imagen siguiente"><Icon name="chevron-right" /></button>
          </>
        )}
      </div>
    </div>
  )
}

function ProductView({ p, reload }) {
  const { user, isAdmin } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const { tienda, money, pais, paginaVisible } = useStore()
  const wish = useWishlist()
  const [varId, setVarId] = useState(null)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [tab, setTab] = useState('descripcion')

  const variante = p.variantes.find((v) => v.id === varId)
  const stock = variante ? variante.stock : p.stock
  const needsVariant = p.variantes.length > 0 && !variante
  const images = useMemo(() => [...(variante?.imagenes || []), ...p.imagenes], [p, variante])
  const ruta = p.categorias_ruta || []
  const specs = Array.isArray(p.especificaciones) ? p.especificaciones : []
  const isOwner = user && (isAdmin || p.user_id === user.id)
  const ship = shippingFacts(pais)
  const groups = useMemo(() => {
    const g = {}
    p.variantes.forEach((v) => { (g[v.nombre] ||= []).push(v) })
    return Object.entries(g)
  }, [p.variantes])

  // El JSON-LD (Product, Offer, BreadcrumbList) lo inserta el servidor en el HTML inicial
  usePageMeta({
    title: p.nombre, store: tienda.nombre, image: p.imagenes[0]?.image_url, canonical: productUrl(p),
    description: `${p.marca ? p.marca + ' ' : ''}${p.nombre} a ${money(p.precio)}. ${p.descripcion || ''}`,
  })
  useEffect(() => { if (p.estatus) rememberViewed(p) }, [p])

  const add = async (thenCheckout) => {
    if (!user) return navigate('/login', { state: { from: `/producto/${p.id}` } })
    if (needsVariant) { setMsg('Elige una opción antes de continuar'); return }
    setBusy(true); setMsg(null)
    try {
      await cart.add(p.id, varId, qty)
      if (thenCheckout) navigate('/checkout')
      else setMsg('ok')
    } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  const fav = wish.has(p.id)

  const disabled = busy || stock <= 0 || !p.estatus
  const tabs = [
    ['descripcion', 'Descripción', !!p.descripcion],
    ['specs', 'Especificaciones', specs.length > 0],
    ['compat', 'Compatibilidad', !!p.compatibilidad],
    ['resenas', `Reseñas${p.calificacion.total ? ` (${p.calificacion.total})` : ''}`, true],
  ].filter((t) => t[2])
  const activeTab = tabs.some((t) => t[0] === tab) ? tab : tabs[0][0]

  useEffect(() => {
    document.body.classList.add('has-sticky-buy')
    return () => document.body.classList.remove('has-sticky-buy')
  }, [])

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, ...(ruta.length ? ruta.map((c) => ({ label: c.nombre, to: categoryUrl(c) })) : [{ label: 'Catálogo', to: '/catalogo' }]), { label: p.nombre }]} />
      <div className="pdp">
        <Gallery images={images} nombre={p.nombre} />

        <div className="buybox">
          {!p.estatus && <div className="alert alert-warn"><Icon name="eye" size={18} />Producto inactivo: sólo lo ves tú como dueño o admin.</div>}
          <div className="stack" style={{ '--gap': '8px' }}>
            {p.marca && <Link to={brandUrl(p.marca)} className="eyebrow">{p.marca}</Link>}
            <h1>{p.nombre}</h1>
            <div className="meta-line">
              {p.calificacion.total > 0 && <button className="linklike" style={{ color: 'inherit' }} onClick={() => { setTab('resenas'); document.getElementById('info')?.scrollIntoView({ behavior: 'smooth' }) }}><Stars value={p.calificacion.promedio} count={p.calificacion.total} /></button>}
              {p.sku && <span>SKU: <span className="num">{p.sku}</span></span>}
              {variante?.id && <span>Opción: {variante.valor}</span>}
            </div>
          </div>

          <div className="stack" style={{ '--gap': '4px' }}>
            <Price precio={p.precio} precioAnterior={p.precio_anterior} extra={variante?.precio_extra || 0} size="lg" />
            {p.precio_anterior > p.precio && <span className="small" style={{ color: 'var(--deal)' }}>Ahorras {money(p.precio_anterior - p.precio)}</span>}
            <PriceIn amount={p.precio + (variante?.precio_extra || 0)} />
          </div>
          <div className="stack" style={{ '--gap': '4px' }}>
            <EarnBadge amount={(p.precio + (variante?.precio_extra || 0)) * qty} />
            <PointsInvite />
          </div>

          {groups.map(([nombre, vs]) => (
            <div key={nombre} className="option-group">
              <span className="label">{nombre}{variante?.nombre === nombre && <span className="muted">: {variante.valor}</span>}</span>
              <div className="options" role="radiogroup" aria-label={nombre}>
                {vs.map((v) => (
                  <button key={v.id} role="radio" aria-checked={v.id === varId} className={`option ${v.id === varId ? 'on' : ''}`} disabled={v.stock <= 0}
                    onClick={() => { setVarId(v.id === varId ? null : v.id); setQty(1); setMsg(null) }}
                    title={v.stock <= 0 ? 'Agotado' : undefined}>
                    {v.valor}{v.precio_extra > 0 && <span className="muted"> +{money(v.precio_extra)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <StockLine stock={needsVariant ? p.variantes.reduce((s, v) => s + v.stock, 0) : stock} />

          <div className="buy-actions">
            <QtyInput value={qty} onChange={setQty} max={Math.max(1, stock)} />
            <button className="btn btn-primary btn-lg" onClick={() => add(false)} disabled={disabled}>
              <Icon name="cart" size={18} />{stock <= 0 ? 'Agotado' : 'Agregar al carrito'}
            </button>
          </div>
          <div className="row" style={{ '--gap': '8px' }}>
            <button className="btn btn-dark grow" onClick={() => add(true)} disabled={disabled}>Comprar ahora</button>
            <button className={`btn ${fav ? 'btn-danger' : ''}`} onClick={() => wish.toggle(p)} aria-pressed={fav}>
              <Icon name="heart" size={18} />{fav ? 'En favoritos' : 'Favorito'}
            </button>
          </div>
          {msg === 'ok' && <div className="alert alert-ok"><Icon name="check" size={18} /><span className="grow">Agregado al carrito.</span><Link className="link" to="/carrito">Ver carrito</Link></div>}
          {msg && msg !== 'ok' && <div className="alert alert-bad" role="alert"><Icon name="alert" size={18} />{msg}</div>}

          {stock <= 0 && p.estatus && !needsVariant && (
            <BackInStock productId={p.id} varianteId={variante?.id} />
          )}

          <div className="trust-list">
            {ship.metodos.length > 0 ? (
              <div className="trust-item"><Icon name="truck" />
                <div>
                  <strong>Despacho a {pais.nombre}</strong>
                  {ship.metodos.map((m) => (
                    <div key={m.id} className="muted">
                      {m.nombre}: {m.precio === 0 ? 'gratis' : money(m.precio)}
                      {m.gratis_desde != null && m.precio > 0 && ` · gratis desde ${money(m.gratis_desde)}`}
                      {m.plazo && ` · ${m.plazo}`}
                    </div>
                  ))}
                </div>
              </div>
            ) : pais && (
              <div className="trust-item"><Icon name="truck" /><div><strong>Despacho a {pais.nombre}</strong><div className="muted">El costo de envío se coordina después de la compra.</div></div></div>
            )}
            {(p.garantia_meses != null || paginaVisible('garantia')) && (
              <div className="trust-item"><Icon name="shield" />
                <div>
                  <strong>{p.garantia_meses ? `Garantía de ${p.garantia_meses} ${p.garantia_meses === 1 ? 'mes' : 'meses'}` : p.garantia_meses === 0 ? 'Sin garantía del fabricante' : 'Garantía'}</strong>
                  {paginaVisible('garantia') && <div><Link className="link" to="/p/garantia">Ver condiciones</Link></div>}
                </div>
              </div>
            )}
            {paginaVisible('devoluciones') && (
              <div className="trust-item"><Icon name="refresh" /><div><strong>Cambios y devoluciones</strong><div><Link className="link" to="/p/devoluciones">Ver política</Link></div></div></div>
            )}
          </div>

          {isOwner && <Link className="btn btn-sm" style={{ alignSelf: 'start' }} to={`/vendedor/editar/${p.id}`}><Icon name="edit" size={16} />Editar producto</Link>}
        </div>
      </div>

      <section id="info" className="section">
        <div className="tabs" role="tablist">
          {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={activeTab === k} className={activeTab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}
        </div>
        <div className="card flat" style={{ borderRadius: '0 0 var(--r) var(--r)' }} role="tabpanel">
          {activeTab === 'descripcion' && <div className="prose pre-line">{p.descripcion}</div>}
          {activeTab === 'specs' && (
            <div className="table-wrap">
              <table className="spec-table"><tbody>
                {specs.map((s) => <tr key={s.nombre}><th scope="row">{s.nombre}</th><td>{s.valor}</td></tr>)}
              </tbody></table>
            </div>
          )}
          {activeTab === 'compat' && <div className="prose pre-line">{p.compatibilidad}</div>}
          {activeTab === 'resenas' && <Reviews producto={p} onChange={reload} />}
        </div>
      </section>

      <Complements id={p.id} />
      <Related id={p.id} />

      <div className="sticky-buy" aria-hidden={false}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="small strong" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
          <Price precio={p.precio} precioAnterior={p.precio_anterior} extra={variante?.precio_extra || 0} />
        </div>
        <button className="btn btn-primary" onClick={() => (needsVariant ? window.scrollTo({ top: 0, behavior: 'smooth' }) : add(false))} disabled={disabled}>
          {stock <= 0 ? 'Agotado' : needsVariant ? 'Elegir opción' : 'Agregar'}
        </button>
      </div>
    </>
  )
}

function Complements({ id }) {
  const { data } = useFetch(() => get(`/productos/${id}/complementos`), [id])
  return (
    <>
      {data?.sugeridos?.length > 0 && (
        <section className="section" aria-labelledby="complementos">
          <div className="section-head"><div><div className="eyebrow">Recomendado por la tienda</div><h2 id="complementos">Completa tu compra</h2></div></div>
          <ProductGrid rail items={data.sugeridos} />
        </section>
      )}
      {data?.comprados_juntos?.length > 0 && (
        <section className="section" aria-labelledby="juntos">
          <div className="section-head"><div><div className="eyebrow">Según pedidos reales</div><h2 id="juntos">Se compran frecuentemente juntos</h2></div></div>
          <ProductGrid rail items={data.comprados_juntos} />
        </section>
      )}
    </>
  )
}

function Related({ id }) {
  const { data, loading } = useFetch(() => get(`/productos/${id}/relacionados`, { limit: 10 }), [id])
  if (!loading && !data?.length) return null
  return (
    <section className="section" aria-labelledby="related">
      <div className="section-head"><h2 id="related">También te puede interesar</h2></div>
      <ProductGrid rail items={data} loading={loading} count={5} />
    </section>
  )
}

function Reviews({ producto, onChange }) {
  const { user, isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const list = useFetch(() => get(`/productos/${producto.id}/resenas`, { page, per_page: 5 }), [producto.id, page])
  const mine = list.data?.items.find((r) => r.user_id === user?.id)
  const [cal, setCal] = useState(5)
  const [com, setCom] = useState('')
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      if (editing && mine) await put(`/resenas/${mine.id}`, { calificacion: cal, comentario: com })
      else await post(`/productos/${producto.id}/resenas`, { calificacion: cal, comentario: com })
      setCom(''); setEditing(false); list.reload(); onChange()
    } catch (err) { setMsg(err.message) }
  }
  const remove = async (r) => {
    try { await del(`/resenas/${r.id}`); list.reload(); onChange() } catch (err) { setMsg(err.message) }
  }

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      {producto.calificacion.total > 0 && (
        <div className="row"><span style={{ fontSize: '2.2rem', fontWeight: 800 }}>{Number(producto.calificacion.promedio).toFixed(1)}</span><Stars value={producto.calificacion.promedio} /><span className="muted small">{producto.calificacion.total} reseña{producto.calificacion.total === 1 ? '' : 's'} de compradores</span></div>
      )}
      {user && (!mine || editing) && (
        <form className="panel form" onSubmit={submit}>
          <strong>{editing ? 'Editar tu reseña' : '¿Compraste este producto? Cuéntanos qué te pareció'}</strong>
          <StarInput value={cal} onChange={setCal} />
          <label className="field"><span className="sr-only">Comentario</span>
            <textarea value={com} onChange={(e) => setCom(e.target.value)} placeholder="Tu experiencia ayuda a otros compradores" maxLength={5000} />
          </label>
          {msg && <div className="alert alert-bad"><Icon name="alert" size={18} />{msg}</div>}
          <div className="row">
            <button className="btn btn-dark">{editing ? 'Guardar' : 'Publicar reseña'}</button>
            {editing && <button type="button" className="btn" onClick={() => setEditing(false)}>Cancelar</button>}
            {!editing && <span className="xs muted">Sólo pueden reseñar quienes compraron el producto.</span>}
          </div>
        </form>
      )}
      {list.data?.items.length === 0 && <p className="muted">Este producto todavía no tiene reseñas.</p>}
      {list.data?.items.map((r) => (
        <article key={r.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
          <div className="row between">
            <Stars value={r.calificacion} />
            <span className="xs muted">{r.user_id === user?.id ? 'Tu reseña · ' : 'Compra verificada · '}{date(r.created_at)}</span>
          </div>
          {r.comentario && <p style={{ margin: '8px 0 0' }}>{r.comentario}</p>}
          {(r.user_id === user?.id || isAdmin) && (
            <div className="row" style={{ marginTop: 8, '--gap': '8px' }}>
              {r.user_id === user?.id && <button className="btn btn-sm" onClick={() => { setEditing(true); setCal(r.calificacion); setCom(r.comentario || '') }}>Editar</button>}
              <ConfirmButton onConfirm={() => remove(r)}>Eliminar</ConfirmButton>
            </div>
          )}
        </article>
      ))}
      <Pagination page={page} totalPages={list.data?.total_pages} onChange={setPage} />
    </div>
  )
}

/** "Avísame cuando vuelva": notifica al cliente por correo al reponer stock. */
function BackInStock({ productId, varianteId }) {
  const { user } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await post(`/productos/${productId}/avisar-stock`, { email: email.trim(), variante_id: varianteId })
      setSent(true)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  if (sent) return (
    <div className="alert alert-ok"><Icon name="check" size={18} /><span>Listo. Te escribiremos a <b>{email}</b> cuando vuelva a estar disponible.</span></div>
  )
  return (
    <form className="panel stack" style={{ '--gap': '8px' }} onSubmit={submit}>
      <strong className="small row" style={{ '--gap': '6px' }}><Icon name="mail" size={16} />Avísame cuando vuelva</strong>
      <p className="xs muted" style={{ margin: 0 }}>Déjanos tu correo y te avisamos apenas haya stock de nuevo.</p>
      <div className="inline-form">
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
        <button className="btn btn-dark" disabled={busy}>{busy ? 'Enviando…' : 'Avísame'}</button>
      </div>
      {err && <span className="xs" style={{ color: 'var(--bad)' }}>{err}</span>}
    </form>
  )
}
