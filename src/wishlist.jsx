// Favoritos del usuario: ids en memoria para mostrar el corazón lleno en cualquier tarjeta.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { del, get, post } from './api'
import { useAuth } from './auth'
import { useToast } from './toast'

const WishContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [ids, setIds] = useState(() => new Set())
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) { setIds(new Set()); return }
    get('/wishlist').then((list) => setIds(new Set(list.map((w) => w.producto.id)))).catch(() => {})
  }, [user])

  const toggle = useCallback(async (p) => {
    if (!user) { navigate('/login', { state: { from: location.pathname } }); return }
    const had = ids.has(p.id)
    setIds((s) => { const n = new Set(s); had ? n.delete(p.id) : n.add(p.id); return n })
    try {
      if (had) await del(`/wishlist/${p.id}`)
      else { await post('/wishlist', { producto_id: p.id }); toast('Guardado en favoritos', { to: '/cuenta/favoritos', label: 'Ver' }) }
    } catch (e) {
      setIds((s) => { const n = new Set(s); had ? n.add(p.id) : n.delete(p.id); return n })
      toast.error(e)
    }
  }, [user, ids, navigate, toast])

  const value = useMemo(() => ({ has: (id) => ids.has(id), toggle, count: ids.size }), [ids, toggle])
  return <WishContext.Provider value={value}>{children}</WishContext.Provider>
}

export const useWishlist = () => useContext(WishContext)
