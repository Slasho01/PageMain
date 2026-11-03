import { useState } from 'react'
import { del, get, post, put } from '../../api'
import CategorySelect from '../../components/CategorySelect'
import Icon, { categoryIcon, ICONS } from '../../components/Icon'
import { ConfirmButton, Empty, ErrorBox, Field, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { buildTree, invalidateCategories } from '../../lib/catalog'
import { useToast } from '../../toast'

const EMPTY = { nombre: '', slug: '', descripcion: '', estatus: true, parent_id: '', orden: 0, icono: '' }
const CAT_ICONS = ['laptop', 'monitor', 'phone2', 'headphones', 'speaker', 'gamepad', 'camera', 'watch', 'cpu', 'plug', 'wifi', 'printer', 'home', 'tag', 'box', 'zap'].filter((i) => ICONS.includes(i))

export default function Categories() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => get('/categorias'), [])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const tree = buildTree(data || [])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const done = () => { setForm(EMPTY); setEditId(null); reload(); invalidateCategories() }

  const submit = async (e) => {
    e.preventDefault()
    const body = { nombre: form.nombre, descripcion: form.descripcion || null, estatus: form.estatus, orden: Number(form.orden) || 0,
      icono: form.icono || null, parent_id: form.parent_id || null, ...(form.slug.trim() ? { slug: form.slug.trim() } : {}) }
    try {
      if (editId) await put(`/categorias/${editId}`, body)
      else await post('/categorias', body)
      toast(editId ? 'Categoría actualizada' : 'Categoría creada'); done()
    } catch (err) { toast.error(err) }
  }
  const edit = (c) => {
    setEditId(c.id)
    setForm({ nombre: c.nombre, slug: c.slug, descripcion: c.descripcion || '', estatus: c.estatus, parent_id: c.parent_id || '', orden: c.orden, icono: c.icono || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const remove = async (c) => { try { await del(`/categorias/${c.id}`); toast('Categoría eliminada'); done() } catch (err) { toast.error(err) } }
  const toggle = async (c) => { try { await put(`/categorias/${c.id}`, { estatus: !c.estatus }); reload(); invalidateCategories() } catch (err) { toast.error(err) } }

  const rows = []
  const walk = (nodes, depth) => nodes.forEach((c) => { rows.push({ c, depth }); walk(c.children, depth + 1) })
  walk(tree.roots, 0)

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <form className="card form" onSubmit={submit}>
        <div className="row between">
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>{editId ? `Editar: ${form.nombre}` : 'Nueva categoría'}</h2>
          {editId && <button type="button" className="btn btn-sm" onClick={() => { setEditId(null); setForm(EMPTY) }}>Cancelar</button>}
        </div>
        <div className="form-grid">
          <Field label="Nombre"><input value={form.nombre} onChange={set('nombre')} required maxLength={255} /></Field>
          <Field label="Categoría padre" hint="Vacío = categoría principal"><CategorySelect value={form.parent_id} onChange={(v) => setForm({ ...form, parent_id: v })} exclude={editId} emptyLabel="— Principal —" includeInactive /></Field>
          <Field label="URL (slug)" hint={`/categoria/${form.slug || 'se-genera-del-nombre'}`}><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="automático" /></Field>
          <Field label="Orden" hint="Menor = aparece primero"><input type="number" value={form.orden} onChange={set('orden')} /></Field>
          <Field label="Icono (menú)">
            <select value={form.icono} onChange={set('icono')}>
              <option value="">Automático ({categoryIcon(form.nombre)})</option>
              {CAT_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Descripción" hint="Se muestra al pie de la página de la categoría y como descripción en buscadores. Escribe texto útil y original (sin repetir palabras clave).">
          <textarea value={form.descripcion} onChange={set('descripcion')} rows={4} />
        </Field>
        <div className="row between">
          <label className="check"><input type="checkbox" checked={form.estatus} onChange={set('estatus')} />Visible en la tienda</label>
          <button className="btn btn-dark">{editId ? 'Guardar cambios' : 'Crear categoría'}</button>
        </div>
      </form>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : rows.length === 0 ? <Empty icon="grid" title="Sin categorías">Crea las principales y luego sus subcategorías.</Empty> : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Categoría</th><th>URL</th><th className="r">Orden</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {rows.map(({ c, depth }) => (
                <tr key={c.id}>
                  <td>
                    <span className="row nowrap" style={{ '--gap': '8px', paddingLeft: depth * 22 }}>
                      {depth > 0 && <span className="muted">↳</span>}
                      <Icon name={c.icono || categoryIcon(c.nombre)} size={16} />
                      <strong>{c.nombre}</strong>
                      {c.children.length > 0 && <span className="xs muted">({c.children.length})</span>}
                    </span>
                  </td>
                  <td className="small muted">/categoria/{c.slug}</td>
                  <td className="r num">{c.orden}</td>
                  <td><button className={`badge ${c.estatus ? 'badge-ok' : ''}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggle(c)}>{c.estatus ? 'Visible' : 'Oculta'}</button></td>
                  <td className="r" style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => setForm({ ...EMPTY, parent_id: c.id }) || setEditId(null) || window.scrollTo({ top: 0, behavior: 'smooth' })}><Icon name="plus" size={14} />Sub</button>{' '}
                    <button className="btn btn-sm" onClick={() => edit(c)}>Editar</button>{' '}
                    <ConfirmButton confirmText="¿Eliminar?" onConfirm={() => remove(c)}>Eliminar</ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="xs muted" style={{ padding: '10px 14px', margin: 0 }}>Al eliminar una categoría, sus subcategorías suben un nivel y sus productos quedan sin categoría (no se borran).</p>
        </div>
      )}
    </div>
  )
}
