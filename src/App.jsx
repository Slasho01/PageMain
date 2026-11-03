import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import { Empty, Spinner } from './components/ui'
import Catalog from './pages/Catalog'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'

// Páginas que no se necesitan al entrar a la tienda: se cargan bajo demanda
const Account = lazy(() => import('./pages/Account'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'))
const Policy = lazy(() => import('./pages/Policy'))
const NewsletterAction = lazy(() => import('./pages/NewsletterAction'))
const MyProducts = lazy(() => import('./pages/seller/MyProducts'))
const ProductForm = lazy(() => import('./pages/seller/ProductForm'))
const Admin = lazy(() => import('./pages/admin/Admin'))
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })))
const Forgot = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Forgot })))
const Reset = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Reset })))

const auth = (el, roles) => <RequireAuth roles={roles}>{el}</RequireAuth>
const SELLERS = ['seller', 'admin']
const OldOrder = () => <Navigate to={`/cuenta/pedidos/${useParams().id}`} replace />

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {/* Catálogo: URLs amigables e indexables */}
          <Route path="catalogo" element={<Catalog />} />
          <Route path="buscar" element={<Catalog />} />
          <Route path="categoria/:slug" element={<Catalog />} />
          <Route path="marca/:slug" element={<Catalog />} />
          <Route path="ofertas" element={<Catalog />} />
          <Route path="novedades" element={<Catalog />} />
          <Route path="mas-vendidos" element={<Catalog />} />
          <Route path="producto/:slug" element={<ProductDetail />} />
          <Route path="p/:slug" element={<Policy />} />
          {/* Cuenta y compra */}
          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Register />} />
          <Route path="recuperar" element={<Forgot />} />
          <Route path="restablecer" element={<Reset />} />
          <Route path="newsletter/confirmar" element={<NewsletterAction />} />
          <Route path="newsletter/baja" element={<NewsletterAction />} />
          <Route path="carrito" element={auth(<Cart />)} />
          <Route path="checkout" element={auth(<Checkout />)} />
          <Route path="pedido/:id" element={auth(<OrderConfirmation />)} />
          <Route path="cuenta/*" element={auth(<Account />)} />
          <Route path="vendedor" element={auth(<MyProducts />, SELLERS)} />
          <Route path="vendedor/nuevo" element={auth(<ProductForm />, SELLERS)} />
          <Route path="vendedor/editar/:id" element={auth(<ProductForm />, SELLERS)} />
          <Route path="admin/*" element={auth(<Admin />, ['admin'])} />
          {/* Rutas antiguas */}
          <Route path="ordenes" element={<Navigate to="/cuenta/pedidos" replace />} />
          <Route path="ordenes/:id" element={<OldOrder />} />
          <Route path="wishlist" element={<Navigate to="/cuenta/favoritos" replace />} />
          <Route path="*" element={<Empty icon="search" title="Página no encontrada" action={<Link className="btn btn-dark" to="/">Ir al inicio</Link>}>El enlace puede estar roto o la página ya no existe.</Empty>} />
        </Route>
      </Routes>
    </Suspense>
  )
}
