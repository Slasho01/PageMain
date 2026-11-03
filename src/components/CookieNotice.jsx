import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

const KEY = 'jarstore_cookies'

/** Aviso de cookies: barra discreta hasta que el visitante la acepta (se recuerda en el navegador). */
export default function CookieNotice() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true) } catch { setShow(true) }
  }, [])
  const accept = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* modo privado */ }
    setShow(false)
  }
  if (!show) return null
  return (
    <div className="cookie-notice" role="dialog" aria-label="Aviso de cookies">
      <Icon name="info" size={18} />
      <p>
        Usamos cookies propias para que la tienda funcione (tu sesión, el carrito y tus preferencias). No usamos cookies de publicidad.
        {' '}<Link className="link" to="/p/privacidad">Más información</Link>.
      </p>
      <button className="btn btn-dark btn-sm" onClick={accept}>Entendido</button>
    </div>
  )
}
