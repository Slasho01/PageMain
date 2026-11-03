import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { Empty, Spinner } from './ui'

/** Protege rutas: exige sesión y, opcionalmente, uno de los roles indicados. */
export default function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(user.role)) return <Empty icon="lock" title="Acceso restringido">Tu cuenta no tiene permisos para ver esta página.</Empty>
  return children
}
