import { useState } from 'react'
import Icon from './Icon'

/**
 * Imagen responsiva: usa los tamaños generados al subir (WebP / Cloudinary f_auto)
 * con srcset + sizes, carga diferida y placeholder si falla.
 */
export default function Img({ src, variantes, alt = '', sizes = '(max-width: 600px) 50vw, 300px', eager, className, style }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <Icon name="image" size={28} className="placeholder-img" />
  const list = Array.isArray(variantes) ? variantes.filter((v) => v?.url && v?.w) : []
  const srcSet = list.length ? list.map((v) => `${v.url} ${v.w}w`).join(', ') : undefined
  return (
    <img src={src} srcSet={srcSet} sizes={srcSet ? sizes : undefined} alt={alt} className={className} style={style}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async"
      onError={() => setFailed(true)} />
  )
}
