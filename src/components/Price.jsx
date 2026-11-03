import { useStore } from '../store'
import { discountPct } from '../utils'

/** Precio actual + precio anterior tachado (sólo si existe una oferta real). */
export default function Price({ precio, precioAnterior, size, extra = 0 }) {
  const { money } = useStore()
  const now = precio + extra
  const was = precioAnterior && precioAnterior > precio ? precioAnterior + extra : null
  return (
    <div className={`price ${size || ''}`}>
      <span className={`price-now num ${was ? 'deal' : ''}`}>{money(now)}</span>
      {was && <span className="price-was num"><span className="sr-only">Antes: </span>{money(was)}</span>}
      {was && size === 'lg' && <span className="badge badge-deal">−{discountPct({ precio, precio_anterior: precioAnterior })}%</span>}
    </div>
  )
}
