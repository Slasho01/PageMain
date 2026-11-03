/** La API devuelve fechas UTC sin zona ("2026-11-03T01:29:50.12"). */
export function parseDate(s) {
  if (!s) return null
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z')
}
export const date = (s) => parseDate(s)?.toLocaleDateString('es-CL', { dateStyle: 'medium' }) ?? '—'
export const dateTime = (s) =>
  parseDate(s)?.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) ?? '—'

/** <input type="datetime-local"> ⇄ NaiveDateTime UTC de la API */
export function localInputToApi(v) {
  if (!v) return null
  return new Date(v).toISOString().slice(0, 19)
}
export function apiToLocalInput(s) {
  const d = parseDate(s)
  if (!d) return ''
  const off = d.getTimezoneOffset() * 60000
  return new Date(d - off).toISOString().slice(0, 16)
}

export const ESTATUS = {
  pendiente: { label: 'Pendiente de pago', short: 'Pendiente', tone: 'warn' },
  pagado: { label: 'Pagado', short: 'Pagado', tone: 'info' },
  enviado: { label: 'En camino', short: 'Enviado', tone: 'info' },
  entregado: { label: 'Entregado', short: 'Entregado', tone: 'ok' },
  cancelado: { label: 'Cancelado', short: 'Cancelado', tone: 'bad' },
}
export const NEXT_STATUS = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
}
export const ROLE_LABEL = { admin: 'Admin', seller: 'Vendedor', user: 'Cliente' }

export const discountPct = (p) =>
  p.precio_anterior && p.precio_anterior > p.precio ? Math.round((1 - p.precio / p.precio_anterior) * 100) : 0

export const shortId = (id) => id?.slice(0, 8).toUpperCase()
