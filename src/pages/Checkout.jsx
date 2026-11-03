import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { get, post } from '../api'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import Icon from '../components/Icon'
import { Field, ProductThumb, Spinner } from '../components/ui'
import { usePageMeta } from '../seo'
import { metodosPara, payWithMercadoPago } from '../lib/payments'
import { useStore } from '../store'

const EMPTY_ADDR = { titulo: '', direccion: '', ciudad: '', estado: '', codigo_postal: '', telefono: '' }

function Step({ n, title, state, onEdit, summary, children }) {
  return (
    <section className={`step ${state}`} aria-labelledby={`step-${n}`}>
      <div className="step-head">
        <span className="step-num">{state === 'done' ? <Icon name="check" size={16} /> : n}</span>
        <h2 id={`step-${n}`}>{title}</h2>
        {state === 'done' && onEdit && <button className="linklike small" onClick={onEdit}>Editar</button>}
      </div>
      {state === 'active' && <div className="step-body">{children}</div>}
      {state === 'done' && summary && <div className="step-summary">{summary}</div>}
    </section>
  )
}

export default function Checkout() {
  const { user } = useAuth()
  const { cart, loaded, refresh } = useCart()
  const store = useStore()
  const { tienda, money, pais, paises, setPais, moneda } = store
  const pagos = metodosPara(store.pagos, pais?.codigo)
  const navigate = useNavigate()
  usePageMeta({ title: 'Finalizar compra', store: tienda.nombre, noindex: true })

  const [step, setStep] = useState(1)
  const [buyer, setBuyer] = useState({ nombre: '', email: user?.email || '', telefono: '' })
  const [addrs, setAddrs] = useState(null)
  const [addrId, setAddrId] = useState('')
  const [addr, setAddr] = useState(EMPTY_ADDR)
  const [saveAddr, setSaveAddr] = useState(true)
  const [metodoEnvio, setMetodoEnvio] = useState('')
  const [comuna, setComuna] = useState('')
  const [metodoPago, setMetodoPago] = useState(pagos[0]?.id || '')
  const [cupon, setCupon] = useState('')
  const [cuponApplied, setCuponApplied] = useState('')
  const [usarPuntos, setUsarPuntos] = useState(0)
  const [tipoDoc, setTipoDoc] = useState('boleta')
  const [factura, setFactura] = useState({ rut: '', razon_social: '', giro: '', direccion: '' })
  const [quote, setQuote] = useState(null)
  const [quoteErr, setQuoteErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const quoteSeq = useRef(0)

  // Precarga: perfil y direcciones guardadas
  useEffect(() => {
    get('/perfil/mi-perfil').then((p) => setBuyer((b) => ({ ...b, nombre: b.nombre || `${p.nombre} ${p.apellido}`.trim(), telefono: b.telefono || p.telefono || '' }))).catch(() => {})
    get('/direcciones').then((d) => { setAddrs(d); if (d.length) setAddrId(d[0].id) }).catch(() => setAddrs([]))
  }, [])
  useEffect(() => {
    if (!pagos.some((m) => m.id === metodoPago)) setMetodoPago(pagos[0]?.id || '')
  }, [pagos, metodoPago])

  // Cotización en el servidor (precios, cupón y envío reales)
  useEffect(() => {
    if (!loaded || !cart.items.length || !pais) return
    const seq = ++quoteSeq.current
    post('/ordenes/cotizar', { pais: pais.codigo, metodo_envio: metodoEnvio || undefined, comuna: comuna || undefined, cupon: cuponApplied || undefined, puntos: usarPuntos || 0 })
      .then((q) => {
        if (seq !== quoteSeq.current) return
        setQuote(q); setQuoteErr(null)
        if (q.metodos_envio.length && !q.metodos_envio.some((m) => m.id === metodoEnvio)) setMetodoEnvio(q.metodos_envio[0].id)
      })
      .catch((e) => seq === quoteSeq.current && setQuoteErr(e))
  }, [loaded, cart.total, cart.total_items, pais?.codigo, metodoEnvio, comuna, cuponApplied, usarPuntos]) // eslint-disable-line react-hooks/exhaustive-deps
  // Si cambia el tope (p. ej. por un cupón), ajustar los puntos elegidos
  useEffect(() => {
    if (quote && usarPuntos > quote.puntos.max_usables) setUsarPuntos(quote.puntos.max_usables)
  }, [quote, usarPuntos])

  const selectedAddr = addrs?.find((a) => a.id === addrId)
  const usingSaved = !!selectedAddr && addrId !== 'nueva'
  const addrText = usingSaved
    ? [selectedAddr.direccion, selectedAddr.ciudad, selectedAddr.estado, selectedAddr.codigo_postal].filter(Boolean).join(', ')
    : [addr.direccion, addr.ciudad, addr.estado, addr.codigo_postal].filter(Boolean).join(', ')
  const metodoPagoObj = pagos.find((m) => m.id === metodoPago)
  const metodoEnvioObj = quote?.metodos_envio.find((m) => m.id === metodoEnvio)
  const facturaIncompleta = pais?.codigo === 'CL' && tipoDoc === 'factura' && Object.values(factura).some((v) => !v.trim())

  const step1Valid = buyer.nombre.trim() && /\S+@\S+\.\S+/.test(buyer.email)
  const step2Valid = (usingSaved || addr.direccion.trim()) && (quote?.envio_a_coordinar || metodoEnvio)

  const placeOrder = async () => {
    setBusy(true); setError(null)
    try {
      let direccion_id = usingSaved ? addrId : undefined
      if (!usingSaved && saveAddr) {
        const saved = await post('/direcciones', { ...addr, pais: pais.nombre, titulo: addr.titulo || 'Envío' })
        direccion_id = saved.id
      }
      const orden = await post('/ordenes', {
        pais: pais.codigo,
        direccion_id,
        direccion_envio: direccion_id ? undefined : `${addrText}, ${pais.nombre}`,
        metodo_envio: quote?.envio_a_coordinar ? undefined : metodoEnvio,
        comuna: comuna || undefined,
        metodo_pago: metodoPago || undefined,
        moneda: moneda.codigo,
        cupon: cuponApplied || undefined,
        puntos: usarPuntos || 0,
        nombre_comprador: buyer.nombre,
        email_comprador: buyer.email,
        telefono_comprador: buyer.telefono || undefined,
        // Documento tributario: sólo Chile
        ...(pais?.codigo === 'CL' ? {
          tipo_documento: tipoDoc,
          ...(tipoDoc === 'factura' ? {
            factura_rut: factura.rut,
            factura_razon_social: factura.razon_social,
            factura_giro: factura.giro,
            factura_direccion: factura.direccion,
          } : {}),
        } : {}),
      })
      await refresh()
      if (orden.pago_proveedor === 'mercadopago') {
        try { await payWithMercadoPago(orden.id); return } // redirige a Mercado Pago
        catch (e) { navigate(`/pedido/${orden.id}?pago=error`, { replace: true, state: { error: e.message } }); return }
      }
      navigate(`/pedido/${orden.id}`, { replace: true })
    } catch (e) {
      setError(e.message)
      refresh()
    } finally { setBusy(false) }
  }

  const items = useMemo(() => cart.items, [cart.items])
  if (!loaded) return <Spinner />
  if (!items.length && !busy) return <Navigate to="/carrito" replace />

  const st = (n) => (step === n ? 'active' : step > n ? 'done' : 'todo')

  return (
    <>
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Finalizar compra</h1>
        <Link to="/carrito" className="link small">← Volver al carrito</Link>
      </div>
      <div className="two-col">
        <div>
          <Step n={1} title="Tus datos" state={st(1)} onEdit={() => setStep(1)}
            summary={<>{buyer.nombre} · {buyer.email}{buyer.telefono && ` · ${buyer.telefono}`}</>}>
            <form className="form" onSubmit={(e) => { e.preventDefault(); if (step1Valid) setStep(2) }}>
              <div className="form-grid">
                <Field label="Nombre completo"><input value={buyer.nombre} onChange={(e) => setBuyer({ ...buyer, nombre: e.target.value })} autoComplete="name" required /></Field>
                <Field label="Email" hint="Te enviaremos la confirmación del pedido"><input type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} autoComplete="email" required /></Field>
                <Field label="Teléfono (opcional)"><input type="tel" value={buyer.telefono} onChange={(e) => setBuyer({ ...buyer, telefono: e.target.value })} autoComplete="tel" /></Field>
              </div>
              <div><button className="btn btn-dark btn-lg" disabled={!step1Valid}>Continuar a entrega</button></div>
            </form>
          </Step>

          <Step n={2} title="Entrega" state={st(2)} onEdit={() => setStep(2)}
            summary={<>{addrText}, {pais?.nombre} · {quote?.envio_a_coordinar ? 'Despacho a coordinar' : `${metodoEnvioObj?.nombre || ''} (${metodoEnvioObj?.costo === 0 ? 'gratis' : money(metodoEnvioObj?.costo)})`}</>}>
            <div className="form">
              {paises.length > 1 && (
                <Field label="País de entrega">
                  <select value={pais?.codigo} onChange={(e) => { setPais(e.target.value); setMetodoEnvio(''); setComuna('') }}>
                    {paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
                  </select>
                </Field>
              )}
              {pais?.modo === 'courier' && (
                <Field label="Comuna de destino" hint="La usamos para cotizar el despacho a domicilio con el courier. Si la dejas vacía, verás las demás opciones (p. ej. retiro en tienda).">
                  <input value={comuna} onChange={(e) => { setComuna(e.target.value); setMetodoEnvio('') }} placeholder="Ej: Providencia" autoComplete="address-level2" />
                </Field>
              )}
              {addrs?.length > 0 && (
                <div className="stack" style={{ '--gap': '8px' }}>
                  <span className="label">Dirección</span>
                  {addrs.map((a) => (
                    <label key={a.id} className={`choice ${addrId === a.id ? 'on' : ''}`}>
                      <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                      <span><strong>{a.titulo || 'Dirección'}</strong><br /><span className="small muted">{[a.direccion, a.ciudad, a.estado, a.pais].filter(Boolean).join(', ')}</span></span>
                    </label>
                  ))}
                  <label className={`choice ${addrId === 'nueva' ? 'on' : ''}`}>
                    <input type="radio" name="addr" checked={addrId === 'nueva'} onChange={() => setAddrId('nueva')} />
                    <span className="strong">Usar otra dirección</span>
                  </label>
                </div>
              )}
              {(!addrs?.length || addrId === 'nueva') && (
                <div className="form-grid">
                  <Field label="Calle y número" className="full"><input value={addr.direccion} onChange={(e) => setAddr({ ...addr, direccion: e.target.value })} autoComplete="street-address" required /></Field>
                  <Field label="Comuna / Ciudad"><input value={addr.ciudad} onChange={(e) => setAddr({ ...addr, ciudad: e.target.value })} autoComplete="address-level2" /></Field>
                  <Field label="Región / Estado"><input value={addr.estado} onChange={(e) => setAddr({ ...addr, estado: e.target.value })} autoComplete="address-level1" /></Field>
                  <Field label="Código postal (opcional)"><input value={addr.codigo_postal} onChange={(e) => setAddr({ ...addr, codigo_postal: e.target.value })} autoComplete="postal-code" /></Field>
                  <label className="check" style={{ gridColumn: '1 / -1' }}><input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} />Guardar esta dirección en mi cuenta</label>
                </div>
              )}

              <div className="stack" style={{ '--gap': '8px' }}>
                <span className="label">Método de envío</span>
                {quoteErr && <div className="alert alert-bad"><Icon name="alert" size={18} />{quoteErr.message}</div>}
                {!quote && !quoteErr && <span className="muted small">Calculando opciones…</span>}
                {quote?.envio_a_coordinar && (
                  <div className="alert alert-info"><Icon name="info" size={18} />Para {pais?.nombre} coordinaremos el despacho y su costo contigo después de la compra. No se cobra envío ahora.</div>
                )}
                {quote?.metodos_envio.map((m) => (
                  <label key={m.id} className={`choice ${metodoEnvio === m.id ? 'on' : ''}`}>
                    <input type="radio" name="envio" checked={metodoEnvio === m.id} onChange={() => setMetodoEnvio(m.id)} />
                    <span className="grow">
                      <span className="row between"><strong>{m.nombre}</strong><strong className="num">{m.costo === 0 ? 'Gratis' : money(m.costo)}</strong></span>
                      <span className="small muted">
                        {[m.plazo, m.descripcion, m.costo === 0 && m.precio_normal > 0 ? `Normalmente ${money(m.precio_normal)}` : null,
                          m.gratis_desde != null && m.costo > 0 ? `Gratis desde ${money(m.gratis_desde)}` : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div><button className="btn btn-dark btn-lg" disabled={!step2Valid} onClick={() => setStep(3)}>Continuar al pago</button></div>
            </div>
          </Step>

          <Step n={3} title="Pago" state={st(3)}>
            <div className="form">
              {pais?.codigo === 'CL' && (
                <div className="stack" style={{ '--gap': '10px' }}>
                  <span className="label">Documento tributario</span>
                  <div className="row" style={{ '--gap': '10px' }}>
                    {[['boleta', 'Boleta', 'Para consumidor final'], ['factura', 'Factura', 'Con datos de tu empresa']].map(([v, t, d]) => (
                      <label key={v} className={`choice grow ${tipoDoc === v ? 'on' : ''}`}>
                        <input type="radio" name="doc" checked={tipoDoc === v} onChange={() => setTipoDoc(v)} />
                        <span><strong>{t}</strong><br /><span className="xs muted">{d}</span></span>
                      </label>
                    ))}
                  </div>
                  {tipoDoc === 'factura' && (
                    <div className="form-grid">
                      <Field label="RUT" hint="Ej: 12.345.678-5"><input value={factura.rut} onChange={(e) => setFactura({ ...factura, rut: e.target.value })} placeholder="12.345.678-5" /></Field>
                      <Field label="Razón social"><input value={factura.razon_social} onChange={(e) => setFactura({ ...factura, razon_social: e.target.value })} /></Field>
                      <Field label="Giro"><input value={factura.giro} onChange={(e) => setFactura({ ...factura, giro: e.target.value })} /></Field>
                      <Field label="Dirección de facturación" className="full"><input value={factura.direccion} onChange={(e) => setFactura({ ...factura, direccion: e.target.value })} /></Field>
                    </div>
                  )}
                </div>
              )}
              {pagos.length === 0 ? (
                <div className="alert alert-info"><Icon name="info" size={18} />Al confirmar, la tienda te contactará para coordinar el pago. Tu pedido quedará reservado como pendiente.</div>
              ) : pagos.map((m) => (
                <label key={m.id} className={`choice ${metodoPago === m.id ? 'on' : ''}`}>
                  <input type="radio" name="pago" checked={metodoPago === m.id} onChange={() => setMetodoPago(m.id)} />
                  <span className="grow">
                    <span className="row between"><strong>{m.nombre}</strong>{m.tipo === 'mercadopago' && <span className="badge badge-info">Pago online</span>}</span>
                    <span className="small muted">
                      {m.tipo === 'mercadopago' ? 'Tarjetas de crédito y débito, saldo Mercado Pago. Te llevaremos a su sitio seguro para pagar.'
                        : m.instrucciones ? 'Recibirás las instrucciones de pago al confirmar.' : 'La tienda te contactará para coordinar el pago.'}
                    </span>
                  </span>
                </label>
              ))}
              {error && <div className="alert alert-bad" role="alert"><Icon name="alert" size={18} />{error}</div>}
              <button className="btn btn-primary btn-lg btn-block" onClick={placeOrder} disabled={busy || !quote || (pagos.length > 0 && !metodoPagoObj) || facturaIncompleta}>
                <Icon name="lock" size={18} />{busy ? 'Procesando…' : metodoPagoObj?.tipo === 'mercadopago' ? `Pagar con Mercado Pago · ${quote ? money(quote.total) : ''}` : `Confirmar pedido · ${quote ? money(quote.total) : ''}`}
              </button>
              {facturaIncompleta && <p className="xs" style={{ textAlign: 'center', margin: 0, color: 'var(--bad)' }}>Completa los datos de facturación para continuar.</p>}
              <p className="xs muted" style={{ textAlign: 'center', margin: 0 }}>
                Al confirmar, reservamos el stock y tu pedido queda pendiente de pago. Puedes cancelarlo mientras esté pendiente.
              </p>
            </div>
          </Step>
        </div>

        <aside className="sticky-col card stack" style={{ '--gap': '6px' }} aria-label="Resumen del pedido">
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 6 }}>Tu pedido</h2>
          <div className="stack" style={{ '--gap': '10px', maxHeight: 280, overflowY: 'auto', paddingBottom: 6 }}>
            {items.map((i) => (
              <div key={i.id} className="row nowrap" style={{ '--gap': '10px' }}>
                <div style={{ position: 'relative' }}>
                  <ProductThumb src={i.imagen} alt="" className="thumb sm" />
                  <span className="badge badge-dark" style={{ position: 'absolute', top: -6, right: -6, padding: '1px 6px' }}>{i.cantidad}</span>
                </div>
                <div className="grow small"><div className="strong" style={{ lineHeight: 1.3 }}>{i.nombre}</div>{i.variante && <div className="muted xs">{i.variante}</div>}</div>
                <span className="small num">{money(i.subtotal)}</span>
              </div>
            ))}
          </div>
          <form className="row nowrap" style={{ '--gap': '8px', marginBlock: 8 }} onSubmit={(e) => { e.preventDefault(); setCuponApplied(cupon.trim()) }}>
            <input className="input" value={cupon} onChange={(e) => setCupon(e.target.value)} placeholder="Código de descuento" aria-label="Cupón" style={{ textTransform: 'uppercase' }} />
            <button className="btn" disabled={!cupon.trim()}>Aplicar</button>
          </form>
          {quote?.cupon && <div className="alert alert-ok"><Icon name="tag" size={16} /><span className="grow">Cupón {quote.cupon} aplicado</span><button className="linklike xs" onClick={() => { setCupon(''); setCuponApplied('') }}>Quitar</button></div>}
          {quote?.cupon_error && <div className="alert alert-bad"><Icon name="alert" size={16} />{quote.cupon_error}</div>}
          <div className="summary-row"><span>Subtotal</span><span className="num">{money(quote?.subtotal ?? cart.total)}</span></div>
          <PointsBox quote={quote} value={usarPuntos} onChange={setUsarPuntos} />
          {quote?.descuento > 0 && <div className="summary-row" style={{ color: 'var(--ok)' }}><span>Descuento cupón</span><span className="num">−{money(quote.descuento)}</span></div>}
          {quote?.puntos?.descuento > 0 && <div className="summary-row" style={{ color: 'var(--ok)' }}><span>Puntos ({fmtN(quote.puntos.usados)})</span><span className="num">−{money(quote.puntos.descuento)}</span></div>}
          <div className="summary-row"><span>Envío</span><span className="num">{!quote ? '…' : quote.envio_a_coordinar ? 'A coordinar' : !metodoEnvio ? '—' : quote.costo_envio === 0 ? 'Gratis' : money(quote.costo_envio)}</span></div>
          <div className="summary-row total"><span>Total</span><span className="num">{money(quote?.total ?? cart.total)}</span></div>
          {quote?.puntos?.activo && quote.puntos.ganara > 0 && (
            <span className="points-badge compact" style={{ alignSelf: 'start' }}><Icon name="star" size={14} />Ganarás <b>{fmtN(quote.puntos.ganara)} puntos</b> al pagar</span>
          )}
          {moneda.codigo !== store.base.codigo && <p className="xs muted" style={{ margin: 0 }}>Montos convertidos desde {store.base.codigo} a la tasa configurada por la tienda.</p>}
          <div className="secure-note" style={{ marginTop: 8 }}><Icon name="lock" size={14} />Precios y stock verificados por la tienda al confirmar</div>
        </aside>
      </div>
    </>
  )
}

const fmtN = (n) => new Intl.NumberFormat('es-CL').format(n)

/** Canje de puntos: control deslizante limitado por el saldo y el tope del programa. */
function PointsBox({ quote, value, onChange }) {
  const { money, puntos: cfg } = useStore()
  const p = quote?.puntos
  if (!p?.activo) return null
  if (p.saldo < p.minimo_canje || p.max_usables <= 0) {
    return p.saldo > 0
      ? <div className="panel xs muted">Tienes {fmtN(p.saldo)} puntos. Podrás canjearlos desde {fmtN(p.minimo_canje)}.</div>
      : null
  }
  const step = Math.max(1, Math.round(p.max_usables / 100))
  return (
    <div className="panel stack" style={{ '--gap': '8px' }}>
      <div className="row between">
        <span className="small strong row" style={{ '--gap': '6px' }}><Icon name="star" size={16} style={{ color: 'var(--star)' }} />{cfg.nombre}</span>
        <span className="xs muted">Saldo: {fmtN(p.saldo)} ({money(p.saldo * p.valor_punto)})</span>
      </div>
      <input type="range" min={0} max={p.max_usables} step={step} value={Math.min(value, p.max_usables)}
        onChange={(e) => onChange(Number(e.target.value))} aria-label="Puntos a usar" />
      <div className="row between" style={{ '--gap': '8px' }}>
        <label className="row nowrap" style={{ '--gap': '6px' }}>
          <input className="input" type="number" min={0} max={p.max_usables} value={value} style={{ width: 110, minHeight: 36 }}
            onChange={(e) => onChange(Math.max(0, Math.min(p.max_usables, Number(e.target.value) || 0)))} aria-label="Puntos a usar (número)" />
          <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>de {fmtN(p.max_usables)} máx.</span>
        </label>
        <div className="row nowrap" style={{ '--gap': '4px' }}>
          <button type="button" className="btn btn-sm" onClick={() => onChange(0)} disabled={!value}>Ninguno</button>
          <button type="button" className="btn btn-sm btn-dark" onClick={() => onChange(p.max_usables)} disabled={value === p.max_usables}>Usar máx.</button>
        </div>
      </div>
      {value > 0 && <span className="xs" style={{ color: 'var(--ok)' }}>Descuento de {money(value * p.valor_punto)}</span>}
      {p.error && <span className="xs" style={{ color: 'var(--bad)' }}>{p.error}</span>}
    </div>
  )
}
