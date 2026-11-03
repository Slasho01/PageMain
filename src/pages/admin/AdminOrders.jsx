import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { get, post, put } from '../../api'
import { useFetch } from '../../hooks'
import { useToast } from '../../toast'
import { apiToLocalInput, dateTime, ESTATUS, localInputToApi, NEXT_STATUS, shortId } from '../../utils'
import { useStore } from '../../store'
import { ConfirmButton, Empty, ErrorBox, Field, Pagination, Spinner, StatusBadge } from '../../components/ui'
import OrderView from '../../components/OrderView'

export default function AdminOrders() {
  const { moneyAt } = useStore()
  const [page, setPage] = useState(1)
  const [estatus, setEstatus] = useState('')
  const { data, error, loading, reload } = useFetch(() => get('/admin/ordenes', { page, per_page: 20, estatus }), [page, estatus])

  return (
    <div className="stack">
      <div className="row">
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>Estatus
          <select value={estatus} onChange={(e) => { setPage(1); setEstatus(e.target.value) }} style={{ width: 'auto' }}>
            <option value="">Todos</option>
            {Object.entries(ESTATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </label>
        <button className="btn btn-sm" onClick={reload}>Actualizar</button>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.items.length === 0 ? <Empty>No hay órdenes.</Empty> : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Envío</th><th>Estado</th><th className="r">Total</th><th /></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td className="small">{dateTime(o.created_at)}</td>
                  <td className="small strong num">#{shortId(o.id)}</td>
                  <td className="small">{o.nombre_comprador || '—'}<div className="xs muted">{o.email_comprador}</div></td>
                  <td className="small muted">{o.pais ? `${o.pais} · ` : ''}{o.metodo_envio || '—'}</td>
                  <td><StatusBadge estatus={o.estatus} /></td>
                  <td className="r num"><strong>{moneyAt(o.total, o.moneda, o.tasa_cambio)}</strong>{o.moneda !== 'CLP' && <div className="xs muted">{o.moneda}</div>}</td>
                  <td className="right"><Link className="btn btn-sm" to={`/admin/ordenes/${o.id}`}>Gestionar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.total_pages} onChange={setPage} />
    </div>
  )
}

export function AdminOrderDetail() {
  const { id } = useParams()
  const { data: o, error, loading, reload, setData } = useFetch(() => get(`/ordenes/${id}`), [id])
  if (loading && !o) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  return (
    <OrderView o={o} onUpdate={setData} canUploadDocument adminTools={<AdminTools o={o} onUpdate={setData} />}
      back={<Link className="link small" to="/admin/pedidos">← Todos los pedidos</Link>} />
  )
}

function AdminTools({ o, onUpdate }) {
  const toast = useToast()
  const { moneyBase, toBase, fromBase, base } = useStore()
  const money = moneyBase
  const pagado = o.pagos.filter((p) => p.estatus === 'completado').reduce((s, p) => s + p.monto, 0)
  const [pago, setPago] = useState({ monto: fromBase(Math.max(o.total - pagado, 0)), metodo: o.metodo_pago || '', estatus: 'completado', referencia_externa: '' })
  const [envio, setEnvio] = useState({
    empresa_envio: o.envio?.empresa_envio || '', codigo_seguimiento: o.envio?.codigo_seguimiento || '',
    estatus: o.envio?.estatus || '', fecha_envio: apiToLocalInput(o.envio?.fecha_envio), fecha_entrega: apiToLocalInput(o.envio?.fecha_entrega),
  })
  const activa = o.estatus !== 'cancelado'

  const go = (fn, msg) => async (e) => {
    e?.preventDefault?.()
    try { onUpdate(await fn()); toast(msg) } catch (err) { toast.error(err) }
  }
  const setStatus = (estatus) => go(() => put(`/admin/ordenes/${o.id}/estatus`, { estatus }), `Pedido marcado como ${ESTATUS[estatus].short}`)()

  return (
    <>
      <div className="card stack">
        <strong>Cambiar estado</strong>
        {NEXT_STATUS[o.estatus].length === 0 ? <span className="muted small">La orden está en un estado final.</span> : (
          <div className="row">
            {NEXT_STATUS[o.estatus].map((s) => s === 'cancelado'
              ? <ConfirmButton key={s} confirmText="Sí, cancelar" onConfirm={() => setStatus(s)}>Cancelar (devuelve stock)</ConfirmButton>
              : <button key={s} className="btn btn-sm btn-dark" onClick={() => setStatus(s)}>Marcar {ESTATUS[s].short.toLowerCase()}</button>)}
          </div>
        )}
      </div>

      {activa && (
        <form className="card form" onSubmit={go(() => post(`/admin/ordenes/${o.id}/pagos`, {
          ...pago, monto: toBase(pago.monto), metodo: pago.metodo || null, referencia_externa: pago.referencia_externa || null,
        }), 'Pago registrado')}>
          <strong>Registrar pago</strong>
          <span className="muted small">Pagado: {money(pagado)} de {money(o.total)}</span>
          <div className="form-grid">
            <label className="field"><span>Monto ({base.codigo})</span><input type="number" min="0" step="any" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} required /></label>
            <label className="field"><span>Estatus
              </span><select value={pago.estatus} onChange={(e) => setPago({ ...pago, estatus: e.target.value })}>
                <option value="completado">Completado</option><option value="pendiente">Pendiente</option><option value="fallido">Fallido</option>
              </select>
            </label>
            <label className="field"><span>Método</span><input value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })} /></label>
            <label className="field"><span>Referencia</span><input value={pago.referencia_externa} onChange={(e) => setPago({ ...pago, referencia_externa: e.target.value })} /></label>
          </div>
          <div><button className="btn btn-sm btn-primary">Registrar pago</button></div>
        </form>
      )}

      {activa && (
        <form className="card form" onSubmit={go(() => put(`/admin/ordenes/${o.id}/envio`, {
          empresa_envio: envio.empresa_envio || null, codigo_seguimiento: envio.codigo_seguimiento || null, estatus: envio.estatus || null,
          fecha_envio: localInputToApi(envio.fecha_envio), fecha_entrega: localInputToApi(envio.fecha_entrega),
        }), 'Envío guardado')}>
          <strong>Información de envío</strong>
          <div className="form-grid">
            <label className="field"><span>Paquetería</span><input value={envio.empresa_envio} onChange={(e) => setEnvio({ ...envio, empresa_envio: e.target.value })} /></label>
            <label className="field"><span>Guía</span><input value={envio.codigo_seguimiento} onChange={(e) => setEnvio({ ...envio, codigo_seguimiento: e.target.value })} /></label>
            <label className="field"><span>Estado del envío
              </span><select value={envio.estatus} onChange={(e) => setEnvio({ ...envio, estatus: e.target.value })}>
                <option value="">—</option><option value="preparando">Preparando</option><option value="en_transito">En tránsito</option><option value="entregado">Entregado</option>
              </select>
            </label>
            <label className="field"><span>Fecha de envío</span><input type="datetime-local" value={envio.fecha_envio} onChange={(e) => setEnvio({ ...envio, fecha_envio: e.target.value })} /></label>
            <label className="field"><span>Fecha de entrega</span><input type="datetime-local" value={envio.fecha_entrega} onChange={(e) => setEnvio({ ...envio, fecha_entrega: e.target.value })} /></label>
          </div>
          <div><button className="btn btn-sm btn-primary">Guardar envío</button></div>
        </form>
      )}

    </>
  )
}

