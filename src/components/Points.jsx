import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { useStore } from '../store'
import Icon from './Icon'

const fmt = (n) => new Intl.NumberFormat('es-CL').format(n)

/** "Gana X puntos" para un monto (moneda base). No se muestra si el programa está inactivo. */
export function EarnBadge({ amount, compact }) {
  const { puntos, puntosPor, money } = useStore()
  const n = puntosPor(amount)
  if (!puntos.activo || n <= 0) return null
  return (
    <span className={`points-badge ${compact ? 'compact' : ''}`}>
      <Icon name="star" size={14} />
      Ganas <b>{fmt(n)} puntos</b>{!compact && <span className="muted"> (equivalen a {money(n * puntos.valor_punto)} en tu próxima compra)</span>}
    </span>
  )
}

/** Explicación breve del programa con las reglas reales configuradas. */
export function PointsRules() {
  const { puntos, money } = useStore()
  if (!puntos.activo) return null
  return (
    <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
      <li>Ganas {fmt(puntos.puntos_por_monto)} punto{puntos.puntos_por_monto === 1 ? '' : 's'} por cada {money(puntos.monto_base)} en productos (sin contar el envío).</li>
      <li>Cada punto vale {money(puntos.valor_punto)} de descuento.</li>
      <li>Se acreditan cuando tu pedido queda pagado.</li>
      {puntos.minimo_canje > 0 && <li>Puedes canjear desde {fmt(puntos.minimo_canje)} puntos{puntos.maximo_porcentaje < 100 ? `, hasta un ${puntos.maximo_porcentaje}% de cada compra` : ''}.</li>}
    </ul>
  )
}

/** Pequeña invitación para usuarios sin sesión. */
export function PointsInvite() {
  const { user } = useAuth()
  const { puntos } = useStore()
  if (user || !puntos.activo) return null
  return <span className="xs muted"><Link className="link" to="/registro">Crea tu cuenta</Link> para acumular {puntos.nombre.toLowerCase()}.</span>
}
