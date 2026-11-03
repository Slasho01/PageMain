// Utilidades de catálogo: URLs amigables y árbol de categorías.
import { useEffect, useState } from 'react'
import { get } from '../api'

export const productUrl = (p) => `/producto/${p.slug || p.id}`
export const categoryUrl = (c) => `/categoria/${c.slug}`
export const brandUrl = (marca, slug) => `/marca/${slug || slugify(marca)}`

/** Igual que en la API: "Audífonos Pro" -> "audifonos-pro" */
export function slugify(text = '') {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
}

/** Construye el árbol a partir de la lista plana (con parent_id). */
export function buildTree(list = []) {
  const byId = new Map(list.map((c) => [c.id, { ...c, children: [] }]))
  const roots = []
  byId.forEach((c) => {
    const parent = c.parent_id && byId.get(c.parent_id)
    if (parent) parent.children.push(c)
    else roots.push(c)
  })
  const sort = (arr) => { arr.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')); arr.forEach((c) => sort(c.children)) }
  sort(roots)
  return { roots, byId, bySlug: new Map([...byId.values()].map((c) => [c.slug, c])) }
}

export function pathTo(tree, id) {
  const out = []
  let c = tree.byId.get(id)
  while (c && out.length < 10) { out.unshift(c); c = c.parent_id ? tree.byId.get(c.parent_id) : null }
  return out
}

// Caché compartida: las categorías se piden una sola vez por carga
let cache = null
let inflight = null
const listeners = new Set()
export function invalidateCategories() { cache = null; inflight = null; listeners.forEach((fn) => fn()) }

export function useCategoryTree() {
  const [state, setState] = useState(() => cache ? { ...cache, loading: false } : { list: null, tree: buildTree([]), loading: true })
  useEffect(() => {
    let alive = true
    const load = () => {
      if (cache) { setState({ ...cache, loading: false }); return }
      inflight ||= get('/categorias').then((list) => { cache = { list, tree: buildTree(list) }; return cache })
      inflight.then((c) => alive && setState({ ...c, loading: false })).catch(() => alive && setState((s) => ({ ...s, loading: false })))
    }
    load()
    listeners.add(load)
    return () => { alive = false; listeners.delete(load) }
  }, [])
  return state
}

// Productos vistos recientemente (sólo en este navegador) para recomendaciones
const SEEN_KEY = 'jarstore_vistos'
export function rememberViewed(p) {
  try {
    const list = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]').filter((x) => x.id !== p.id)
    list.unshift({ id: p.id, categoria_id: p.categoria_id, marca: p.marca })
    localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(0, 20)))
  } catch { /* sin storage */ }
}
export function viewedHistory() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') } catch { return [] }
}
