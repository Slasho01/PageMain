import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { get } from '../../api'
import { brandUrl, categoryUrl, productUrl } from '../../lib/catalog'
import { useStore } from '../../store'
import Icon from '../Icon'

const RECENT_KEY = 'jarstore_busquedas'
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } }
const saveRecent = (q) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 6))) } catch { /* */ } }

/** Buscador con autocompletado (productos, categorías y marcas) accesible por teclado. */
export default function SearchBox({ id = 'q' }) {
  const [sp] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { money } = useStore()
  const listId = useId()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sug, setSug] = useState(null)
  const [active, setActive] = useState(-1)
  const [recent, setRecent] = useState(readRecent)
  const boxRef = useRef(null)
  const seq = useRef(0)

  useEffect(() => { if (location.pathname === '/buscar') setQ(sp.get('q') || '') }, [sp, location.pathname])
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Pedir sugerencias con un pequeño retardo mientras se escribe
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setSug(null); return }
    const n = ++seq.current
    const t = setTimeout(() => {
      get('/buscar/sugerencias', { q: term }).then((r) => n === seq.current && setSug(r)).catch(() => {})
    }, 180)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!open) return
    const close = (e) => !boxRef.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  // Opciones navegables con el teclado
  const options = []
  if (q.trim().length < 2) recent.forEach((r) => options.push({ kind: 'recent', label: r, to: `/buscar?q=${encodeURIComponent(r)}` }))
  else if (sug) {
    sug.categorias.forEach((c) => options.push({ kind: 'cat', label: c.nombre, to: categoryUrl(c) }))
    sug.marcas.forEach((m) => options.push({ kind: 'brand', label: m, to: brandUrl(m) }))
    sug.productos.forEach((p) => options.push({ kind: 'product', p, label: p.nombre, to: productUrl(p) }))
    options.push({ kind: 'all', label: `Ver todos los resultados para “${q.trim()}”`, to: `/buscar?q=${encodeURIComponent(q.trim())}` })
  }

  const go = (to, term) => {
    if (term) { saveRecent(term); setRecent(readRecent()) }
    setOpen(false); setActive(-1)
    navigate(to)
  }
  const submit = (e) => {
    e.preventDefault()
    if (active >= 0 && options[active]) return go(options[active].to, q.trim() || options[active].label)
    const term = q.trim()
    go(term ? `/buscar?q=${encodeURIComponent(term)}` : '/catalogo', term)
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  const show = open && options.length > 0
  const group = (kind) => options.map((o, i) => ({ ...o, i })).filter((o) => o.kind === kind)
  const item = (o, children) => (
    <li key={o.i} id={`${listId}-${o.i}`} role="option" aria-selected={active === o.i}>
      <Link to={o.to} className={`sug-item ${active === o.i ? 'on' : ''}`} onMouseEnter={() => setActive(o.i)}
        onClick={(e) => { e.preventDefault(); go(o.to, o.kind === 'recent' ? o.label : q.trim()) }}>{children}</Link>
    </li>
  )

  return (
    <div className="search-wrap" ref={boxRef}>
      <form className="search" role="search" onSubmit={submit}>
        <Icon name="search" size={18} className="search-icon" />
        <label className="sr-only" htmlFor={id}>Buscar productos, marcas y categorías</label>
        <input id={id} type="search" value={q} autoComplete="off" enterKeyHint="search"
          placeholder="Busca notebooks, audífonos, marcas…"
          role="combobox" aria-expanded={show} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => setOpen(true)} onKeyDown={onKey} />
        <button type="submit" aria-label="Buscar"><Icon name="arrow-right" size={16} /></button>
      </form>
      {show && (
        <div className="sug-panel">
          <ul id={listId} role="listbox" aria-label="Sugerencias">
            {group('recent').length > 0 && <li className="sug-head" role="presentation">Búsquedas recientes</li>}
            {group('recent').map((o) => item(o, <><Icon name="clock" size={16} /><span>{o.label}</span></>))}
            {group('cat').length > 0 && <li className="sug-head" role="presentation">Categorías</li>}
            {group('cat').map((o) => item(o, <><Icon name="grid" size={16} /><span>{o.label}</span></>))}
            {group('brand').length > 0 && <li className="sug-head" role="presentation">Marcas</li>}
            {group('brand').map((o) => item(o, <><Icon name="tag" size={16} /><span>{o.label}</span></>))}
            {group('product').length > 0 && <li className="sug-head" role="presentation">Productos</li>}
            {group('product').map((o) => item(o, (
              <>
                <span className="sug-thumb">{o.p.imagen ? <img src={o.p.imagen} alt="" /> : <Icon name="image" size={16} />}</span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="sug-name">{o.p.nombre}</span>
                  {o.p.marca && <span className="xs muted">{o.p.marca}</span>}
                </span>
                <span className={`small strong num ${o.p.precio_anterior > o.p.precio ? 'price-now deal' : ''}`}>{money(o.p.precio)}</span>
              </>
            )))}
            {group('all').map((o) => item(o, <><Icon name="search" size={16} /><span className="strong">{o.label}</span></>))}
          </ul>
          {sug && !sug.productos.length && !sug.categorias.length && !sug.marcas.length && (
            <p className="small muted" style={{ padding: '4px 14px 12px', margin: 0 }}>Sin coincidencias directas. Presiona Enter para buscar en todo el catálogo.</p>
          )}
        </div>
      )}
    </div>
  )
}
