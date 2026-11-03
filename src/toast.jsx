import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './components/Icon'

const ToastContext = createContext(null)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, tone, action) => {
    const id = nextId++
    setToasts((t) => [...t.slice(-2), { id, message, tone, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'bad' ? 6000 : 3500)
  }, [])

  const toast = useMemo(() => {
    const fn = (msg, action) => push(msg, 'ok', action)
    fn.error = (err) => push(err?.message || String(err), 'bad')
    return fn
  }, [push])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={t.tone === 'bad' ? 'alert' : 'check'} size={18} />
            <span>{t.message}</span>
            {t.action && <Link to={t.action.to}>{t.action.label}</Link>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
