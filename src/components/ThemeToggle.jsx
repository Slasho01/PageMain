import { useEffect, useState } from 'react'
import Icon from './Icon'

/** Tema actual según el atributo que dejó el script de index.html. */
function current() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function apply(mode) {
  document.documentElement.dataset.theme = mode
  try { localStorage.setItem('theme', mode) } catch { /* modo privado */ }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#0b0d12' : '#f4f5f7')
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(current)

  // Si el usuario nunca eligió, seguir los cambios del sistema operativo en vivo.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e) => {
      let saved = null
      try { saved = localStorage.getItem('theme') } catch { /* ignore */ }
      if (saved !== 'light' && saved !== 'dark') {
        const mode = e.matches ? 'dark' : 'light'
        document.documentElement.dataset.theme = mode
        setTheme(mode)
      }
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    apply(next)
    setTheme(next)
  }

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )
}
