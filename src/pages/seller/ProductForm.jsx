import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { del, get, post, put } from '../../api'
import Icon from '../../components/Icon'
import { ConfirmButton, ErrorBox, Field, ProductThumb, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import CategorySelect from '../../components/CategorySelect'
import ImageUploader from '../../components/ImageUploader'
import { productUrl } from '../../lib/catalog'
import { usePageMeta } from '../../seo'
import { useStore } from '../../store'
import { useToast } from '../../toast'

const EMPTY = {
  nombre: '', slug: '', marca: '', descripcion: '', precio: '', precio_anterior: '', stock: '0', sku: '', estatus: true,
  destacado: false, categoria_id: '', garantia_meses: '', compatibilidad: '', especificaciones: [],
  peso_kg: '', largo_cm: '', ancho_cm: '', alto_cm: '',
}
const EMPTY_VAR = { nombre: '', valor: '', stock: '0', precio_extra: '0' }
const EMPTY_IMG = { image_url: '', alt_text: '', is_main: false }

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = !!id
  const toast = useToast()
  const navigate = useNavigate()
  const { toBase, fromBase, base } = useStore()
  usePageMeta({ title: isEdit ? 'Editar producto' : 'Nuevo producto', noindex: true })
  const categorias = useFetch(() => get('/categorias'), [])
  const marcas = useFetch(() => get('/productos/facetas'), [])
  const product = useFetch(() => (isEdit ? get(`/productos/${id}`) : Promise.resolve(null)), [id])
  const [form, setForm] = useState(EMPTY)
  const [newVars, setNewVars] = useState([])
  const [newImgs, setNewImgs] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const p = product.data
    if (!p) return
    setForm({
      nombre: p.nombre, slug: p.slug, marca: p.marca || '', descripcion: p.descripcion || '', precio: fromBase(p.precio),
      precio_anterior: fromBase(p.precio_anterior), stock: String(p.stock), sku: p.sku || '', estatus: p.estatus,
      destacado: p.destacado, categoria_id: p.categoria_id || '', garantia_meses: p.garantia_meses ?? '',
      compatibilidad: p.compatibilidad || '', especificaciones: Array.isArray(p.especificaciones) ? p.especificaciones : [],
      peso_kg: p.peso_gramos != null ? String(p.peso_gramos / 1000) : '', largo_cm: p.largo_cm ?? '', ancho_cm: p.ancho_cm ?? '', alto_cm: p.alto_cm ?? '',
    })
  }, [product.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const setSpec = (i, k, v) => setForm({ ...form, especificaciones: form.especificaciones.map((s, j) => (j === i ? { ...s, [k]: v } : s)) })
  const step = base.decimales ? 1 / 10 ** base.decimales : 1

  const payload = () => ({
    nombre: form.nombre,
    marca: form.marca,
    descripcion: form.descripcion,
    precio: toBase(form.precio),
    precio_anterior: form.precio_anterior === '' ? null : toBase(form.precio_anterior),
    stock: Number(form.stock || 0),
    sku: form.sku,
    estatus: form.estatus,
    destacado: form.destacado,
    categoria_id: form.categoria_id || null,
    garantia_meses: form.garantia_meses === '' ? null : Number(form.garantia_meses),
    peso_gramos: form.peso_kg === '' ? null : Math.round(Number(form.peso_kg) * 1000),
    largo_cm: form.largo_cm === '' ? null : Number(form.largo_cm),
    ancho_cm: form.ancho_cm === '' ? null : Number(form.ancho_cm),
    alto_cm: form.alto_cm === '' ? null : Number(form.alto_cm),
    compatibilidad: form.compatibilidad,
    especificaciones: form.especificaciones.filter((s) => s.nombre.trim() || s.valor.trim()),
    ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
  })

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      if (isEdit) {
        const body = payload()
        if (!body.categoria_id) delete body.categoria_id // la API no admite quitar la categoría desde aquí
        await put(`/productos/${id}`, body)
        toast('Cambios guardados'); product.reload()
      } else {
        const p = await post('/productos', {
          ...payload(),
          marca: form.marca || null, descripcion: form.descripcion || null, sku: form.sku || null, compatibilidad: form.compatibilidad || null,
          variantes: newVars.map((v) => ({ nombre: v.nombre, valor: v.valor, stock: Number(v.stock || 0), precio_extra: toBase(v.precio_extra) || 0 })),
          imagenes: newImgs.filter((i) => i.image_url.trim()),
        })
        toast('Producto creado')
        navigate(`/vendedor/editar/${p.id}`, { replace: true })
      }
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (isEdit && product.loading && !product.data) return <Spinner />
  if (product.error) return <ErrorBox error={product.error} />

  return (
    <div className="stack" style={{ '--gap': '16px', maxWidth: 1000 }}>
      <div className="row between">
        <div>
          <Link className="link small" to="/vendedor">← Mis productos</Link>
          <h1 className="page-title" style={{ marginTop: 6 }}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>
        </div>
        {isEdit && product.data && <Link className="btn btn-sm" to={productUrl(product.data)}><Icon name="eye" size={16} />Ver en la tienda</Link>}
      </div>

      <form className="stack" style={{ '--gap': '16px' }} onSubmit={submit}>
        <section className="card form">
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>Información</h2>
          <div className="form-grid">
            <Field label="Nombre"><input value={form.nombre} onChange={set('nombre')} required maxLength={255} /></Field>
            <Field label="Marca">
              <input value={form.marca} onChange={set('marca')} list="marcas" maxLength={100} />
              <datalist id="marcas">{marcas.data?.marcas.map((m) => <option key={m.marca} value={m.marca} />)}</datalist>
            </Field>
            <Field label="Categoría"><CategorySelect value={form.categoria_id} onChange={(v) => setForm({ ...form, categoria_id: v })} /></Field>
            <Field label="SKU"><input value={form.sku} onChange={set('sku')} maxLength={255} /></Field>
          </div>
          <Field label="Descripción" hint="Texto original y útil: para qué sirve, qué incluye, a quién le conviene. Mejora el posicionamiento en buscadores.">
            <textarea value={form.descripcion} onChange={set('descripcion')} rows={6} />
          </Field>
          <Field label="URL del producto" hint={isEdit ? 'Si la cambias, la dirección anterior seguirá funcionando (redirige a la nueva).' : 'Opcional: se genera a partir del nombre.'}>
            <div className="row nowrap" style={{ '--gap': '6px' }}>
              <span className="small muted" style={{ whiteSpace: 'nowrap' }}>/producto/</span>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="se-genera-automaticamente" maxLength={160} />
            </div>
          </Field>
        </section>

        <section className="card form">
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>Precio e inventario</h2>
          <div className="form-grid">
            <Field label={`Precio (${base.codigo})`}><input type="number" min="0" step={step} value={form.precio} onChange={set('precio')} required /></Field>
            <Field label={`Precio anterior (${base.codigo})`} hint="Opcional. Si es mayor que el precio, se muestra como oferta.">
              <input type="number" min="0" step={step} value={form.precio_anterior} onChange={set('precio_anterior')} />
            </Field>
            <Field label="Stock"><input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required /></Field>
            <Field label="Garantía (meses)" hint="Vacío si no aplica"><input type="number" min="0" max="240" value={form.garantia_meses} onChange={set('garantia_meses')} /></Field>
          </div>
          <div className="row" style={{ '--gap': '24px' }}>
            <label className="check"><input type="checkbox" checked={form.estatus} onChange={set('estatus')} />Visible en la tienda</label>
            <label className="check"><input type="checkbox" checked={form.destacado} onChange={set('destacado')} />Destacado en la portada</label>
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--fs-md)', margin: '4px 0 2px' }}>Peso y dimensiones</h3>
            <p className="small muted" style={{ margin: '0 0 10px' }}>Se usan para calcular el envío (courier en Chile, por peso/tamaño en Venezuela). Si los dejas vacíos, se asume 1 kg. Los couriers cobran por el mayor entre el peso real y el volumétrico, así que conviene cargar las medidas del paquete.</p>
            <div className="form-grid">
              <Field label="Peso (kg)"><input type="number" min="0" step="0.01" value={form.peso_kg} onChange={set('peso_kg')} placeholder="1" /></Field>
              <Field label="Largo (cm)"><input type="number" min="0" step="1" value={form.largo_cm} onChange={set('largo_cm')} /></Field>
              <Field label="Ancho (cm)"><input type="number" min="0" step="1" value={form.ancho_cm} onChange={set('ancho_cm')} /></Field>
              <Field label="Alto (cm)"><input type="number" min="0" step="1" value={form.alto_cm} onChange={set('alto_cm')} /></Field>
            </div>
          </div>
        </section>

        <section className="card form">
          <div className="row between">
            <h2 style={{ fontSize: 'var(--fs-lg)' }}>Especificaciones técnicas</h2>
            <button type="button" className="btn btn-sm" onClick={() => setForm({ ...form, especificaciones: [...form.especificaciones, { nombre: '', valor: '' }] })}><Icon name="plus" size={16} />Agregar</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Se muestran en la ficha y se usan como filtros del catálogo (p. ej. “RAM: 16 GB”). Usa siempre el mismo nombre para la misma característica.</p>
          {form.especificaciones.map((s, i) => (
            <div key={i} className="editor-row">
              <Field label="Característica"><input value={s.nombre} onChange={(e) => setSpec(i, 'nombre', e.target.value)} placeholder="RAM" maxLength={100} /></Field>
              <Field label="Valor"><input value={s.valor} onChange={(e) => setSpec(i, 'valor', e.target.value)} placeholder="16 GB" maxLength={255} /></Field>
              <button type="button" className="icon-btn" onClick={() => setForm({ ...form, especificaciones: form.especificaciones.filter((_, j) => j !== i) })} aria-label="Quitar especificación"><Icon name="trash" size={18} /></button>
            </div>
          ))}
          <Field label="Compatibilidad" hint="Opcional: sistemas, modelos o equipos compatibles"><textarea value={form.compatibilidad} onChange={set('compatibilidad')} rows={3} /></Field>
        </section>

        {!isEdit && (
          <>
            <section className="card form">
              <div className="row between"><h2 style={{ fontSize: 'var(--fs-lg)' }}>Variantes <span className="muted small">(opcional)</span></h2>
                <button type="button" className="btn btn-sm" onClick={() => setNewVars([...newVars, EMPTY_VAR])}><Icon name="plus" size={16} />Agregar</button></div>
              {newVars.map((v, i) => (
                <VariantFields key={i} v={v} base={base} step={step} onChange={(nv) => setNewVars(newVars.map((x, j) => (j === i ? nv : x)))}
                  extra={<button type="button" className="icon-btn" onClick={() => setNewVars(newVars.filter((_, j) => j !== i))} aria-label="Quitar"><Icon name="trash" size={18} /></button>} />
              ))}
            </section>
            <section className="card form">
              <h2 style={{ fontSize: 'var(--fs-lg)' }}>Imágenes</h2>
              <ImageUploader nombre={form.nombre || 'producto'} onUploaded={(up) => setNewImgs((l) => [...l, { image_url: up.url, variantes: up.variantes, alt_text: form.nombre, is_main: l.length === 0 }])} />
              {newImgs.length > 0 && (
                <div className="img-tiles">
                  {newImgs.map((im, i) => (
                    <div key={i} className="img-tile">
                      <ProductThumb src={im.image_url} alt="" className="thumb" />
                      {im.is_main && <span className="badge badge-info" style={{ position: 'absolute', top: 6, left: 6 }}>Principal</span>}
                      <div className="tile-actions">
                        {!im.is_main && <button type="button" className="btn btn-sm" onClick={() => setNewImgs(newImgs.map((x, j) => ({ ...x, is_main: j === i })))}>Principal</button>}
                        <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setNewImgs(newImgs.filter((_, j) => j !== i))} aria-label="Quitar"><Icon name="trash" size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <UrlAdder onAdd={(url) => setNewImgs((l) => [...l, { image_url: url, alt_text: form.nombre, is_main: l.length === 0 }])} />
            </section>
          </>
        )}

        {error && <div className="alert alert-bad" role="alert"><Icon name="alert" size={18} />{error}</div>}
        <div className="row"><button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto'}</button></div>
      </form>

      {isEdit && product.data && (
        <>
          <ProductImages p={product.data} reload={product.reload} />
          <Complements p={product.data} />
          <ProductVariants p={product.data} reload={product.reload} base={base} step={step} />
        </>
      )}
    </div>
  )
}

function VariantFields({ v, onChange, extra, base, step }) {
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.value })
  return (
    <div className="editor-row">
      <Field label="Atributo"><input value={v.nombre} onChange={set('nombre')} placeholder="Color" required /></Field>
      <Field label="Valor"><input value={v.valor} onChange={set('valor')} placeholder="Negro" required /></Field>
      <Field label="Stock"><input type="number" min="0" value={v.stock} onChange={set('stock')} required /></Field>
      <Field label={`Precio extra (${base.codigo})`}><input type="number" min="0" step={step} value={v.precio_extra} onChange={set('precio_extra')} /></Field>
      {extra}
    </div>
  )
}

function ImageFields({ im, onChange, extra }) {
  return (
    <div className="editor-row">
      <Field label="URL de la imagen"><input type="url" value={im.image_url} onChange={(e) => onChange({ ...im, image_url: e.target.value })} placeholder="https://…" required /></Field>
      <Field label="Texto alternativo"><input value={im.alt_text} onChange={(e) => onChange({ ...im, alt_text: e.target.value })} placeholder="Describe la imagen" /></Field>
      <label className="check" style={{ minHeight: 44 }}><input type="checkbox" checked={im.is_main} onChange={(e) => onChange({ ...im, is_main: e.target.checked })} />Principal</label>
      {extra}
    </div>
  )
}

function ImageList({ images, onDelete }) {
  if (!images.length) return <p className="muted small" style={{ margin: 0 }}>Sin imágenes.</p>
  return (
    <div className="row" style={{ '--gap': '12px', alignItems: 'start' }}>
      {images.map((im) => (
        <div key={im.id} className="stack" style={{ '--gap': '6px', alignItems: 'center', width: 104 }}>
          <ProductThumb src={im.image_url} alt={im.alt_text} className="thumb" />
          {im.is_main && <span className="badge badge-info">Principal</span>}
          <ConfirmButton confirmText="¿Borrar?" onConfirm={() => onDelete(im)}>Borrar</ConfirmButton>
        </div>
      ))}
    </div>
  )
}

function ProductImages({ p, reload }) {
  const toast = useToast()
  const [im, setIm] = useState(EMPTY_IMG)
  const add = async (e) => { e.preventDefault(); try { await post(`/productos/${p.id}/imagenes`, im); setIm(EMPTY_IMG); reload() } catch (err) { toast.error(err) } }
  const remove = async (img) => { try { await del(`/imagenes/${img.id}`); reload() } catch (err) { toast.error(err) } }
  return (
    <section className="card form">
      <h2 style={{ fontSize: 'var(--fs-lg)' }}>Imágenes</h2>
      <p className="small muted" style={{ margin: 0 }}>Recomendado: fondo neutro, formato cuadrado y al menos 1200×1200 px. La primera marcada como principal se usa en el catálogo.</p>
      <ImageList images={p.imagenes} onDelete={remove} />
      <ImageUploader nombre={p.nombre} onUploaded={async (up) => {
        await post(`/productos/${p.id}/imagenes`, { image_url: up.url, variantes: up.variantes, alt_text: p.nombre, is_main: p.imagenes.length === 0 })
        reload()
      }} />
      <details><summary className="small link" style={{ cursor: 'pointer' }}>O agregar una imagen por URL</summary>
        <form onSubmit={add} style={{ marginTop: 10 }}><ImageFields im={im} onChange={setIm} extra={<button className="btn">Agregar</button>} /></form>
      </details>
    </section>
  )
}

function ProductVariants({ p, reload, base, step }) {
  const toast = useToast()
  const { toBase } = useStore()
  const [nv, setNv] = useState(EMPTY_VAR)
  const add = async (e) => {
    e.preventDefault()
    try {
      await post(`/productos/${p.id}/variantes`, { nombre: nv.nombre, valor: nv.valor, stock: Number(nv.stock || 0), precio_extra: toBase(nv.precio_extra) || 0 })
      setNv(EMPTY_VAR); reload(); toast('Variante agregada')
    } catch (err) { toast.error(err) }
  }
  return (
    <section className="card form">
      <h2 style={{ fontSize: 'var(--fs-lg)' }}>Variantes</h2>
      {p.variantes.length === 0 && <p className="muted small" style={{ margin: 0 }}>Sin variantes. Agrégalas si el producto tiene colores, capacidades, tallas, etc.</p>}
      {p.variantes.map((v) => <ExistingVariant key={v.id} v={v} base={base} step={step} reload={reload} />)}
      <strong className="small">Nueva variante</strong>
      <form onSubmit={add}><VariantFields v={nv} onChange={setNv} base={base} step={step} extra={<button className="btn">Agregar</button>} /></form>
    </section>
  )
}

function ExistingVariant({ v, reload, base, step }) {
  const toast = useToast()
  const { toBase, fromBase } = useStore()
  const [form, setForm] = useState({ nombre: v.nombre, valor: v.valor, stock: String(v.stock), precio_extra: fromBase(v.precio_extra) })
  const [img, setImg] = useState(EMPTY_IMG)
  const [open, setOpen] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    try { await put(`/variantes/${v.id}`, { nombre: form.nombre, valor: form.valor, stock: Number(form.stock || 0), precio_extra: toBase(form.precio_extra) || 0 }); toast('Variante guardada'); reload() } catch (err) { toast.error(err) }
  }
  const remove = async () => { try { await del(`/variantes/${v.id}`); reload() } catch (err) { toast.error(err) } }
  const addImg = async (e) => { e.preventDefault(); try { await post(`/variantes/${v.id}/imagenes`, img); setImg(EMPTY_IMG); reload() } catch (err) { toast.error(err) } }
  const delImg = async (im) => { try { await del(`/variantes/imagenes/${im.id}`); reload() } catch (err) { toast.error(err) } }
  return (
    <div className="stack" style={{ '--gap': '8px' }}>
      <form onSubmit={save}>
        <VariantFields v={form} onChange={setForm} base={base} step={step} extra={
          <span className="row nowrap" style={{ '--gap': '6px' }}>
            <button className="btn btn-sm btn-dark">Guardar</button>
            <ConfirmButton confirmText="¿Eliminar?" onConfirm={remove}>Eliminar</ConfirmButton>
          </span>} />
      </form>
      <button type="button" className="linklike small" style={{ alignSelf: 'start' }} onClick={() => setOpen((o) => !o)}>
        {open ? 'Ocultar imágenes' : `Imágenes de esta variante (${v.imagenes.length})`}
      </button>
      {open && (
        <div className="panel stack">
          <ImageList images={v.imagenes} onDelete={delImg} />
          <form onSubmit={addImg}><ImageFields im={img} onChange={setImg} extra={<button className="btn btn-sm">Agregar</button>} /></form>
        </div>
      )}
    </div>
  )
}

function Complements({ p }) {
  const toast = useToast()
  const { data, reload } = useFetch(() => get(`/productos/${p.id}/complementos`), [p.id])
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const selected = data?.sugeridos || []
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    const t = setTimeout(() => get('/productos', { q: q.trim(), per_page: 8 }).then((r) => setResults(r.items.filter((x) => x.id !== p.id))).catch(() => {}), 200)
    return () => clearTimeout(t)
  }, [q, p.id])
  const save = async (ids) => {
    try { await put(`/productos/${p.id}/complementos`, { ids }); reload(); toast('Complementos guardados') } catch (e) { toast.error(e) }
  }
  return (
    <section className="card form">
      <div>
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>Productos complementarios</h2>
        <p className="small muted" style={{ margin: '4px 0 0' }}>Aparecen en la ficha como “Completa tu compra” (p. ej. funda, cargador, mouse). Además, la tienda muestra automáticamente lo que se compra junto según pedidos reales.</p>
      </div>
      {selected.length > 0 && (
        <div className="chips" style={{ margin: 0 }}>
          {selected.map((x) => (
            <button key={x.id} type="button" className="chip" onClick={() => save(selected.filter((y) => y.id !== x.id).map((y) => y.id))} aria-label={`Quitar ${x.nombre}`}>
              {x.nombre}<Icon name="x" size={14} />
            </button>
          ))}
        </div>
      )}
      <div className="search-wrap" style={{ maxWidth: 'none', margin: 0 }}>
        <input className="input" placeholder="Buscar productos para agregar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar complementos" />
        {results.length > 0 && (
          <div className="sug-panel"><ul>
            {results.map((r) => (
              <li key={r.id}>
                <button type="button" className="sug-item linklike" style={{ width: '100%', color: 'inherit' }}
                  disabled={selected.some((x) => x.id === r.id)}
                  onClick={() => { setQ(''); save([...selected.map((x) => x.id), r.id]) }}>
                  <span className="sug-thumb">{r.imagen_principal ? <img src={r.imagen_principal} alt="" /> : <Icon name="image" size={16} />}</span>
                  <span className="grow" style={{ textAlign: 'left' }}>{r.nombre}</span>
                  {selected.some((x) => x.id === r.id) ? <span className="xs muted">Agregado</span> : <Icon name="plus" size={16} />}
                </button>
              </li>
            ))}
          </ul></div>
        )}
      </div>
    </section>
  )
}

function UrlAdder({ onAdd }) {
  const [url, setUrl] = useState('')
  return (
    <details><summary className="small link" style={{ cursor: 'pointer' }}>O agregar una imagen por URL</summary>
      <div className="row nowrap" style={{ marginTop: 10, '--gap': '8px' }}>
        <input className="input" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL de la imagen" />
        <button type="button" className="btn" disabled={!/^https?:\/\//.test(url)} onClick={() => { onAdd(url); setUrl('') }}>Agregar</button>
      </div>
    </details>
  )
}
