import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { get } from '../api'
import Icon from '../components/Icon'
import { ProductGrid } from '../components/ProductCard'
import { Breadcrumbs, Drawer, Empty, ErrorBox, Pagination, Stars } from '../components/ui'
import { useFetch } from '../hooks'
import { categoryUrl, useCategoryTree } from '../lib/catalog'
import { SimpleText } from './Policy'
import { usePageMeta } from '../seo'
import { useStore } from '../store'

const PER_PAGE = 24
const parseSpecs = (raw) => { try { return raw ? JSON.parse(raw) : {} } catch { return {} } }

/** Modos del catálogo según la ruta. */
const MODES = {
  '/ofertas': { title: 'Ofertas', fixed: { oferta: 'true' }, orden: 'descuento', desc: 'Productos con precio rebajado respecto a su precio anterior.' },
  '/novedades': { title: 'Novedades', fixed: {}, orden: 'recientes', desc: 'Los últimos productos incorporados al catálogo.' },
  '/mas-vendidos': { title: 'Más vendidos', fixed: {}, orden: 'mas_vendidos', desc: 'Lo que más compran nuestros clientes.' },
}

export default function Catalog() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const [sp, setSp] = useSearchParams()
  const { tienda, money, moneda, displayToBase, baseToDisplay } = useStore()
  const { tree } = useCategoryTree()
  const [drawer, setDrawer] = useState(false)
  const navigate = useNavigate()

  const kind = pathname.startsWith('/categoria/') ? 'categoria' : pathname.startsWith('/marca/') ? 'marca' : pathname === '/buscar' ? 'buscar' : 'catalogo'
  const mode = MODES[pathname]
  const params = Object.fromEntries(sp.entries())
  const page = Number(params.page || 1)
  const q = kind === 'buscar' ? (params.q || '') : ''
  const marcas = (params.marca || '').split(',').filter(Boolean)
  const specs = parseSpecs(params.specs)

  // URLs antiguas (?categoria_id= / ?q= en /catalogo) => URL amigable
  useEffect(() => {
    if (pathname !== '/catalogo') return
    const legacyCat = sp.get('categoria_id') && tree.byId.get(sp.get('categoria_id'))
    if (legacyCat) navigate(categoryUrl(legacyCat), { replace: true })
    else if (sp.get('q')) navigate(`/buscar?q=${encodeURIComponent(sp.get('q'))}`, { replace: true })
  }, [pathname, sp, tree, navigate])

  // Contexto de la ruta (categoría o marca)
  const ctx = useFetch(() => kind === 'categoria' ? get(`/categorias/${slug}`) : kind === 'marca' ? get(`/marcas/${slug}`) : Promise.resolve(null), [kind, slug])
  const categoria = kind === 'categoria' ? ctx.data?.categoria : null
  const marcaPagina = kind === 'marca' ? ctx.data : null

  const apiParams = {
    ...params, ...(mode?.fixed || {}),
    orden: params.orden || mode?.orden,
    q: q || undefined,
    categoria: categoria?.slug,
    marca_slug: kind === 'marca' ? slug : undefined,
    per_page: PER_PAGE,
  }
  const ready = kind === 'catalogo' || kind === 'buscar' || ctx.data
  const productos = useFetch(() => ready ? get('/productos', apiParams) : Promise.resolve(null), [sp.toString(), kind, slug, categoria?.slug, !!marcaPagina, pathname])
  const facetas = useFetch(() => ready ? get('/productos/facetas', { categoria: categoria?.slug, q: q || undefined }) : Promise.resolve(null), [categoria?.slug, q, ready])

  const update = (changes, keepPage = false) => {
    const next = new URLSearchParams(sp)
    Object.entries(changes).forEach(([k, v]) => (v === '' || v == null || v === false ? next.delete(k) : next.set(k, String(v))))
    if (!keepPage) next.delete('page')
    setSp(next)
  }
  const clearAll = () => setSp(q ? { q } : {})
  const toggleMarca = (m) => {
    const has = marcas.some((x) => x.toLowerCase() === m.toLowerCase())
    update({ marca: (has ? marcas.filter((x) => x.toLowerCase() !== m.toLowerCase()) : [...marcas, m]).join(',') })
  }
  const toggleSpec = (nombre, valor) => {
    const cur = new Set(specs[nombre] || [])
    cur.has(valor) ? cur.delete(valor) : cur.add(valor)
    const next = { ...specs, [nombre]: [...cur] }
    if (!next[nombre].length) delete next[nombre]
    update({ specs: Object.keys(next).length ? JSON.stringify(next) : '' })
  }

  const chips = useMemo(() => {
    const c = []
    marcas.forEach((m) => c.push({ label: m, onClear: () => toggleMarca(m) }))
    Object.entries(specs).forEach(([n, vs]) => vs.forEach((v) => c.push({ label: `${n}: ${v}`, onClear: () => toggleSpec(n, v) })))
    if (params.min_precio) c.push({ label: `Desde ${money(Number(params.min_precio))}`, clear: { min_precio: '' } })
    if (params.max_precio) c.push({ label: `Hasta ${money(Number(params.max_precio))}`, clear: { max_precio: '' } })
    if (params.en_stock) c.push({ label: 'Con stock', clear: { en_stock: '' } })
    if (params.oferta && !mode?.fixed.oferta) c.push({ label: 'En oferta', clear: { oferta: '' } })
    if (params.valoracion) c.push({ label: `${params.valoracion}★ o más`, clear: { valoracion: '' } })
    return c
  }, [sp.toString(), money]) // eslint-disable-line react-hooks/exhaustive-deps

  // Encabezado, breadcrumbs y SEO
  const ruta = ctx.data?.ruta || []
  const title = kind === 'buscar' ? (q ? `Resultados para “${q}”` : 'Buscar')
    : categoria?.nombre || marcaPagina?.marca || mode?.title || 'Catálogo'
  const crumbs = [{ label: 'Inicio', to: '/' },
    ...(kind === 'categoria' ? ruta.map((c) => ({ label: c.nombre, to: categoryUrl(c) })) : kind === 'marca' ? [{ label: 'Marcas', to: '/catalogo' }] : []),
    { label: title }]
  const filtered = chips.length > 0 || !!params.orden
  usePageMeta({
    title: page > 1 ? `${title} - Página ${page}` : title,
    store: tienda.nombre,
    description: categoria?.descripcion || mode?.desc || (marcaPagina ? `Productos ${marcaPagina.marca} en ${tienda.nombre}.` : `${title} en ${tienda.nombre}.`),
    canonical: kind === 'buscar' ? undefined : `${pathname}${page > 1 ? `?page=${page}` : ''}`,
    noindex: kind === 'buscar' || filtered,
  })

  if (ctx.error) {
    return <Empty icon="search" title={kind === 'marca' ? 'Marca no encontrada' : 'Categoría no encontrada'} action={<Link className="btn btn-dark" to="/catalogo">Ver catálogo</Link>} />
  }

  const ORDENES = [
    ...(q ? [['relevancia', 'Más relevantes']] : []),
    ['mas_vendidos', 'Más vendidos'], ['recientes', 'Novedades'], ['precio_asc', 'Menor precio'], ['precio_desc', 'Mayor precio'], ['descuento', 'Mayor descuento'],
  ]
  const ordenActual = params.orden || mode?.orden || (q ? 'relevancia' : 'recientes')
  const filters = (
    <Filters params={params} facetas={facetas.data} marcas={marcas} specs={specs} update={update} toggleMarca={toggleMarca} toggleSpec={toggleSpec}
      moneda={moneda} displayToBase={displayToBase} baseToDisplay={baseToDisplay} hideBrands={kind === 'marca'}
      categoria={categoria} tree={tree} hideOferta={!!mode?.fixed.oferta} />
  )

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <div className="catalog">
        <aside className="filters filters-desktop" aria-label="Filtros">{filters}</aside>
        <section aria-labelledby="catalog-title">
          <div className="toolbar">
            <div>
              <h1 id="catalog-title" className="page-title">{title}</h1>
              <span className="muted small" aria-live="polite">{productos.data ? `${productos.data.total} producto${productos.data.total === 1 ? '' : 's'}` : ' '}</span>
            </div>
            <label className="row" style={{ '--gap': '8px' }}>
              <span className="small muted">Ordenar por</span>
              <select className="select" style={{ width: 'auto', minHeight: 40 }} value={ordenActual}
                onChange={(e) => update({ orden: e.target.value === (mode?.orden || (q ? 'relevancia' : 'recientes')) ? '' : e.target.value })}>
                {ORDENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>

          {facetas.data?.subcategorias?.length > 0 && kind !== 'marca' && (
            <nav className="chips" aria-label="Subcategorías">
              {facetas.data.subcategorias.map((c) => (
                <Link key={c.id} to={categoryUrl(c)} className="chip" style={{ paddingRight: 12 }}>{c.nombre} <span className="muted">{c.total}</span></Link>
              ))}
            </nav>
          )}

          {chips.length > 0 && (
            <div className="chips">
              {chips.map((c, i) => (
                <button key={i} className="chip" onClick={() => (c.onClear ? c.onClear() : update(c.clear))} aria-label={`Quitar filtro ${c.label}`}>{c.label}<Icon name="x" size={14} /></button>
              ))}
              <button className="linklike small" onClick={clearAll}>Limpiar filtros</button>
            </div>
          )}

          <ErrorBox error={productos.error} onRetry={productos.reload} />
          {!productos.loading && productos.data?.items.length === 0 ? (
            <Empty icon="search" title={q ? `Sin resultados para “${q}”` : 'No encontramos productos'}
              action={<Link className="btn btn-dark" to="/catalogo">Ver todo el catálogo</Link>}>
              {chips.length ? 'Prueba quitando algunos filtros.' : 'Revisa la ortografía o usa términos más generales.'}
            </Empty>
          ) : <ProductGrid items={productos.data?.items} loading={productos.loading || !ready} count={12} priorityCount={4} />}
          <Pagination page={page} totalPages={productos.data?.total_pages}
            onChange={(n) => { update({ page: n === 1 ? '' : n }, true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />

          {categoria?.descripcion && page === 1 && (
            <section className="card prose" style={{ marginTop: 40, maxWidth: 'none' }} aria-label={`Sobre ${categoria.nombre}`}>
              <SimpleText text={categoria.descripcion} />
            </section>
          )}
        </section>
      </div>

      <button className="btn btn-dark btn-lg filter-fab" onClick={() => setDrawer(true)}>
        <Icon name="sliders" size={18} /> Filtrar{chips.length > 0 && ` (${chips.length})`}
      </button>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filtros"
        footer={<>
          <button className="btn grow" onClick={clearAll}>Limpiar</button>
          <button className="btn btn-dark grow" onClick={() => setDrawer(false)}>Ver {productos.data?.total ?? ''} resultados</button>
        </>}>
        {filters}
      </Drawer>
    </>
  )
}

function Group({ title, children, open = true }) {
  return (
    <details className="filter-group" open={open}>
      <summary>{title}<Icon name="chevron-down" size={16} /></summary>
      <div className="filter-options">{children}</div>
    </details>
  )
}

function Filters({ params, facetas, marcas, specs, update, toggleMarca, toggleSpec, moneda, displayToBase, baseToDisplay, hideBrands, categoria, tree, hideOferta }) {
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  useEffect(() => {
    setMin(params.min_precio ? baseToDisplay(Number(params.min_precio)) : '')
    setMax(params.max_precio ? baseToDisplay(Number(params.max_precio)) : '')
  }, [params.min_precio, params.max_precio, moneda.codigo]) // eslint-disable-line react-hooks/exhaustive-deps
  const applyPrice = (e) => { e.preventDefault(); update({ min_precio: min === '' ? '' : displayToBase(min), max_precio: max === '' ? '' : displayToBase(max) }) }
  const marcaOn = (m) => marcas.some((x) => x.toLowerCase() === m.toLowerCase())
  const parent = categoria?.parent_id ? tree.byId.get(categoria.parent_id) : null
  const siblings = categoria ? (parent ? parent.children : tree.roots) : tree.roots

  return (
    <div>
      <Group title="Categorías">
        {categoria && parent && <Link className="cat-link" to={categoryUrl(parent)}>← {parent.nombre}</Link>}
        {!categoria && <span className="cat-link on">Todas</span>}
        {siblings.map((c) => (
          <Link key={c.id} to={categoryUrl(c)} className={`cat-link ${categoria?.id === c.id ? 'on' : ''}`}>{c.nombre}</Link>
        ))}
      </Group>

      {facetas?.marcas?.length > 0 && !hideBrands && (
        <Group title="Marca">
          {facetas.marcas.map((m) => (
            <label key={m.marca} className="check">
              <input type="checkbox" checked={marcaOn(m.marca)} onChange={() => toggleMarca(m.marca)} />
              <span>{m.marca}</span><span className="xs muted">{m.total}</span>
            </label>
          ))}
        </Group>
      )}

      <Group title={`Precio (${moneda.codigo})`}>
        <form onSubmit={applyPrice} className="stack" style={{ '--gap': '8px' }}>
          <div className="row nowrap" style={{ '--gap': '8px' }}>
            <input className="input" type="number" min="0" inputMode="decimal" placeholder={facetas?.precio?.min != null ? `Desde ${baseToDisplay(facetas.precio.min)}` : 'Mín.'} value={min} onChange={(e) => setMin(e.target.value)} aria-label="Precio mínimo" />
            <span className="muted">—</span>
            <input className="input" type="number" min="0" inputMode="decimal" placeholder={facetas?.precio?.max != null ? `Hasta ${baseToDisplay(facetas.precio.max)}` : 'Máx.'} value={max} onChange={(e) => setMax(e.target.value)} aria-label="Precio máximo" />
          </div>
          <button className="btn btn-sm">Aplicar precio</button>
        </form>
      </Group>

      <Group title="Disponibilidad">
        <label className="check"><input type="checkbox" checked={params.en_stock === 'true'} onChange={(e) => update({ en_stock: e.target.checked ? 'true' : '' })} /><span>Sólo con stock</span></label>
        {!hideOferta && <label className="check"><input type="checkbox" checked={params.oferta === 'true'} onChange={(e) => update({ oferta: e.target.checked ? 'true' : '' })} /><span>En oferta</span></label>}
      </Group>

      <Group title="Valoración" open={!!params.valoracion}>
        {[4, 3].map((v) => (
          <label key={v} className="check">
            <input type="radio" name="valoracion" checked={params.valoracion === String(v)} onChange={() => update({ valoracion: v })} />
            <span><Stars value={v} size={13} /> <span className="xs muted">o más</span></span>
          </label>
        ))}
        {params.valoracion && <button className="linklike xs" style={{ justifySelf: 'start' }} onClick={() => update({ valoracion: '' })}>Cualquier valoración</button>}
        <span className="xs muted">Sólo reseñas de compras verificadas.</span>
      </Group>

      {facetas?.caracteristicas?.map((c) => (
        <Group key={c.nombre} title={c.nombre} open={!!specs[c.nombre]}>
          {c.valores.map((v) => (
            <label key={v.valor} className="check">
              <input type="checkbox" checked={!!specs[c.nombre]?.includes(v.valor)} onChange={() => toggleSpec(c.nombre, v.valor)} />
              <span>{v.valor}</span><span className="xs muted">{v.total}</span>
            </label>
          ))}
        </Group>
      ))}
    </div>
  )
}
