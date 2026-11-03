import { useRef, useState } from 'react'
import { uploadImage } from '../api'
import Icon from './Icon'

/**
 * Zona para subir imágenes (arrastrar y soltar o elegir archivos).
 * Llama a onUploaded({ url, variantes }) por cada imagen ya optimizada por el servidor.
 */
export default function ImageUploader({ onUploaded, nombre, multiple = true, label = 'Arrastra imágenes aquí o haz clic para elegir' }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState(null)

  const handle = async (files) => {
    setError(null)
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    if (!list.length) return setError('Elige archivos de imagen (JPG, PNG, WebP o GIF)')
    setBusy(list.length)
    for (const f of list) {
      try {
        if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name}: supera los 10 MB`)
        const up = await uploadImage(f, nombre)
        await onUploaded(up)
      } catch (e) { setError(e.message) }
      setBusy((n) => n - 1)
    }
  }

  return (
    <div className="stack" style={{ '--gap': '8px' }}>
      <label className={`dropzone ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files) }}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple}
          onChange={(e) => { handle(e.target.files); e.target.value = '' }} />
        <Icon name="image" size={28} />
        <div className="strong small" style={{ marginTop: 6 }}>{busy ? `Subiendo y optimizando ${busy} imagen(es)…` : label}</div>
        <div className="xs muted">JPG, PNG, WebP o GIF hasta 10 MB. Se generan versiones optimizadas automáticamente.</div>
      </label>
      {error && <div className="alert alert-bad"><Icon name="alert" size={18} />{error}</div>}
    </div>
  )
}
