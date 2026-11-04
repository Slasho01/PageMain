// Cliente HTTP de la API de JarStore.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') + '/api/v2'
const TOKEN_KEY = 'jarstore_token'

let token = null
try { token = localStorage.getItem(TOKEN_KEY) } catch { /* sin storage */ }
let onUnauthorized = () => {}

export function getToken() { return token }
export function setToken(t) {
  token = t
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
}
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Error ${status}`)
    this.status = status
    this.code = body?.code
  }
}

function query(params) {
  if (!params) return ''
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v)
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(BASE + path + query(params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, { error: 'No se pudo conectar con el servidor. ¿Está la API encendida?' })
  }
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // Respuesta que no es JSON: no viene de la API (puerto equivocado, otro programa, proxy...)
      throw new ApiError(res.status, {
        error: `La respuesta de ${path} no viene de la API de JarStore. Revisa que la API esté encendida y que API_TARGET (Frontend/.env) apunte a su puerto.`,
      })
    }
  }
  if (!res.ok) {
    if (res.status === 401 && token && path !== '/auth/login') onUnauthorized()
    throw new ApiError(res.status, data)
  }
  return data
}

export const get = (p, params) => api(p, { params })
export const post = (p, body) => api(p, { method: 'POST', body: body ?? {} })
export const put = (p, body) => api(p, { method: 'PUT', body: body ?? {} })
export const del = (p) => api(p, { method: 'DELETE' })

/** Sube una imagen (multipart). Devuelve { url, variantes, ancho, alto }. */
export async function uploadImage(file, nombre) {
  const fd = new FormData()
  if (nombre) fd.append('nombre', nombre)
  fd.append('file', file)
  const res = await fetch(BASE + '/uploads', { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

/** Descarga un archivo protegido (p. ej. CSV del panel). */
export async function downloadFile(path, filename) {
  const res = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Sube el documento (boleta/factura) de un pedido. Devuelve el pedido actualizado. */
export async function uploadOrderDocument(orderId, file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/admin/ordenes/${orderId}/documento`, { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

/** URL absoluta de un archivo servido por la API (imágenes/documentos en /uploads). */
export function fileUrl(url) {
  if (!url) return url
  if (/^https?:\/\//.test(url)) return url
  return (import.meta.env.VITE_API_URL || '') + url
}
