import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { get } from '../../api'
import { brandUrl, categoryUrl, useCategoryTree } from '../../lib/catalog'
import Icon, { categoryIcon } from '../Icon'

const brandCache = new Map()

/** Mega menú de escritorio: categorías → subcategorías + marcas de la categoría. */
export default function MegaMenu() {
  const { tree } = useCategoryTree()
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [brands, setBrands] = useState([])
  const location = useLocation()
  const closeTimer = useRef(null)
  const roots = tree.roots
  const active = roots.find((c) => c.id === activeId) || roots[0]

  useEffect(() => { setOpen(false) }, [location.pathname, location.search])
  useEffect(() => {
    if (!open || !active) return
    if (brandCache.has(active.id)) { setBrands(brandCache.get(active.id)); return }
    let alive = true
    get('/productos/facetas', { categoria: active.slug }).then((f) => {
      brandCache.set(active.id, f.marcas.slice(0, 10))
      if (alive) setBrands(f.marcas.slice(0, 10))
    }).catch(() => {})
    return () => { alive = false }
  }, [open, active])
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open])

  const enter = () => { clearTimeout(closeTimer.current); setOpen(true) }
  const leave = () => { closeTimer.current = setTimeout(() => setOpen(false), 160) }

  return (
    <div className="mega" onMouseEnter={enter} onMouseLeave={leave}>
      <button className={`mega-trigger ${open ? 'on' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <Icon name="menu" size={18} />Categorías<Icon name="chevron-down" size={14} />
      </button>
      {open && roots.length > 0 && (
        <div className="mega-panel" role="menu">
          <ul className="mega-roots">
            {roots.map((c) => (
              <li key={c.id}>
                <Link to={categoryUrl(c)} role="menuitem" className={c.id === active?.id ? 'on' : ''}
                  onMouseEnter={() => setActiveId(c.id)} onFocus={() => setActiveId(c.id)}>
                  <Icon name={c.icono || categoryIcon(c.nombre)} size={18} />
                  <span className="grow">{c.nombre}</span>
                  {c.children.length > 0 && <Icon name="chevron-right" size={14} />}
                </Link>
              </li>
            ))}
            <li className="mega-sep" />
            <li><Link to="/ofertas" role="menuitem" className="deal"><Icon name="tag" size={18} /><span className="grow">Ofertas</span></Link></li>
          </ul>
          {active && (
            <div className="mega-body">
              <div className="row between" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 'var(--fs-lg)' }}>{active.nombre}</h3>
                <Link className="link small" to={categoryUrl(active)}>Ver todo en {active.nombre} →</Link>
              </div>
              <div className="mega-cols">
                {active.children.length > 0 ? active.children.map((sub) => (
                  <div key={sub.id} className="mega-col">
                    <Link to={categoryUrl(sub)} className="mega-sub">{sub.nombre}</Link>
                    {sub.children.slice(0, 6).map((s2) => <Link key={s2.id} to={categoryUrl(s2)} className="mega-leaf">{s2.nombre}</Link>)}
                    {sub.children.length > 6 && <Link to={categoryUrl(sub)} className="mega-leaf link">Ver más</Link>}
                  </div>
                )) : <p className="muted small">Explora todos los productos de {active.nombre}.</p>}
              </div>
              {brands.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Marcas en {active.nombre}</div>
                  <div className="row" style={{ '--gap': '6px' }}>
                    {brands.map((m) => <Link key={m.marca} to={brandUrl(m.marca, m.slug)} className="chip">{m.marca}</Link>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
