import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { useStore } from '../store'
import Icon from './Icon'
import { categoryUrl, useCategoryTree } from '../lib/catalog'

const SOCIAL = { instagram: 'instagram', facebook: 'facebook', tiktok: 'tiktok', x: 'xlogo' }
const LABEL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', x: 'X' }

export default function Footer() {
  const { tienda, paginas, pagos } = useStore()
  const { user } = useAuth()
  const { tree } = useCategoryTree()
  const footerPages = paginas.filter((p) => p.en_footer)
  const redes = Object.entries(tienda.redes || {}).filter(([, url]) => url)
  const wa = tienda.whatsapp?.replace(/[^\d]/g, '')

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand stack">
            <Link to="/" className="logo"><span className="logo-mark"><Icon name="zap" /></span>{tienda.nombre}</Link>
            {tienda.descripcion && <p className="small muted" style={{ maxWidth: 340 }}>{tienda.descripcion}</p>}
            <ul>
              {tienda.email && <li className="row" style={{ '--gap': '8px' }}><Icon name="mail" size={16} /><a href={`mailto:${tienda.email}`}>{tienda.email}</a></li>}
              {tienda.telefono && <li className="row" style={{ '--gap': '8px' }}><Icon name="phone" size={16} /><a href={`tel:${tienda.telefono.replace(/\s/g, '')}`}>{tienda.telefono}</a></li>}
              {wa && <li className="row" style={{ '--gap': '8px' }}><Icon name="whatsapp" size={16} /><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp {tienda.whatsapp}</a></li>}
              {tienda.direccion && <li className="row" style={{ '--gap': '8px' }}><Icon name="pin" size={16} />{tienda.direccion}</li>}
            </ul>
            {redes.length > 0 && (
              <div className="socials">
                {redes.map(([k, url]) => (
                  <a key={k} href={url} target="_blank" rel="noopener noreferrer" aria-label={LABEL[k]}><Icon name={SOCIAL[k]} size={18} /></a>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4>Comprar</h4>
            <ul>
              <li><Link to="/catalogo">Todo el catálogo</Link></li>
              <li><Link to="/ofertas">Ofertas</Link></li>
              <li><Link to="/novedades">Novedades</Link></li>
              <li><Link to="/mas-vendidos">Más vendidos</Link></li>
              {tree.roots.slice(0, 6).map((c) => <li key={c.id}><Link to={categoryUrl(c)}>{c.nombre}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4>Mi cuenta</h4>
            <ul>
              {user ? (
                <>
                  <li><Link to="/cuenta/pedidos">Mis pedidos</Link></li>
                  <li><Link to="/cuenta/favoritos">Favoritos</Link></li>
                  <li><Link to="/cuenta/direcciones">Direcciones</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/login">Iniciar sesión</Link></li>
                  <li><Link to="/registro">Crear cuenta</Link></li>
                  <li><Link to="/recuperar">Recuperar contraseña</Link></li>
                </>
              )}
              <li><Link to="/carrito">Carrito</Link></li>
            </ul>
          </div>
          <div>
            <h4>Ayuda</h4>
            <ul>
              {footerPages.map((p) => <li key={p.slug}><Link to={`/p/${p.slug}`}>{p.titulo}</Link></li>)}
              {footerPages.length === 0 && <li>Pronto publicaremos nuestras políticas.</li>}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {tienda.nombre}. Todos los derechos reservados.</span>
          {pagos.length > 0 && <span className="row" style={{ '--gap': '6px' }}><Icon name="lock" size={14} />Medios de pago: {pagos.map((m) => m.nombre).join(' · ')}</span>}
        </div>
      </div>
    </footer>
  )
}
