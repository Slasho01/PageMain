import { useState } from 'react'
import { del, get, post, put } from '../../api'
import Icon from '../../components/Icon'
import ImageUploader from '../../components/ImageUploader'
import { ConfirmButton, Empty, ErrorBox, Field, ProductThumb, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { useToast } from '../../toast'
import { apiToLocalInput, date, localInputToApi, parseDate } from '../../utils'

const EMPTY = { ubicacion: 'hero', titulo: '', subtitulo: '', texto_boton: '', enlace: '', imagen_url: '', imagen_variantes: [], imagen_movil_url: '', tema: 'claro', orden: 0, activo: true, desde: '', hasta: '' }

function vigencia(b) {
  const now = new Date()
  if (!b.activo) return ['Inactivo', '']
  if (b.desde && parseDate(b.desde) > now) return ['Programado', 'badge-info']
  if (b.hasta && parseDate(b.hasta) <= now) return ['Vencido', 'badge-warn']
  return ['Publicado', 'badge-ok']
}

export default function Banners() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => get('/admin/banners'), [])
  const [form, setForm] = useState(null)
  const [editId, setEditId] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const open = (b) => {
    setEditId(b?.id || null)
    setForm(b ? { ...EMPTY, ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v ?? ''])), desde: apiToLocalInput(b.desde), hasta: apiToLocalInput(b.hasta) } : EMPTY)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const save = async (e) => {
    e.preventDefault()
    const n = (v) => (v === '' ? null : v)
    const body = { ...form, subtitulo: n(form.subtitulo), texto_boton: n(form.texto_boton), enlace: n(form.enlace), imagen_url: n(form.imagen_url),
      imagen_movil_url: n(form.imagen_movil_url), orden: Number(form.orden) || 0, desde: localInputToApi(form.desde), hasta: localInputToApi(form.hasta) }
    delete body.id; delete body.created_at; delete body.updated_at
    try {
      if (editId) await put(`/admin/banners/${editId}`, body)
      else await post('/admin/banners', body)
      toast('Banner guardado'); setForm(null); reload()
    } catch (err) { toast.error(err) }
  }
  const remove = async (b) => { try { await del(`/admin/banners/${b.id}`); reload() } catch (err) { toast.error(err) } }

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      {form ? (
        <form className="card form" onSubmit={save}>
          <div className="row between"><h2 style={{ fontSize: 'var(--fs-lg)' }}>{editId ? 'Editar banner' : 'Nuevo banner'}</h2>
            <button type="button" className="btn btn-sm" onClick={() => setForm(null)}>Cancelar</button></div>
          <div className="form-grid">
            <Field label="Ubicación">
              <select value={form.ubicacion} onChange={set('ubicacion')}>
                <option value="hero">Carrusel principal (portada)</option>
                <option value="promo">Promoción (tarjeta en portada)</option>
              </select>
            </Field>
            <Field label="Título"><input value={form.titulo} onChange={set('titulo')} required maxLength={160} /></Field>
            <Field label="Subtítulo"><input value={form.subtitulo} onChange={set('subtitulo')} maxLength={300} /></Field>
            <Field label="Enlace" hint="Ruta interna (/categoria/notebooks) o URL completa"><input value={form.enlace} onChange={set('enlace')} placeholder="/ofertas" /></Field>
            <Field label="Texto del botón"><input value={form.texto_boton} onChange={set('texto_boton')} placeholder="Ver ofertas" maxLength={60} /></Field>
            <Field label="Estilo de texto">
              <select value={form.tema} onChange={set('tema')}><option value="claro">Texto oscuro (fondo claro)</option><option value="oscuro">Texto claro (fondo oscuro)</option></select>
            </Field>
            <Field label="Mostrar desde" hint="Vacío = desde ya"><input type="datetime-local" value={form.desde} onChange={set('desde')} /></Field>
            <Field label="Mostrar hasta" hint="Vacío = sin fecha de término"><input type="datetime-local" value={form.hasta} onChange={set('hasta')} /></Field>
            <Field label="Orden"><input type="number" value={form.orden} onChange={set('orden')} /></Field>
          </div>
          <div className="stack" style={{ '--gap': '8px' }}>
            <span className="label">Imagen {form.ubicacion === 'hero' ? '(recomendado 1600×600 px)' : '(recomendado 800×500 px)'}</span>
            {form.imagen_url && (
              <div className="row" style={{ '--gap': '12px' }}>
                <ProductThumb src={form.imagen_url} className="thumb" />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => setForm({ ...form, imagen_url: '', imagen_variantes: [] })}>Quitar imagen</button>
              </div>
            )}
            <ImageUploader multiple={false} nombre={form.titulo || 'banner'} label={form.imagen_url ? 'Reemplazar imagen' : 'Arrastra la imagen o haz clic'}
              onUploaded={(up) => setForm((f) => ({ ...f, imagen_url: up.url, imagen_variantes: up.variantes }))} />
            <Field label="Imagen para móvil (opcional, URL)" hint="Recomendado 800×800 px. Si no hay, se usa la principal."><input value={form.imagen_movil_url} onChange={set('imagen_movil_url')} placeholder="https://…" /></Field>
          </div>
          <div className="row between">
            <label className="check"><input type="checkbox" checked={form.activo} onChange={set('activo')} />Activo</label>
            <button className="btn btn-dark">Guardar banner</button>
          </div>
        </form>
      ) : (
        <div className="row between">
          <p className="small muted" style={{ margin: 0, maxWidth: 620 }}>Los banners del carrusel reemplazan al producto destacado en la portada. Las promociones se muestran como tarjetas. Programa fechas de inicio y término para que se publiquen y retiren solos.</p>
          <button className="btn btn-primary" onClick={() => open(null)}><Icon name="plus" size={18} />Nuevo banner</button>
        </div>
      )}
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.length === 0 ? <Empty icon="image" title="Sin banners">La portada mostrará el producto destacado.</Empty> : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Banner</th><th>Ubicación</th><th>Vigencia</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {data.map((b) => {
                const [label, tone] = vigencia(b)
                return (
                  <tr key={b.id}>
                    <td><div className="row nowrap" style={{ '--gap': '10px' }}><ProductThumb src={b.imagen_url} className="thumb sm" /><div><div className="strong">{b.titulo}</div><div className="xs muted">{b.enlace || 'sin enlace'}</div></div></div></td>
                    <td className="small">{b.ubicacion === 'hero' ? 'Carrusel' : 'Promoción'}</td>
                    <td className="small muted">{b.desde ? date(b.desde) : 'Ya'} → {b.hasta ? date(b.hasta) : 'sin término'}</td>
                    <td><span className={`badge ${tone}`}>{label}</span></td>
                    <td className="r" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm" onClick={() => open(b)}>Editar</button>{' '}
                      <ConfirmButton confirmText="¿Eliminar?" onConfirm={() => remove(b)}>Eliminar</ConfirmButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
