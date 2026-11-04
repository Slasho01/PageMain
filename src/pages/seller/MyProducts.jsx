import { useState } from 'react'
import { Link } from 'react-router-dom'
import { del, get, post, put } from '../../api'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { ConfirmButton, Empty, ErrorBox, Pagination, ProductThumb, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { usePageMeta } from '../../seo'
import { useToast } from '../../toast'

const POR_PAGINA = [20, 50, 100]

export default function MyProducts() {
  const toast = useToast()
  usePageMeta({ title: 'Mis productos', noindex: true })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [perPage, setPerPage] = useState(20)
  const [selected, setSelected] = useState(() => new Set())
  const [bulking, setBulking] = useState(false)

  const { data, error, loading, reload } = useFetch(
    () => get('/productos/mios', { page, per_page: perPage, q: search, estado }),
    [page, search, estado, perPage],
  )

  const patch = async (p, body, msg) => { try { await put(`/productos/${p.id}`, body); if (msg) toast(msg); reload() } catch (e) { toast.error(e) } }
  const remove = async (p) => { try { await del(`/productos/${p.id}`); toast('Producto eliminado'); reload() } catch (e) { toast.error(e) } }

  // --- Selección ---
  const pageIds = data?.items.map((p) => p.id) ?? []
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const clearSel = () => setSelected(new Set())
  const toggleOne = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((prev) => {
    const n = new Set(prev)
    if (allSelected) pageIds.forEach((id) => n.delete(id))
    else pageIds.forEach((id) => n.add(id))
    return n
  })
  const resetListado = (fn) => { fn(); setPage(1); clearSel() }

  const bulk = async (accion) => {
    const ids = [...selected]
    if (!ids.length) return
    if (accion === 'eliminar' && !window.confirm(`¿Eliminar ${ids.length} producto(s)? Esta acción no se puede deshacer.`)) return
    setBulking(true)
    try {
      const r = await post('/productos/acciones-masivas', { ids, accion })
      const verbo = accion === 'eliminar' ? 'eliminado(s)' : accion === 'pausar' ? 'pausado(s)' : 'reactivado(s)'
      toast(`${r.afectados} producto(s) ${verbo}`)
      clearSel()
      reload()
    } catch (e) { toast.error(e) } finally { setBulking(false) }
  }

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <div className="row between">
        <div><h1 className="page-title">Mis productos</h1>{data && <span className="muted small">{data.total} producto(s)</span>}</div>
        <Link className="btn btn-primary" to="/vendedor/nuevo"><Icon name="plus" size={18} />Nuevo producto</Link>
      </div>

      <div className="row" style={{ '--gap': '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <form className="row nowrap" style={{ flex: '1 1 320px', maxWidth: 520, '--gap': '8px' }} onSubmit={(e) => { e.preventDefault(); resetListado(() => setSearch(q.trim())) }}>
          <input className="input" type="search" placeholder="Buscar por nombre o SKU…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en mis productos" />
          <button className="btn">Buscar</button>
        </form>
        <label className="stack" style={{ '--gap': '2px' }}>
          <span className="xs muted">Estado</span>
          <select className="input" value={estado} onChange={(e) => resetListado(() => setEstado(e.target.value))}>
            <option value="">Todos</option>
            <option value="activo">Visibles</option>
            <option value="pausado">Pausados</option>
          </select>
        </label>
        <label className="stack" style={{ '--gap': '2px' }}>
          <span className="xs muted">Por página</span>
          <select className="input" value={perPage} onChange={(e) => resetListado(() => setPerPage(Number(e.target.value)))}>
            {POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {selected.size > 0 && (
        <div className="card row between" style={{ padding: '10px 14px', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderColor: 'var(--accent, #2563eb)' }}>
          <b>{selected.size} seleccionado(s)</b>
          <div className="row" style={{ '--gap': '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" disabled={bulking} onClick={() => bulk('pausar')}><Icon name="eye-off" size={15} />Pausar</button>
            <button className="btn btn-sm" disabled={bulking} onClick={() => bulk('reactivar')}><Icon name="eye" size={15} />Reactivar</button>
            <button className="btn btn-sm btn-danger" disabled={bulking} onClick={() => bulk('eliminar')}><Icon name="trash" size={15} />Eliminar</button>
            <button className="btn btn-sm btn-ghost" disabled={bulking} onClick={clearSel}>Limpiar</button>
          </div>
        </div>
      )}

      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.items.length === 0 ? (
        <Empty icon="package" title={search || estado ? 'Sin resultados con esos filtros' : 'Todavía no tienes productos'} action={!search && !estado && <Link className="btn btn-dark" to="/vendedor/nuevo">Crear el primero</Link>} />
      ) : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr>
              <th style={{ width: 36 }}><label className="check"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Seleccionar todos" /></label></th>
              <th>Producto</th><th className="r">Precio</th><th className="r">Stock</th><th>Destacado</th><th>Estado</th><th />
            </tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className={selected.has(p.id) ? 'row-selected' : undefined}>
                  <td><label className="check"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Seleccionar ${p.nombre}`} /></label></td>
                  <td>
                    <div className="row nowrap" style={{ '--gap': '12px' }}>
                      <ProductThumb src={p.imagen_principal} alt="" className="thumb sm" />
                      <div style={{ minWidth: 0 }}>
                        <Link to={`/producto/${p.id}`} className="strong">{p.nombre}</Link>
                        <div className="xs muted">{[p.marca, p.sku && `SKU ${p.sku}`, p.variantes > 0 && `${p.variantes} variantes`].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="r"><Price precio={p.precio} precioAnterior={p.precio_anterior} /></td>
                  <td className="r num" style={{ color: p.stock <= 0 ? 'var(--bad)' : p.stock <= 5 ? 'var(--warn)' : undefined }}>{p.stock}</td>
                  <td>
                    <label className="check"><input type="checkbox" checked={p.destacado} onChange={() => patch(p, { destacado: !p.destacado })} /><span className="sr-only">Destacado</span></label>
                  </td>
                  <td>
                    <span className={`badge ${p.estatus ? 'badge-ok' : 'badge-warn'}`}><span className="dot" />{p.estatus ? 'Visible' : 'Pausado'}</span>
                  </td>
                  <td className="r" style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => patch(p, { estatus: !p.estatus }, p.estatus ? 'Producto pausado: ya no se muestra en la tienda' : 'Producto reactivado: visible en la tienda')} title={p.estatus ? 'Ocultar de la tienda' : 'Volver a mostrar'}>
                      <Icon name={p.estatus ? 'eye-off' : 'eye'} size={15} />{p.estatus ? 'Pausar' : 'Reactivar'}
                    </button>{' '}
                    <Link className="btn btn-sm" to={`/vendedor/editar/${p.id}`}>Editar</Link>{' '}
                    <ConfirmButton confirmText="¿Eliminar?" onConfirm={() => remove(p)}>Eliminar</ConfirmButton>
                  </td>
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
