import { NavLink, Route, Routes } from 'react-router-dom'
import { usePageMeta } from '../../seo'
import AdminOrders, { AdminOrderDetail } from './AdminOrders'
import Metrics from './Metrics'
import Banners from './Banners'
import Categories from './Categories'
import NewsletterAdmin from './NewsletterAdmin'
import Coupons from './Coupons'
import Pages from './Pages'
import StoreSettings from './StoreSettings'
import Users from './Users'
import MeliHub from './MeliHub'

export default function Admin() {
  usePageMeta({ title: 'Administración', noindex: true })
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <h1 className="page-title">Administración</h1>
      <nav className="tabs" aria-label="Secciones de administración">
        <NavLink to="/admin" end>Ventas</NavLink>
        <NavLink to="/admin/pedidos">Pedidos</NavLink>
        <NavLink to="/admin/tienda">Tienda</NavLink>
        <NavLink to="/admin/paginas">Páginas y políticas</NavLink>
        <NavLink to="/admin/categorias">Categorías</NavLink>
        <NavLink to="/admin/banners">Banners</NavLink>
        <NavLink to="/admin/newsletter">Newsletter</NavLink>
        <NavLink to="/admin/cupones">Cupones</NavLink>
        <NavLink to="/admin/melihub">MeliHub</NavLink>
        <NavLink to="/admin/usuarios">Usuarios</NavLink>
      </nav>
      <Routes>
        <Route index element={<Metrics />} />
        <Route path="pedidos" element={<AdminOrders />} />
        <Route path="ordenes/:id" element={<AdminOrderDetail />} />
        <Route path="tienda" element={<StoreSettings />} />
        <Route path="paginas" element={<Pages />} />
        <Route path="categorias" element={<Categories />} />
        <Route path="banners" element={<Banners />} />
        <Route path="newsletter" element={<NewsletterAdmin />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="cupones" element={<Coupons />} />
        <Route path="melihub" element={<MeliHub />} />
      </Routes>
    </div>
  )
}
