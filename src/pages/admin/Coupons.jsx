import { useState } from 'react'
import { del, get, post, put } from '../../api'
import { useFetch } from '../../hooks'
import { useToast } from '../../toast'
import { apiToLocalInput, date, localInputToApi, parseDate } from '../../utils'
import { useStore } from '../../store'
import { ConfirmButton, Empty, ErrorBox, Pagination, Spinner } from '../../components/ui'

const EMPTY = { codigo: '', tipo: 'porcentaje', valor: '', fecha_expiracion: '', uso_maximo: '', activo: true }

export default function Coupons() {
  const toast = useToast()
  const { moneyBase: money, toBase: toCents, fromBase: fromCents, base } = useStore()
  const [page, setPage] = useState(1)
  const { data, error, loading, reload } = useFetch(() => get('/admin/cupones', { page, per_page: 20 }), [page])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const body = {
      descuento_porcentaje: form.tipo === 'porcentaje' ? Number(form.valor) : null,
      descuento_fijo: form.tipo === 'fijo' ? toCents(form.valor) : null,
      fecha_expiracion: localInputToApi(form.fecha_expiracion),
      uso_maximo: form.uso_maximo ? Number(form.uso_maximo) : null,
      activo: form.activo,
    }
    try {
      if (editId) await put(`/admin/cupones/${editId}`, body)
      else await post('/admin/cupones', { ...body, codigo: form.codigo })
      toast(editId ? 'Cupón actualizado' : 'Cupón creado')
      setForm(EMPTY); setEditId(null); reload()
    } catch (err) { toast.error(err) }
  }

  const edit = (c) => {
    setEditId(c.id)
    setForm({
      codigo: c.codigo,
      tipo: c.descuento_porcentaje != null ? 'porcentaje' : 'fijo',
      valor: c.descuento_porcentaje != null ? String(c.descuento_porcentaje) : fromCents(c.descuento_fijo),
      fecha_expiracion: apiToLocalInput(c.fecha_expiracion),
      uso_maximo: c.uso_maximo ?? '',
      activo: c.activo,
    })
    window.scrollTo(0, 0)
  }
  const toggle = async (c) => {
    try { await put(`/admin/cupones/${c.id}`, { activo: !c.activo }); reload() } catch (err) { toast.error(err) }
  }
  const remove = async (c) => {
    try { await del(`/admin/cupones/${c.id}`); reload() } catch (err) { toast.error(err) }
  }

  return (
    <div className="stack">
      <form className="card form" onSubmit={submit}>
        <h2>{editId ? `Editar cupón ${form.codigo}` : 'Nuevo cupón'}</h2>
        <div className="form-grid">
          <label className="field"><span>Código</span><input value={form.codigo} onChange={set('codigo')} required disabled={!!editId} maxLength={100} style={{ textTransform: 'uppercase' }} /></label>
          <label className="field"><span>Tipo
            </span><select value={form.tipo} onChange={set('tipo')}>
              <option value="porcentaje">Porcentaje</option><option value="fijo">Monto fijo</option>
            </select>
          </label>
          <label className="field"><span>{form.tipo === 'porcentaje' ? 'Descuento (%)' : `Descuento (${base.codigo})`}</span>
            <input type="number" min={form.tipo === 'porcentaje' ? 1 : 0} max={form.tipo === 'porcentaje' ? 100 : undefined}
              step={form.tipo === 'porcentaje' ? 1 : 'any'} value={form.valor} onChange={set('valor')} required />
          </label>
          <label className="field"><span>Expira</span><input type="datetime-local" value={form.fecha_expiracion} onChange={set('fecha_expiracion')} /></label>
          <label className="field"><span>Usos máximos</span><input type="number" min="1" value={form.uso_maximo} onChange={set('uso_maximo')} placeholder="Ilimitado" /></label>
        </div>
        <label className="check"><input type="checkbox" checked={form.activo} onChange={set('activo')} /> Activo</label>
        <div className="row">
          <button className="btn btn-dark">{editId ? 'Guardar' : 'Crear cupón'}</button>
          {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setForm(EMPTY) }}>Cancelar</button>}
        </div>
      </form>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.items.length === 0 ? <Empty>No hay cupones.</Empty> : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Código</th><th>Descuento</th><th>Usos</th><th>Expira</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {data.items.map((c) => {
                const expirado = c.fecha_expiracion && parseDate(c.fecha_expiracion) < new Date()
                return (
                  <tr key={c.id}>
                    <td><strong>{c.codigo}</strong></td>
                    <td>{c.descuento_porcentaje != null ? `${c.descuento_porcentaje}%` : money(c.descuento_fijo)}</td>
                    <td>{c.uso_actual}{c.uso_maximo != null && ` / ${c.uso_maximo}`}</td>
                    <td className="small">{c.fecha_expiracion ? date(c.fecha_expiracion) : '—'}{expirado && <span className="badge badge-bad"> Expirado</span>}</td>
                    <td><button className={`badge ${c.activo ? 'badge-ok' : ''}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggle(c)}>{c.activo ? 'Activo' : 'Inactivo'}</button></td>
                    <td className="right" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm" onClick={() => edit(c)}>Editar</button>{' '}
                      <ConfirmButton onConfirm={() => remove(c)}>Eliminar</ConfirmButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.total_pages} onChange={setPage} />
    </div>
  )
}
