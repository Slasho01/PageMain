import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get, post, setToken, getToken, setUnauthorizedHandler } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!getToken()) return
    get('/users/me')
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [logout])

  const login = useCallback(async (username, password) => {
    const res = await post('/auth/login', { username, password })
    // 2FA: devolvemos el token temporal; la contraseña NO se reenvía en el 2º paso.
    if (res.twofa_required) return { twofa_required: true, pending: res.pending }
    setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  // Segundo paso del 2FA: token temporal + código, sin usuario/contraseña.
  const login2fa = useCallback(async (pending, codigo) => {
    const res = await post('/auth/login/2fa', { pending, codigo })
    setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const register = useCallback(async (data) => {
    await post('/auth/register', data)
    return login(data.username, data.password)
  }, [login])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    login2fa,
    logout,
    register,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'seller' || user?.role === 'admin',
  }), [user, loading, login, login2fa, logout, register])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
