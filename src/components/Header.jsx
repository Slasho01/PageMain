import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { shippingFacts, useStore } from '../store'
import { ROLE_LABEL } from '../utils'
import Icon from './Icon'
import MegaMenu from './header/MegaMenu'
import MobileMenu from './header/MobileMenu'
import SearchBox from './header/SearchBox'
import CurrencySwitcher from './header/CurrencySwitcher'
import ThemeToggle from './ThemeToggle'

function AccountMenu() {
  const { user, logout, isAdmin, isSeller } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  if (!user) {
    return (
      <Link className="account-link" to="/login">
        <Icon name="user" />
        <span className="desktop-only"><span className="xs muted">Hola</span><span className="small strong">Ingresa</span></span>
      </Link>
    )
  }
  return (
    <div className="menu" ref={ref}>
      <button className="account-link" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Mi cuenta">
        <Icon name="user" />
        <span className="desktop-only"><span className="xs muted">Hola, {user.username}</span><span className="small strong">Mi cuenta</span></span>
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <div className="menu-head">
            <div className="strong">{user.username}</div>
            <div className="xs muted">{user.email} · {ROLE_LABEL[user.role]}</div>
          </div>
          <Link to="/cuenta/pedidos" role="menuitem"><Icon name="receipt" size={18} />Mis pedidos</Link>
          <Link to="/cuenta/favoritos" role="menuitem"><Icon name="heart" size={18} />Favoritos</Link>
          <Link to="/cuenta/puntos" role="menuitem"><Icon name="star" size={18} />Mis puntos</Link>
          <Link to="/cuenta" role="menuitem"><Icon name="user" size={18} />Datos y direcciones</Link>
          {isSeller && <Link to="/vendedor" role="menuitem"><Icon name="package" size={18} />Mis productos</Link>}
          {isAdmin && <Link to="/admin" role="menuitem"><Icon name="settings" size={18} />Administración</Link>}
          <button role="menuitem" onClick={() => { logout(); navigate('/') }}><Icon name="logout" size={18} />Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}

function TopBar() {
  const { pais, paises, setPais, money, tienda } = useStore()
  const { gratisDesde, metodos } = shippingFacts(pais)
  if (!pais) return null
  return (
    <div className="topbar">
      <div className="container">
        {gratisDesde != null ? <span><Icon name="truck" size={14} style={{ verticalAlign: '-2px' }} /> Envío gratis a {pais.nombre} desde {money(gratisDesde)}</span>
          : metodos.length > 0 ? <span><Icon name="truck" size={14} style={{ verticalAlign: '-2px' }} /> Despachos a {pais.nombre}</span> : null}
        {tienda.whatsapp && <span className="desktop-only"><Icon name="whatsapp" size={14} style={{ verticalAlign: '-2px' }} /> {tienda.whatsapp}</span>}
        {paises.length > 1 && (
          <label className="row" style={{ '--gap': '6px' }}>
            <Icon name="pin" size={14} />
            <span className="sr-only">País de entrega</span>
            <select value={pais.codigo} onChange={(e) => setPais(e.target.value)} className="topbar-select">
              {paises.map((p) => <option key={p.codigo} value={p.codigo}>Envíos a {p.nombre}</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}

export default function Header() {
  const { user } = useAuth()
  const { cart } = useCart()
  const { tienda } = useStore()
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  useEffect(() => setMenu(false), [location.pathname, location.search])

  return (
    <>
      <TopBar />
      <header className="header">
        <div className="container">
          <div className="header-main">
            <button className="icon-btn mobile-only" onClick={() => setMenu(true)} aria-label="Abrir menú"><Icon name="menu" /></button>
            <Link to="/" className="logo" aria-label={`${tienda.nombre} — inicio`}>
              <span className="logo-mark"><Icon name="zap" /></span>{tienda.nombre}
            </Link>
            <div className="desktop-only grow"><SearchBox /></div>
            <div className="header-actions">
              <ThemeToggle />
              <CurrencySwitcher />
              <AccountMenu />
              {user && <Link className="icon-btn desktop-only" to="/cuenta/favoritos" aria-label="Favoritos" title="Favoritos"><Icon name="heart" /></Link>}
              <Link className="icon-btn" to="/carrito" aria-label={`Carrito, ${cart.total_items} productos`} title="Carrito">
                <Icon name="cart" />
                {cart.total_items > 0 && <span className="count">{cart.total_items > 99 ? '99+' : cart.total_items}</span>}
              </Link>
            </div>
          </div>
          <div className="mobile-search"><SearchBox id="q-m" /></div>
        </div>
        <div className="catbar desktop-only">
          <div className="container">
            <nav aria-label="Navegación principal">
              <MegaMenu />
              <NavLink to="/ofertas" className="deal">Ofertas</NavLink>
              <NavLink to="/novedades">Novedades</NavLink>
              <NavLink to="/mas-vendidos">Más vendidos</NavLink>
            </nav>
          </div>
        </div>
      </header>
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
    </>
  )
}
