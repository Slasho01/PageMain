import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get, post, put, del } from './api'
import { useAuth } from './auth'

const CartContext = createContext(null)
const EMPTY = { items: [], total: 0, total_items: 0 }

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState(EMPTY)
  // Para qué usuario se cargó el carrito (evita mostrar "vacío" mientras carga tras el login)
  const [loadedFor, setLoadedFor] = useState(undefined)
  const uid = user?.id ?? null
  const loaded = loadedFor === uid

  const refresh = useCallback(async () => {
    if (!uid) { setCart(EMPTY); setLoadedFor(null); return EMPTY }
    const c = await get('/carrito')
    setCart(c)
    setLoadedFor(uid)
    return c
  }, [uid])

  useEffect(() => { refresh().catch(() => { setCart(EMPTY); setLoadedFor(uid) }) }, [refresh, uid])

  const value = useMemo(() => ({
    cart,
    loaded,
    refresh,
    add: async (producto_id, variante_id, cantidad = 1) =>
      setCart(await post('/carrito', { producto_id, variante_id: variante_id || null, cantidad })),
    setQty: async (id, cantidad) => setCart(await put(`/carrito/${id}`, { cantidad })),
    remove: async (id) => { await del(`/carrito/${id}`); await refresh() },
    clear: async () => { await del('/carrito'); setCart(EMPTY) },
  }), [cart, loaded, refresh])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
