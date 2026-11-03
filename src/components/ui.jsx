import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { ESTATUS } from '../utils'

export const Spinner = () => <div className="spinner" role="status" aria-label="Cargando" />

export function Skeleton({ w = '100%', h = 16, r, style }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="alert alert-bad" role="alert">
      <Icon name="alert" size={18} />
      <span className="grow">{error.message || String(error)}</span>
      {onRetry && <button className="btn btn-sm" onClick={onRetry}>Reintentar</button>}
    </div>
  )
}

export function Empty({ icon = 'box', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      {title && <h2>{title}</h2>}
      {children && <p className="muted" style={{ maxWidth: 420, margin: 0 }}>{children}</p>}
      {action}
    </div>
  )
}

export function Stars({ value, count, size = 14 }) {
  if (value == null) return null
  const full = Math.round(value)
  return (
    <span className="stars" aria-label={`${Number(value).toFixed(1)} de 5 estrellas${count != null ? `, ${count} reseñas` : ''}`}>
      <span className="stars-row">
        {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={size} className={n <= full ? '' : 'off'} />)}
      </span>
      {count != null && <span>{Number(value).toFixed(1)} ({count})</span>}
    </span>
  )
}

export function StarInput({ value, onChange }) {
  return (
    <div className="star-input" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} onClick={() => onChange(n)}
          role="radio" aria-checked={n === value} aria-label={`${n} estrella${n > 1 ? 's' : ''}`}>
          <Icon name="star" size={26} />
        </button>
      ))}
    </div>
  )
}

export function StatusBadge({ estatus }) {
  const s = ESTATUS[estatus] || { short: estatus, tone: '' }
  return <span className={`badge badge-${s.tone}`}><span className="dot" />{s.short}</span>
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '…') pages.push('…')
  }
  return (
    <nav className="pagination" aria-label="Paginación">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior"><Icon name="chevron-left" size={16} /></button>
      {pages.map((p, i) => p === '…'
        ? <span key={`e${i}`} className="muted">…</span>
        : <button key={p} className={p === page ? 'on' : ''} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button>)}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Página siguiente"><Icon name="chevron-right" size={16} /></button>
    </nav>
  )
}

export function QtyInput({ value, onChange, max = 9999, min = 1, size }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, Number(v) || min)))
  return (
    <div className={`qty ${size || ''}`}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Disminuir cantidad"><Icon name="minus" size={16} /></button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} onChange={(e) => set(e.target.value)} aria-label="Cantidad" />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Aumentar cantidad"><Icon name="plus" size={16} /></button>
    </div>
  )
}

/** Botón destructivo que pide un segundo clic para confirmar. */
export function ConfirmButton({ children, confirmText = '¿Confirmar?', onConfirm, className = 'btn btn-sm btn-danger', disabled }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button type="button" className={className} disabled={disabled}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Ruta de navegación">
      <ol className="breadcrumbs" style={{ listStyle: 'none', padding: 0 }}>
        {items.map((it, i) => (
          <li key={i} className="row" style={{ '--gap': '6px' }}>
            {i > 0 && <Icon name="chevron-right" size={14} />}
            {it.to && i < items.length - 1 ? <Link to={it.to}>{it.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Drawer({ open, onClose, side = 'left', title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className={`drawer ${side}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-head">
          <strong>{title}</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  )
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

export function ProductThumb({ src, alt, className = 'thumb', eager }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={className}>
      {src && !failed
        ? <img src={src} alt={alt || ''} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" onError={() => setFailed(true)} />
        : <Icon name="image" size={24} className="placeholder-img" />}
    </div>
  )
}
