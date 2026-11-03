import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { del, get, post, put } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import Icon from '../components/Icon'
import OrderView from '../components/OrderView'
import Price from '../components/Price'
import { ConfirmButton, Empty, ErrorBox, Field, Pagination, ProductThumb, Spinner, StatusBadge } from '../components/ui'
import { useFetch } from '../hooks'
import { usePageMeta } from '../seo'
import { useStore } from '../store'
import { useToast } from '../toast'
import { date, dateTime, ROLE_LABEL, shortId } from '../utils'
import { PointsRules } from '../components/Points'

export default function Account() {
  const { user, logout } = useAuth()
  const { tienda } = useStore()
  usePageMeta({ title: 'Mi cuenta', store: tienda.nombre, noindex: true })
  const links = [
    ['/cuenta/pedidos', 'Mis pedidos', 'receipt'],
    ['/cuenta', 'Perfil', 'user', true],
    ['/cuenta/direcciones', 'Direcciones', 'pin'],
    ['/cuenta/puntos', 'Mis puntos', 'star'],
    ['/cuenta/favoritos', 'Favoritos', 'heart'],
    ['/cuenta/seguridad', 'Contraseña', 'lock'],
  ]
  return (
    <div className="account">
      <aside className="stack" style={{ '--gap': '16px' }}>
        <div className="desktop-only" style={{ padding: '0 12px' }}>
          <div className="strong">{user.username}</div>
          <div className="xs muted">{user.email}</div>
          <div className="xs muted">{ROLE_LABEL[user.role]} desde {date(user.created_at)}</div>
        </div>
        <nav className="side-nav" aria-label="Mi cuenta">
          {links.map(([to, label, icon, end]) => <NavLink key={to} to={to} end={end}><Icon name={icon} size={18} />{label}</NavLink>)}
          <button className="desktop-only btn btn-ghost" style={{ justifyContent: 'flex-start', paddingLeft: 12, marginTop: 8 }} onClick={logout}><Icon name="logout" size={18} />Cerrar sesión</button>
        </nav>
      </aside>
      <section>
        <Routes>
          <Route index element={<Perfil />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="pedidos/:id" element={<Pedido />} />
          <Route path="direcciones" element={<Direcciones />} />
          <Route path="favoritos" element={<Favoritos />} />
          <Route path="puntos" element={<Puntos />} />
          <Route path="seguridad" element={<Password />} />
        </Routes>
      </section>
    </div>
  )
}

function Pedidos() {
  const [page, setPage] = useState(1)
  const { moneyAt } = useStore()
  const { data, error, loading, reload } = useFetch(() => get('/ordenes', { page, per_page: 10 }), [page])
  return (
    <div className="stack">
      <h1 className="page-title">Mis pedidos</h1>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.items.length === 0 ? (
        <Empty icon="receipt" title="Aún no tienes pedidos" action={<Link className="btn btn-dark" to="/catalogo">Explorar productos</Link>}>Cuando compres, podrás seguir tus pedidos aquí.</Empty>
      ) : data && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {data.items.map((o) => (
            <Link key={o.id} to={`/cuenta/pedidos/${o.id}`} className="order-row">
              <div className="stack" style={{ '--gap': '4px' }}>
                <div className="row" style={{ '--gap': '10px' }}><span className="strong num">#{shortId(o.id)}</span><StatusBadge estatus={o.estatus} /></div>
                <span className="small muted">{date(o.created_at)} · {o.metodo_envio || 'Envío'}</span>
              </div>
              <div className="row" style={{ '--gap': '8px' }}><span className="strong num">{moneyAt(o.total, o.moneda, o.tasa_cambio)}</span><Icon name="chevron-right" size={18} /></div>
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={data?.total_pages} onChange={setPage} />
    </div>
  )
}

function Pedido() {
  const { id } = useParams()
  const { data, error, loading, reload, setData } = useFetch(() => get(`/ordenes/${id}`), [id])
  if (loading && !data) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  return <OrderView o={data} onUpdate={setData} back={<Link className="link small" to="/cuenta/pedidos">← Mis pedidos</Link>} />
}

function Perfil() {
  const toast = useToast()
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', direccion: '' })
  const [exists, setExists] = useState(null)
  useEffect(() => {
    get('/perfil/mi-perfil')
      .then((p) => { setForm({ nombre: p.nombre, apellido: p.apellido, telefono: p.telefono || '', direccion: p.direccion || '' }); setExists(true) })
      .catch((e) => (e.status === 404 ? setExists(false) : toast.error(e)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    try {
      if (exists) await put('/perfil/mi-perfil', form)
      else { await post('/perfil', form); setExists(true) }
      toast('Perfil guardado')
    } catch (err) { toast.error(err) }
  }
  if (exists === null) return <Spinner />
  return (
    <div className="stack">
      <h1 className="page-title">Perfil</h1>
      <form className="card form" onSubmit={submit} style={{ maxWidth: 680 }}>
        {!exists && <div className="alert alert-info"><Icon name="info" size={18} />Completa tus datos: los usaremos para agilizar tus compras.</div>}
        <div className="form-grid">
          <Field label="Nombre"><input value={form.nombre} onChange={set('nombre')} required maxLength={255} autoComplete="given-name" /></Field>
          <Field label="Apellido"><input value={form.apellido} onChange={set('apellido')} required maxLength={255} autoComplete="family-name" /></Field>
          <Field label="Teléfono"><input type="tel" value={form.telefono} onChange={set('telefono')} maxLength={255} autoComplete="tel" /></Field>
        </div>
        <div><button className="btn btn-dark">{exists ? 'Guardar cambios' : 'Guardar perfil'}</button></div>
      </form>
    </div>
  )
}

function Password() {
  const toast = useToast()
  const blank = { old_password: '', new_password: '', confirm_new_password: '' }
  const [form, setForm] = useState(blank)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    try { await put('/users/me/password', form); toast('Contraseña actualizada'); setForm(blank) } catch (err) { toast.error(err) }
  }
  return (
    <div className="stack">
      <h1 className="page-title">Contraseña</h1>
      <form className="card form" onSubmit={submit} style={{ maxWidth: 440 }}>
        <Field label="Contraseña actual"><input type="password" autoComplete="current-password" value={form.old_password} onChange={set('old_password')} required /></Field>
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres"><input type="password" autoComplete="new-password" value={form.new_password} onChange={set('new_password')} required minLength={8} /></Field>
        <Field label="Repite la nueva contraseña"><input type="password" autoComplete="new-password" value={form.confirm_new_password} onChange={set('confirm_new_password')} required minLength={8} /></Field>
        <div><button className="btn btn-dark">Cambiar contraseña</button></div>
      </form>
    </div>
  )
}

const EMPTY_DIR = { titulo: '', direccion: '', ciudad: '', estado: '', codigo_postal: '', pais: '', telefono: '' }

function Direcciones() {
  const toast = useToast()
  const { paises } = useStore()
  const { data, loading, reload } = useFetch(() => get('/direcciones'), [])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_DIR)
  const start = (d) => {
    setEditing(d ? d.id : 'new')
    setForm(d ? Object.fromEntries(Object.keys(EMPTY_DIR).map((k) => [k, d[k] || ''])) : { ...EMPTY_DIR, pais: paises[0]?.nombre || '' })
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    try {
      if (editing === 'new') await post('/direcciones', form)
      else await put(`/direcciones/${editing}`, form)
      toast('Dirección guardada'); setEditing(null); reload()
    } catch (err) { toast.error(err) }
  }
  const remove = async (id) => { try { await del(`/direcciones/${id}`); reload() } catch (err) { toast.error(err) } }

  if (loading && !data) return <Spinner />
  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <div className="row between"><h1 className="page-title">Direcciones</h1>{!editing && <button className="btn btn-dark btn-sm" onClick={() => start(null)}><Icon name="plus" size={16} />Agregar</button>}</div>
      {editing && (
        <form className="card form" onSubmit={submit}>
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>{editing === 'new' ? 'Nueva dirección' : 'Editar dirección'}</h2>
          <div className="form-grid">
            <Field label="Nombre (Casa, Trabajo…)"><input value={form.titulo} onChange={set('titulo')} maxLength={100} /></Field>
            <Field label="Teléfono de contacto"><input type="tel" value={form.telefono} onChange={set('telefono')} maxLength={50} /></Field>
          </div>
          <Field label="Calle y número"><input value={form.direccion} onChange={set('direccion')} required autoComplete="street-address" /></Field>
          <div className="form-grid">
            <Field label="Comuna / Ciudad"><input value={form.ciudad} onChange={set('ciudad')} maxLength={100} /></Field>
            <Field label="Región / Estado"><input value={form.estado} onChange={set('estado')} maxLength={100} /></Field>
            <Field label="Código postal"><input value={form.codigo_postal} onChange={set('codigo_postal')} maxLength={20} /></Field>
            <Field label="País">
              <select value={form.pais} onChange={set('pais')}>
                <option value="">—</option>
                {paises.map((p) => <option key={p.codigo} value={p.nombre}>{p.nombre}</option>)}
                {form.pais && !paises.some((p) => p.nombre === form.pais) && <option value={form.pais}>{form.pais}</option>}
              </select>
            </Field>
          </div>
          <div className="row"><button className="btn btn-dark">Guardar</button><button type="button" className="btn" onClick={() => setEditing(null)}>Cancelar</button></div>
        </form>
      )}
      {data?.length === 0 && !editing && <Empty icon="pin" title="Sin direcciones guardadas">Guárdalas para comprar más rápido.</Empty>}
      <div className="form-grid">
        {data?.map((d) => (
          <div key={d.id} className="card stack" style={{ '--gap': '6px' }}>
            <strong>{d.titulo || 'Dirección'}</strong>
            <span className="small">{[d.direccion, d.ciudad, d.estado, d.codigo_postal, d.pais].filter(Boolean).join(', ')}</span>
            {d.telefono && <span className="small muted">Tel. {d.telefono}</span>}
            <div className="row" style={{ marginTop: 6, '--gap': '8px' }}>
              <button className="btn btn-sm" onClick={() => start(d)}>Editar</button>
              <ConfirmButton confirmText="¿Eliminar?" onConfirm={() => remove(d.id)}>Eliminar</ConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Favoritos() {
  const { data, error, loading, reload } = useFetch(() => get('/wishlist'), [])
  const cart = useCart()
  const toast = useToast()
  const remove = async (pid) => { try { await del(`/wishlist/${pid}`); reload() } catch (e) { toast.error(e) } }
  const toCart = async (p) => {
    try { await cart.add(p.id, null, 1); toast('Agregado al carrito', { to: '/carrito', label: 'Ver carrito' }) } catch (e) { toast.error(e) }
  }
  return (
    <div className="stack">
      <h1 className="page-title">Favoritos</h1>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.length === 0 ? (
        <Empty icon="heart" title="Aún no tienes favoritos" action={<Link className="btn btn-dark" to="/catalogo">Explorar productos</Link>}>Toca “Favorito” en un producto para guardarlo.</Empty>
      ) : data && (
        <div className="card">
          {data.map(({ id, producto: p }) => (
            <div key={id} className="line-item">
              <Link to={`/producto/${p.id}`}><ProductThumb src={null} alt={p.nombre} /></Link>
              <div className="stack" style={{ '--gap': '4px' }}>
                {p.marca && <span className="pcard-brand">{p.marca}</span>}
                <Link to={`/producto/${p.id}`} className="strong">{p.nombre}</Link>
                <Price precio={p.precio} precioAnterior={p.precio_anterior} />
                <span className="small muted">{p.stock > 0 && p.estatus ? 'Disponible' : 'No disponible'}</span>
              </div>
              <div className="stack" style={{ '--gap': '8px', alignItems: 'end' }}>
                <Link className="btn btn-sm btn-dark" to={`/producto/${p.id}`}>Ver</Link>
                <button className="btn btn-sm" onClick={() => toCart(p)} disabled={p.stock <= 0 || !p.estatus} title="Si tiene opciones, elígelas en su página">Al carrito</button>
                <button className="btn btn-sm btn-ghost" onClick={() => remove(p.id)} aria-label={`Quitar ${p.nombre} de favoritos`}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TIPO = { ganados: ['Ganados', 'badge-ok'], canjeados: ['Canjeados', 'badge-info'], devueltos: ['Devueltos', 'badge-ok'], revertidos: ['Revertidos', 'badge-warn'], ajuste: ['Ajuste', ''] }

function Puntos() {
  const { money, puntos: cfg } = useStore()
  const [page, setPage] = useState(1)
  const { data, error, loading, reload } = useFetch(() => get('/puntos', { page, per_page: 15 }), [page])
  const n = (x) => new Intl.NumberFormat('es-CL').format(x)
  if (loading && !data) return <Spinner />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <h1 className="page-title">{cfg.nombre || 'Mis puntos'}</h1>
      {!data.config.activo && <div className="alert alert-info"><Icon name="info" size={18} />El programa de puntos está pausado. Tu saldo se conserva.</div>}
      <div className="points-hero">
        <div className="points-stat main"><div className="xs muted">Saldo disponible</div><div className="big">{n(data.saldo)}</div><div className="small muted">Equivale a {money(data.valor_saldo)}</div></div>
        <div className="points-stat"><div className="xs muted">Por acreditar</div><div className="big">{n(data.por_acreditar)}</div><div className="small muted">De pedidos pendientes de pago</div></div>
      </div>
      <div className="card stack" style={{ '--gap': '8px' }}>
        <strong>¿Cómo funciona?</strong>
        <PointsRules />
        {data.saldo >= cfg.minimo_canje && cfg.activo && <Link className="btn btn-dark btn-sm" style={{ alignSelf: 'start', marginTop: 6 }} to="/carrito">Usar mis puntos en una compra</Link>}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <h2 style={{ fontSize: 'var(--fs-lg)', padding: '18px 20px 6px' }}>Historial</h2>
        {data.movimientos.items.length === 0 ? <Empty icon="star" title="Aún no tienes movimientos">Tus compras pagadas sumarán puntos automáticamente.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Fecha</th><th>Detalle</th><th>Tipo</th><th className="r">Puntos</th></tr></thead>
            <tbody>{data.movimientos.items.map((m) => (
              <tr key={m.id}>
                <td className="small muted">{dateTime(m.created_at)}</td>
                <td className="small">{m.orden_id ? <Link className="link" to={`/cuenta/pedidos/${m.orden_id}`}>{m.descripcion}</Link> : m.descripcion}</td>
                <td><span className={`badge ${TIPO[m.tipo]?.[1] || ''}`}>{TIPO[m.tipo]?.[0] || m.tipo}</span></td>
                <td className="r num strong" style={{ color: m.puntos > 0 ? 'var(--ok)' : 'var(--ink-2)' }}>{m.puntos > 0 ? '+' : ''}{n(m.puntos)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <Pagination page={page} totalPages={data.movimientos.total_pages} onChange={setPage} />
    </div>
  )
}
