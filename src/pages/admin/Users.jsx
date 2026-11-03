import { useState } from 'react'
import { del, get, post, put } from '../../api'
import { useAuth } from '../../auth'
import { useFetch } from '../../hooks'
import { useToast } from '../../toast'
import { date, dateTime, ROLE_LABEL } from '../../utils'
import { ConfirmButton, ErrorBox, Pagination, Spinner } from '../../components/ui'

export default function Users() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ q: '', role: '' })
  const { data, error, loading, reload } = useFetch(() => get('/admin/users', { page, per_page: 20, ...filters }), [page, filters])

  const setRole = async (u, role) => {
    try { await put(`/admin/users/${u.id}/role`, { role }); toast(`${u.username} ahora es ${ROLE_LABEL[role]}`); reload() } catch (e) { toast.error(e) }
  }
  const [pts, setPts] = useState(null) // usuario abierto en el panel de puntos
  const remove = async (u) => {
    try { await del(`/admin/users/${u.id}`); toast('Usuario eliminado'); reload() } catch (e) { toast.error(e) }
  }

  return (
    <div className="stack">
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); setPage(1); setFilters({ ...filters, q: q.trim() }) }}>
        <label className="field"><span>Buscar</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Usuario o email" /></label>
        <label className="field"><span>Rol
          </span><select value={filters.role} onChange={(e) => { setPage(1); setFilters({ ...filters, role: e.target.value }) }}>
            <option value="">Todos</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <button className="btn">Buscar</button>
      </form>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <p className="muted small" style={{ padding: '12px 10px 0', margin: 0 }}>{data.total} usuario(s)</p>
          <table className="table">
            <thead><tr><th>Usuario</th><th>Email</th><th>Alta</th><th>Rol</th><th /></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong>{u.id === me.id && <span className="muted small"> (tú)</span>}</td>
                  <td className="small">{u.email}</td>
                  <td className="small muted">{date(u.created_at)}</td>
                  <td>
                    <select value={u.role} onChange={(e) => setRole(u, e.target.value)} disabled={u.id === me.id} style={{ width: 'auto' }}>
                      {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="r" style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => setPts(pts?.id === u.id ? null : u)}>Puntos</button>{' '}
                    {u.id !== me.id && <ConfirmButton onConfirm={() => remove(u)}>Eliminar</ConfirmButton>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.total_pages} onChange={setPage} />
      {pts && <UserPoints u={pts} onClose={() => setPts(null)} />}
    </div>
  )
}

function UserPoints({ u, onClose }) {
  const toast = useToast()
  const { data, reload } = useFetch(() => get(`/admin/users/${u.id}/puntos`, { per_page: 10 }), [u.id])
  const [form, setForm] = useState({ puntos: '', motivo: '' })
  const submit = async (e) => {
    e.preventDefault()
    try { await post(`/admin/users/${u.id}/puntos`, { puntos: Number(form.puntos), motivo: form.motivo }); toast('Ajuste registrado'); setForm({ puntos: '', motivo: '' }); reload() } catch (err) { toast.error(err) }
  }
  return (
    <div className="card stack" style={{ '--gap': '12px' }}>
      <div className="row between"><h2 style={{ fontSize: 'var(--fs-lg)' }}>Puntos de {u.username}</h2><button className="btn btn-sm" onClick={onClose}>Cerrar</button></div>
      {data && <div className="row" style={{ '--gap': '24px' }}><span>Saldo: <b className="num">{data.saldo}</b></span><span className="muted small">Por acreditar: {data.por_acreditar}</span></div>}
      <form className="inline-form" onSubmit={submit}>
        <label className="field"><span>Ajuste (+/−)</span><input type="number" value={form.puntos} onChange={(e) => setForm({ ...form, puntos: e.target.value })} required /></label>
        <label className="field" style={{ flex: '3 1 240px' }}><span>Motivo (lo verá el cliente)</span><input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required maxLength={200} placeholder="Compensación por demora en el despacho" /></label>
        <button className="btn btn-dark">Registrar</button>
      </form>
      {data?.movimientos.items.length > 0 && (
        <div className="table-wrap"><table className="table">
          <tbody>{data.movimientos.items.map((m) => (
            <tr key={m.id}><td className="small muted">{dateTime(m.created_at)}</td><td className="small">{m.descripcion}</td><td className="small">{m.tipo}</td><td className="r num strong">{m.puntos > 0 ? '+' : ''}{m.puntos}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  )
}
