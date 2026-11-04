import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api'
import Benefits from '../components/Benefits'
import Icon, { categoryIcon } from '../components/Icon'
import Img from '../components/Img'
import Newsletter from '../components/Newsletter'
import Price from '../components/Price'
import { ProductGrid } from '../components/ProductCard'
import { Skeleton } from '../components/ui'
import { useFetch } from '../hooks'
import { brandUrl, categoryUrl, productUrl, useCategoryTree, viewedHistory } from '../lib/catalog'
import { usePageMeta } from '../seo'
import { useStore } from '../store'
import { discountPct } from '../utils'

function Section({ id, eyebrow, title, to, toLabel = 'Ver todo', children }) {
  return (
    <section className="section" aria-labelledby={id}>
      <div className="section-head">
        <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2 id={id}>{title}</h2></div>
        {to && <Link className="link small row" style={{ '--gap': '4px' }} to={to}>{toLabel} <Icon name="arrow-right" size={16} /></Link>}
      </div>
      {children}
    </section>
  )
}

/** Carrusel de productos: no se muestra si no hay datos reales. */
function Rail({ id, title, eyebrow, to, fetcher, deps = [] }) {
  const { data, loading } = useFetch(fetcher, deps)
  const items = Array.isArray(data) ? data : data?.items
  if (!loading && !items?.length) return null
  return <Section id={id} eyebrow={eyebrow} title={title} to={to}><ProductGrid rail items={items} loading={loading} count={5} /></Section>
}

const isExternal = (url) => /^https?:\/\//.test(url || '')
function BannerLink({ b, className, children }) {
  if (!b.enlace) return <div className={className}>{children}</div>
  return isExternal(b.enlace)
    ? <a href={b.enlace} className={className} rel="noopener">{children}</a>
    : <Link to={b.enlace} className={className}>{children}</Link>
}

function HeroBanners({ banners }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (banners.length < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 6500)
    return () => clearInterval(t)
  }, [banners.length, paused])
  const b = banners[i]
  return (
    <section aria-roledescription="carrusel" aria-label="Promociones destacadas" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
      <BannerLink b={b} className={`banner-hero ${b.tema} ${b.imagen_url ? 'has-img' : ''}`}>
        {b.imagen_url && (
          <picture>
            {b.imagen_movil_url && <source media="(max-width: 640px)" srcSet={b.imagen_movil_url} />}
            <Img src={b.imagen_url} variantes={b.imagen_variantes} alt="" className="bg" eager={i === 0} sizes="100vw" />
          </picture>
        )}
        <div className="banner-copy">
          <h1>{b.titulo}</h1>
          {b.subtitulo && <p style={{ fontSize: 'var(--fs-lg)', margin: '0 0 22px' }}>{b.subtitulo}</p>}
          {b.enlace && <span className={`btn btn-lg ${b.tema === 'oscuro' || b.imagen_url ? 'btn-primary' : 'btn-dark'}`}>{b.texto_boton || 'Ver más'} <Icon name="arrow-right" size={18} /></span>}
        </div>
      </BannerLink>
      {banners.length > 1 && (
        <div className="banner-dots" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', justifyContent: 'center', marginTop: 12 }}>
          {banners.map((x, k) => <button key={x.id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Ver promoción ${k + 1}: ${x.titulo}`} aria-current={k === i} />)}
        </div>
      )}
    </section>
  )
}

/** Si no hay banners, el héroe muestra un producto destacado real. */
function FeaturedHero() {
  const { tienda } = useStore()
  const { data, loading } = useFetch(() => get('/productos', { destacado: true, per_page: 1, en_stock: true }), [])
  const p = data?.items?.[0]
  if (loading) return <div className="hero"><div className="stack"><Skeleton w="30%" h={12} /><Skeleton h={48} /><Skeleton w="70%" h={20} /><Skeleton w={180} h={52} r={999} /></div><Skeleton h="auto" style={{ aspectRatio: '1/1', maxHeight: 380 }} r={18} /></div>
  if (!p) {
    return (
      <section className="hero" style={{ gridTemplateColumns: '1fr' }}>
        <div>
          <div className="eyebrow">{tienda.nombre}</div>
          <h1>Tecnología que trabaja tan rápido como tú.</h1>
          {tienda.descripcion && <p>{tienda.descripcion}</p>}
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn btn-dark btn-lg" to="/catalogo">Explorar catálogo <Icon name="arrow-right" size={18} /></Link>
            <Link className="btn btn-lg" to="/ofertas">Ver ofertas</Link>
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="hero" aria-label="Producto destacado">
      <div>
        <span className="eyebrow">{discountPct(p) > 0 ? 'Destacado · en oferta' : 'Destacado'}</span>
        {p.marca && <div className="strong muted" style={{ marginTop: 10 }}>{p.marca}</div>}
        <h1>{p.nombre}</h1>
        {p.descripcion && <p>{p.descripcion.length > 160 ? p.descripcion.slice(0, 157) + '…' : p.descripcion}</p>}
        <div className="hero-price"><Price precio={p.precio} precioAnterior={p.precio_anterior} size="lg" /></div>
        <div className="row">
          <Link className="btn btn-dark btn-lg" to={productUrl(p)}>Ver producto <Icon name="arrow-right" size={18} /></Link>
          <Link className="btn btn-lg" to="/catalogo">Explorar catálogo</Link>
        </div>
      </div>
      <Link to={productUrl(p)} className="hero-media" tabIndex={-1} aria-hidden>
        <div className="pcard-media-inner"><Img src={p.imagen_principal} variantes={p.imagen_variantes} alt={p.nombre} eager sizes="(max-width: 860px) 90vw, 520px" /></div>
      </Link>
    </section>
  )
}

function Categories() {
  const { tree } = useCategoryTree()
  if (!tree.roots.length) return null
  return (
    <Section id="cats" title="Compra por categoría" to="/catalogo" toLabel="Ver catálogo">
      <div className="cat-grid">
        {tree.roots.map((c) => (
          <Link key={c.id} to={categoryUrl(c)} className="cat-tile">
            <span className="benefit-icon"><Icon name={c.icono || categoryIcon(c.nombre)} /></span>
            <span><strong>{c.nombre}</strong>{c.children.length > 0 && <span className="xs muted" style={{ display: 'block' }}>{c.children.slice(0, 3).map((x) => x.nombre).join(' · ')}</span>}</span>
          </Link>
        ))}
      </div>
    </Section>
  )
}

function Brands() {
  const { data } = useFetch(() => get('/productos/facetas'), [])
  if (!data?.marcas?.length) return null
  return (
    <Section id="brands" title="Marcas destacadas">
      <div className="brand-row">
        {data.marcas.slice(0, 16).map((m) => <Link key={m.marca} className="brand-chip" to={brandUrl(m.marca, m.slug)}>{m.marca}<small>{m.total}</small></Link>)}
      </div>
    </Section>
  )
}

/** Recomendaciones según lo visto en este navegador (sin datos inventados). */
function Recommended() {
  const seen = viewedHistory()
  const counts = {}
  seen.forEach((v) => { if (v.categoria_id) counts[v.categoria_id] = (counts[v.categoria_id] || 0) + 1 })
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const { data } = useFetch(() => top ? get('/productos', { categoria_id: top, per_page: 12, orden: 'mas_vendidos', en_stock: true }) : Promise.resolve(null), [top])
  const seenIds = new Set(seen.map((v) => v.id))
  const items = data?.items?.filter((p) => !seenIds.has(p.id)).slice(0, 10)
  if (!items?.length) return null
  return <Section id="reco" eyebrow="Para ti" title="Inspirado en lo que viste"><ProductGrid rail items={items} /></Section>
}

function Promos({ banners }) {
  if (!banners.length) return null
  return (
    <Section id="promos" eyebrow="Promociones" title="Promociones especiales">
      <div className="promo-grid">
        {banners.map((b) => (
          <BannerLink key={b.id} b={b} className={`promo-card ${b.tema} ${b.imagen_url ? 'has-img' : ''}`}>
            {b.imagen_url && <Img src={b.imagen_url} variantes={b.imagen_variantes} alt="" sizes="(max-width: 700px) 100vw, 420px" />}
            <div>
              <h3 style={{ fontSize: 'var(--fs-xl)' }}>{b.titulo}</h3>
              {b.subtitulo && <p className="small" style={{ margin: '6px 0 0', opacity: .85 }}>{b.subtitulo}</p>}
              {b.enlace && <span className="small strong row" style={{ '--gap': '4px', marginTop: 10 }}>{b.texto_boton || 'Ver promoción'} <Icon name="arrow-right" size={16} /></span>}
            </div>
          </BannerLink>
        ))}
      </div>
    </Section>
  )
}

export default function Home() {
  const { tienda } = useStore()
  usePageMeta({ store: tienda.nombre, canonical: '/', description: tienda.descripcion || `${tienda.nombre}: tienda de tecnología y electrónica en Chile.` })
  const banners = useFetch(() => get('/banners'), [])
  const hero = (banners.data || []).filter((b) => b.ubicacion === 'hero')
  const promos = (banners.data || []).filter((b) => b.ubicacion === 'promo')

  return (
    <>
      {banners.loading ? <Skeleton h={360} r={18} /> : hero.length ? <HeroBanners banners={hero} /> : <FeaturedHero />}
      <div style={{ marginTop: 16 }}><Benefits /></div>
      <Rail id="ofertas" title="Ofertas destacadas" eyebrow="Precio rebajado" to="/ofertas" fetcher={() => get('/productos', { oferta: true, orden: 'descuento', per_page: 10 })} />
      <Rail id="top" title="Más vendidos" eyebrow="Lo que más se compra" to="/mas-vendidos" fetcher={() => get('/productos/mas-vendidos', { limit: 10 })} />
      <Rail id="nuevos" title="Recién llegados" eyebrow="Novedades" to="/novedades" fetcher={() => get('/productos', { orden: 'recientes', per_page: 10 })} />
      <Brands />
      <Recommended />
      <Promos banners={promos} />
      <Rail id="destacados" title="Selección de la tienda" eyebrow="Destacados" fetcher={() => get('/productos', { destacado: true, per_page: 10 })} />
      <Newsletter />
    </>
  )
}
