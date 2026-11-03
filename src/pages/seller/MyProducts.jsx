import { useState } from 'react'
import { Link } from 'react-router-dom'
import { del, get, put } from '../../api'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { ConfirmButton, Empty, ErrorBox, Pagination, ProductThumb, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { usePageMeta } from '../../seo'
import { useToast } from '../../toast'

export default function MyProducts() {
  const toast = useToast()
  usePageMeta({ title: 'Mis productos', noindex: true })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const { data, error, loading, reload } = useFetch(() => get('/productos/mios', { page, per_page: 20, q: search }), [page, search])

  const patch = async (p, body, msg) => { try { await put(`/productos/${p.id}`, body); if (msg) toast(msg); reload() } catch (e) { toast.error(e) } }
  const remove = async (p) => { try { await del(`/productos/${p.id}`); toast('Producto eliminado'); reload() } catch (e) { toast.error(e) } }

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <div className="row between">
        <div><h1 className="page-title">Mis productos</h1>{data && <span className="muted small">{data.total} producto(s)</span>}</div>
        <Link className="btn btn-primary" to="/vendedor/nuevo"><Icon name="plus" size={18} />Nuevo producto</Link>
      </div>
      <form className="row nowrap" style={{ maxWidth: 520, '--gap': '8px' }} onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()) }}>
        <input className="input" type="search" placeholder="Buscar por nombre o SKU…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en mis productos" />
        <button className="btn">Buscar</button>
      </form>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.items.length === 0 ? (
        <Empty icon="package" title="Todavía no tienes productos" action={<Link className="btn btn-dark" to="/vendedor/nuevo">Crear el primero</Link>} />
      ) : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Producto</th><th className="r">Precio</th><th className="r">Stock</th><th>Destacado</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
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
