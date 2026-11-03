import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import { categoryUrl, useCategoryTree } from '../../lib/catalog'
import { useStore } from '../../store'
import Icon, { categoryIcon } from '../Icon'
import { Drawer } from '../ui'

/** Menú lateral móvil con navegación jerárquica (entrar / volver). */
export default function MobileMenu({ open, onClose }) {
  const { tree } = useCategoryTree()
  const { user, isAdmin, isSeller, logout } = useAuth()
  const { monedas, moneda, setMoneda, paises, pais, setPais } = useStore()
  const navigate = useNavigate()
  const [stack, setStack] = useState([])
  useEffect(() => { if (!open) setStack([]) }, [open])
  const current = stack[stack.length - 1]
  const items = current ? current.children : tree.roots

  return (
    <Drawer open={open} onClose={onClose} title={current ? current.nombre : 'Menú'}>
      <div className="stack" style={{ '--gap': '20px' }}>
        {current && (
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'start', paddingLeft: 4 }} onClick={() => setStack((s) => s.slice(0, -1))}>
            <Icon name="chevron-left" size={16} />{stack.length > 1 ? stack[stack.length - 2].nombre : 'Todas las categorías'}
          </button>
        )}
        <nav className="drawer-nav" aria-label="Categorías">
          {current ? (
            <Link to={categoryUrl(current)} className="strong">Ver todo en {current.nombre}<Icon name="arrow-right" size={16} /></Link>
          ) : (
            <>
              <Link to="/catalogo" className="strong">Todo el catálogo<Icon name="chevron-right" size={16} /></Link>
              <Link to="/ofertas" style={{ color: 'var(--deal)' }}><span className="row" style={{ '--gap': '10px' }}><Icon name="tag" size={18} />Ofertas</span><Icon name="chevron-right" size={16} /></Link>
            </>
          )}
          {items.map((c) => c.children.length ? (
            <button key={c.id} type="button" className="drawer-link" onClick={() => setStack((s) => [...s, c])}>
              <span className="row" style={{ '--gap': '10px' }}>{!current && <Icon name={c.icono || categoryIcon(c.nombre)} size={18} />}{c.nombre}</span>
              <Icon name="chevron-right" size={16} />
            </button>
          ) : (
            <Link key={c.id} to={categoryUrl(c)}>
              <span className="row" style={{ '--gap': '10px' }}>{!current && <Icon name={c.icono || categoryIcon(c.nombre)} size={18} />}{c.nombre}</span>
            </Link>
          ))}
        </nav>

        {!current && (
          <>
            {(monedas.length > 1 || paises.length > 1) && (
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {paises.length > 1 && (
                  <label className="field"><span>Envío a</span>
                    <select value={pais?.codigo} onChange={(e) => setPais(e.target.value)}>{paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}</select>
                  </label>
                )}
                {monedas.length > 1 && (
                  <label className="field"><span>Moneda</span>
                    <select value={moneda.codigo} onChange={(e) => setMoneda(e.target.value)}>{monedas.map((m) => <option key={m.codigo} value={m.codigo}>{m.codigo}</option>)}</select>
                  </label>
                )}
              </div>
            )}
            <nav className="drawer-nav" aria-label="Cuenta">
              <div className="eyebrow" style={{ marginBottom: 4 }}>Mi cuenta</div>
              {user ? (
                <>
                  <Link to="/cuenta/pedidos">Mis pedidos<Icon name="chevron-right" size={16} /></Link>
                  <Link to="/cuenta/favoritos">Favoritos<Icon name="chevron-right" size={16} /></Link>
                  <Link to="/cuenta/puntos">Mis puntos<Icon name="chevron-right" size={16} /></Link>
                  <Link to="/cuenta">Datos y direcciones<Icon name="chevron-right" size={16} /></Link>
                  {isSeller && <Link to="/vendedor">Mis productos<Icon name="chevron-right" size={16} /></Link>}
                  {isAdmin && <Link to="/admin">Administración<Icon name="chevron-right" size={16} /></Link>}
                  <button className="btn btn-block" style={{ marginTop: 16 }} onClick={() => { logout(); onClose(); navigate('/') }}>Cerrar sesión</button>
                </>
              ) : (
                <div className="stack" style={{ marginTop: 8 }}>
                  <Link className="btn btn-dark btn-block" to="/login">Iniciar sesión</Link>
                  <Link className="btn btn-block" to="/registro">Crear cuenta</Link>
                </div>
              )}
            </nav>
          </>
        )}
      </div>
    </Drawer>
  )
}
