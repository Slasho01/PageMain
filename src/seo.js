import { useEffect } from 'react'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}
function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!href) { el?.remove(); return }
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el) }
  el.href = href
}

/**
 * Metadatos por página al navegar dentro de la SPA. El HTML inicial ya llega con
 * los metadatos y el JSON-LD generados por el servidor (ver jarstoreapi/src/seo.rs).
 */
export function usePageMeta({ title, description, image, store = 'JarStore', noindex, canonical } = {}) {
  useEffect(() => {
    const full = title ? `${title} | ${store}` : store
    document.title = full
    const desc = description ? description.replace(/\s+/g, ' ').trim().slice(0, 160) : undefined
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:image', image)
    setMeta('name', 'robots', noindex ? 'noindex, follow' : undefined)
    setCanonical(canonical ? new URL(canonical, location.origin).href : undefined)
  }, [title, description, image, store, noindex, canonical])
}
