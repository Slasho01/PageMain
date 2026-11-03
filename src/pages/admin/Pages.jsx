import { useState } from 'react'
import { Link } from 'react-router-dom'
import { del, get, post, put } from '../../api'
import Icon from '../../components/Icon'
import { ConfirmButton, ErrorBox, Field, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { useStore } from '../../store'
import { useToast } from '../../toast'
import { date } from '../../utils'
import { SimpleText } from '../Policy'

const EMPTY = { slug: '', titulo: '', contenido: '', visible: false, en_footer: true, orden: 10 }
const toSlug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)

export default function Pages() {
  const toast = useToast()
  const store = useStore()
  const { data, error, loading, reload } = useFetch(() => get('/admin/paginas'), [])
  const [edit, setEdit] = useState(null) // null | 'new' | página
  const [form, setForm] = useState(EMPTY)
  const [preview, setPreview] = useState(false)

  const open = (p) => { setEdit(p || 'new'); setForm(p ? { ...p } : EMPTY); setPreview(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async (e) => {
    e.preventDefault()
    const body = { slug: form.slug, titulo: form.titulo, contenido: form.contenido, visible: form.visible, en_footer: form.en_footer, orden: Number(form.orden) || 0 }
    try {
      if (edit === 'new') await post('/admin/paginas', body)
      else await put(`/admin/paginas/${edit.id}`, body)
      toast('Página guardada'); setEdit(null); reload(); store.reload()
    } catch (err) { toast.error(err) }
  }
  const toggle = async (p) => { try { await put(`/admin/paginas/${p.id}`, { visible: !p.visible }); reload(); store.reload() } catch (e) { toast.error(e) } }
  const remove = async (p) => { try { await del(`/admin/paginas/${p.id}`); reload(); store.reload() } catch (e) { toast.error(e) } }

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      {edit ? (
        <form className="card form" onSubmit={save}>
          <div className="row between">
            <h2 style={{ fontSize: 'var(--fs-lg)' }}>{edit === 'new' ? 'Nueva página' : `Editar: ${edit.titulo}`}</h2>
            <div className="tabs" style={{ border: 'none' }}>
              <button type="button" className={!preview ? 'on' : ''} onClick={() => setPreview(false)}>Editar</button>
              <button type="button" className={preview ? 'on' : ''} onClick={() => setPreview(true)}>Vista previa</button>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Título"><input value={form.titulo} required maxLength={255} onChange={(e) => setForm({ ...form, titulo: e.target.value, slug: edit === 'new' && (!form.slug || form.slug === toSlug(form.titulo)) ? toSlug(e.target.value) : form.slug })} /></Field>
            <Field label="Dirección (slug)" hint={`Se verá en /p/${form.slug || '…'}`}><input value={form.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={set('slug')} /></Field>
            <Field label="Orden en el pie"><input type="number" value={form.orden} onChange={set('orden')} /></Field>
          </div>
          {preview ? (
            <div className="panel prose" style={{ minHeight: 240 }}>{form.contenido.trim() ? <SimpleText text={form.contenido} /> : <p className="muted">Sin contenido.</p>}</div>
          ) : (
            <Field label="Contenido" hint="Formato: deja una línea en blanco entre párrafos · “## ” para un título · “- ” al inicio de cada línea para una lista">
              <textarea rows={16} value={form.contenido} onChange={set('contenido')} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14 }}
                placeholder={'## Plazo para devoluciones\n\nTienes X días desde que recibes tu pedido para solicitar un cambio o devolución.\n\n## Condiciones\n\n- El producto debe estar sin uso y con su embalaje original.\n- Debes presentar la boleta o factura.'} />
            </Field>
          )}
          <div className="row" style={{ '--gap': '24px' }}>
            <label className="check"><input type="checkbox" checked={form.visible} onChange={set('visible')} />Publicada (visible para clientes)</label>
            <label className="check"><input type="checkbox" checked={form.en_footer} onChange={set('en_footer')} />Mostrar en el pie de página</label>
          </div>
          <div className="row"><button className="btn btn-dark">Guardar</button><button type="button" className="btn" onClick={() => setEdit(null)}>Cancelar</button></div>
        </form>
      ) : (
        <div className="row between">
          <p className="muted small" style={{ margin: 0, maxWidth: 640 }}>Políticas de devolución, garantía, despacho, términos y cualquier otra página informativa. Las páginas ocultas no aparecen en la tienda; las publicadas se enlazan en el pie y en la ficha de producto (garantía y devoluciones).</p>
          <button className="btn btn-primary" onClick={() => open(null)}><Icon name="plus" size={18} />Nueva página</button>
        </div>
      )}

      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Página</th><th>Estado</th><th>Actualizada</th><th /></tr></thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td><div className="strong">{p.titulo}</div><div className="xs muted">/p/{p.slug}{!p.contenido.trim() && ' · sin contenido'}</div></td>
                  <td><button className={`badge ${p.visible ? 'badge-ok' : 'badge-warn'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggle(p)} title="Clic para cambiar">{p.visible ? 'Publicada' : 'Oculta'}</button></td>
                  <td className="small muted">{date(p.updated_at)}</td>
                  <td className="r" style={{ whiteSpace: 'nowrap' }}>
                    <Link className="btn btn-sm btn-ghost" to={`/p/${p.slug}`}>Ver</Link>{' '}
                    <button className="btn btn-sm" onClick={() => open(p)}>Editar</button>{' '}
                    <ConfirmButton confirmText="¿Eliminar?" onConfirm={() => remove(p)}>Eliminar</ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
