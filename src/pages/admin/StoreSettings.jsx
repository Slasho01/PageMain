import { useEffect, useState } from 'react'
import { get, post, put } from '../../api'
import Icon, { ICONS } from '../../components/Icon'
import { ErrorBox, Field, Spinner } from '../../components/ui'
import { useStore } from '../../store'
import { useToast } from '../../toast'

const BENEFIT_ICONS = ['truck', 'shield', 'refresh', 'lock', 'card', 'support', 'store', 'clock', 'zap', 'tag', 'package'].filter((i) => ICONS.includes(i))
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

function Section({ title, description, children, onSave, saving }) {
  return (
    <section className="card form">
      <div className="row between nowrap" style={{ alignItems: 'flex-start' }}>
        <div className="grow"><h2 style={{ fontSize: 'var(--fs-lg)' }}>{title}</h2>{description && <p className="small muted" style={{ margin: '4px 0 0', maxWidth: '75ch' }}>{description}</p>}</div>
        <button className="btn btn-dark" onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
      {children}
    </section>
  )
}

export default function StoreSettings() {
  const toast = useToast()
  const store = useStore()
  const [cfg, setCfg] = useState(null)
  const [smtp, setSmtp] = useState(null)
  const [status, setStatus] = useState({})
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    get('/admin/config').then((r) => {
      setCfg(Object.fromEntries(r.config.map((e) => [e.clave, e.valor])))
      setSmtp(r.smtp_configurado)
      setStatus({ mp: r.mercadopago_configurado, storage: r.almacenamiento_imagenes, bx: r.bluexpress_configurado })
    }).catch(setError)
  }, [])

  const save = (clave) => async () => {
    setSaving(clave)
    try {
      const saved = await put(`/admin/config/${clave}`, cfg[clave])
      setCfg((c) => ({ ...c, [clave]: saved.valor }))
      store.reload()
      toast('Configuración guardada')
    } catch (e) { toast.error(e) } finally { setSaving(null) }
  }
  const upd = (clave, fn) => setCfg((c) => ({ ...c, [clave]: fn(structuredClone(c[clave])) }))

  if (error) return <ErrorBox error={error} />
  if (!cfg) return <Spinner />
  const { tienda, monedas, envio, pagos } = cfg
  const smtpCfg = cfg.smtp || {}
  const base = monedas.lista.find((m) => m.codigo === monedas.base) || monedas.lista[0]
  const baseStep = base?.decimales ? 1 / 10 ** base.decimales : 1
  const toBase = (v) => (v === '' || v == null ? null : Math.round(Number(v) * 10 ** (base?.decimales || 0)))
  const fromBase = (v) => (v == null ? '' : v / 10 ** (base?.decimales || 0))

  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <div className={`alert ${smtp ? 'alert-ok' : 'alert-warn'}`}>
        <Icon name="mail" size={18} />
        <span>
          {smtp ? 'Correo activo: se envían confirmaciones, correos de estado del pedido y recuperación de contraseña.'
            : <>Correo en <b>modo desarrollo</b>: los emails se escriben en el log de la API y el cliente no los recibe. Configúralo abajo en <b>Correo (SMTP)</b>.</>}
        </span>
      </div>

      <div className={`alert ${status.mp ? 'alert-ok' : 'alert-info'}`}>
        <Icon name="card" size={18} />
        <span>{status.mp ? <>Mercado Pago <b>conectado</b>. Agrega abajo un medio de pago de tipo “Mercado Pago” (por ejemplo, sólo para Chile).</>
          : <>Mercado Pago <b>no configurado</b>. Para activarlo agrega <code>MP_ACCESS_TOKEN</code> (y <code>MP_WEBHOOK_SECRET</code>, <code>API_PUBLIC_URL</code>) al <code>.env</code> de la API. Mientras tanto, los medios de tipo Mercado Pago no se muestran a los clientes.</>}</span>
      </div>
      <div className="alert alert-info">
        <Icon name="image" size={18} />
        <span>Imágenes: {status.storage === 'cloudinary' ? <><b>Cloudinary</b> (WebP/AVIF automáticos).</> : <>almacenamiento <b>local</b> del servidor (WebP en 4 tamaños). Para usar Cloudinary agrega <code>CLOUDINARY_URL</code> al <code>.env</code> de la API.</>}</span>
      </div>

      <Section title="Datos de la tienda" description="Se muestran en el encabezado, el pie de página y los correos." onSave={save('tienda')} saving={saving === 'tienda'}>
        <div className="form-grid">
          <Field label="Nombre"><input value={tienda.nombre} onChange={(e) => upd('tienda', (t) => ({ ...t, nombre: e.target.value }))} /></Field>
          <Field label="Email de contacto"><input type="email" value={tienda.email} onChange={(e) => upd('tienda', (t) => ({ ...t, email: e.target.value }))} /></Field>
          <Field label="Teléfono"><input value={tienda.telefono} onChange={(e) => upd('tienda', (t) => ({ ...t, telefono: e.target.value }))} /></Field>
          <Field label="WhatsApp" hint="Con código de país, p. ej. +56 9 1234 5678"><input value={tienda.whatsapp} onChange={(e) => upd('tienda', (t) => ({ ...t, whatsapp: e.target.value }))} /></Field>
        </div>
        <Field label="Dirección / tienda física"><input value={tienda.direccion} onChange={(e) => upd('tienda', (t) => ({ ...t, direccion: e.target.value }))} /></Field>
        <Field label="Descripción breve" hint="Aparece en la portada, el pie y en buscadores"><textarea value={tienda.descripcion} rows={2} onChange={(e) => upd('tienda', (t) => ({ ...t, descripcion: e.target.value }))} /></Field>
        <div className="form-grid">
          {['instagram', 'facebook', 'tiktok', 'x'].map((r) => (
            <Field key={r} label={r === 'x' ? 'X (Twitter)' : r[0].toUpperCase() + r.slice(1)}>
              <input type="url" placeholder="https://…" value={tienda.redes?.[r] || ''} onChange={(e) => upd('tienda', (t) => ({ ...t, redes: { ...t.redes, [r]: e.target.value } }))} />
            </Field>
          ))}
        </div>
        <div className="stack" style={{ '--gap': '8px' }}>
          <div className="row between"><span className="label">Beneficios (franja de la portada)</span>
            <button type="button" className="btn btn-sm" onClick={() => upd('tienda', (t) => ({ ...t, beneficios: [...t.beneficios, { icono: 'truck', titulo: '', texto: '' }] }))}><Icon name="plus" size={16} />Agregar</button></div>
          <p className="hint" style={{ margin: 0 }}>Si no agregas ninguno, se muestran automáticamente los que se deducen de tu configuración (envío gratis, políticas publicadas, medios de pago). Escribe sólo lo que realmente ofreces.</p>
          {tienda.beneficios.map((b, i) => (
            <div key={i} className="editor-row">
              <Field label="Icono"><select value={b.icono} onChange={(e) => upd('tienda', (t) => { t.beneficios[i].icono = e.target.value; return t })}>{BENEFIT_ICONS.map((ic) => <option key={ic}>{ic}</option>)}</select></Field>
              <Field label="Título"><input value={b.titulo} onChange={(e) => upd('tienda', (t) => { t.beneficios[i].titulo = e.target.value; return t })} placeholder="Retiro gratis en tienda" /></Field>
              <Field label="Detalle"><input value={b.texto || ''} onChange={(e) => upd('tienda', (t) => { t.beneficios[i].texto = e.target.value; return t })} /></Field>
              <button type="button" className="icon-btn" aria-label="Quitar" onClick={() => upd('tienda', (t) => { t.beneficios.splice(i, 1); return t })}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Monedas" description={`Los precios se guardan en ${monedas.base}. Las demás monedas se muestran convertidas con la tasa que definas (unidades de esa moneda por 1 ${monedas.base}). Una moneda sin tasa no se ofrece.`}
        onSave={save('monedas')} saving={saving === 'monedas'}>
        {monedas.lista.map((m, i) => {
          const isBase = m.codigo === monedas.base
          return (
            <div key={i} className="editor-row">
              <Field label="Código"><input value={m.codigo} disabled={isBase} maxLength={3} onChange={(e) => upd('monedas', (x) => { x.lista[i].codigo = e.target.value.toUpperCase(); return x })} /></Field>
              <Field label="Nombre"><input value={m.nombre} onChange={(e) => upd('monedas', (x) => { x.lista[i].nombre = e.target.value; return x })} /></Field>
              <Field label="Símbolo"><input value={m.simbolo} onChange={(e) => upd('monedas', (x) => { x.lista[i].simbolo = e.target.value; return x })} /></Field>
              <Field label="Decimales"><input type="number" min="0" max="4" value={m.decimales} disabled={isBase} onChange={(e) => upd('monedas', (x) => { x.lista[i].decimales = Number(e.target.value); return x })} /></Field>
              <Field label={isBase ? 'Tasa (base)' : `Tasa por 1 ${monedas.base}`}>
                <input type="number" min="0" step="any" value={isBase ? 1 : m.tasa ?? ''} disabled={isBase} placeholder="Sin configurar"
                  onChange={(e) => upd('monedas', (x) => { x.lista[i].tasa = e.target.value === '' ? null : Number(e.target.value); return x })} />
              </Field>
              {isBase ? <span className="badge badge-dark" style={{ alignSelf: 'center' }}>Base</span>
                : <button type="button" className="icon-btn" aria-label="Quitar" onClick={() => upd('monedas', (x) => { x.lista.splice(i, 1); return x })}><Icon name="trash" size={18} /></button>}
            </div>
          )
        })}
        <div><button type="button" className="btn btn-sm" onClick={() => upd('monedas', (x) => ({ ...x, lista: [...x.lista, { codigo: 'USD', nombre: 'Dólar estadounidense', simbolo: 'US$', decimales: 2, tasa: null, locale: 'es-VE' }] }))}><Icon name="plus" size={16} />Agregar moneda</button></div>
      </Section>

      <Section title="Envíos" description={`Costos en ${monedas.base}. Elige por país cómo se calcula el envío: tarifas planas, cotización con courier (Blue Express), o por peso y tamaño.`}
        onSave={save('envio')} saving={saving === 'envio'}>
        {envio.paises.some((p) => p.modo === 'courier') && (
          <div className={`alert ${status.bx ? 'alert-ok' : 'alert-warn'}`}>
            <Icon name="truck" size={18} />
            <span>{status.bx
              ? <>Blue Express <b>conectado</b>: los pedidos con modo “courier” se cotizan en tiempo real.</>
              : <>Blue Express <b>no configurado</b>. Para activar la cotización agrega <code>BLUEEXPRESS_TOKEN</code> (y <code>BLUEEXPRESS_USERCODE</code>, <code>BLUEEXPRESS_CLIENT_ACCOUNT</code>) al <code>.env</code> de la API. Mientras tanto, los países en modo courier usan los métodos manuales como respaldo.</>}</span>
          </div>
        )}
        {envio.paises.map((p, pi) => {
          const modo = p.modo || 'manual'
          const setPais = (fn) => upd('envio', (x) => { fn(x.paises[pi]); return x })
          return (
          <div key={pi} className="panel stack">
            <div className="row between">
              <div className="row nowrap" style={{ '--gap': '8px' }}>
                <input className="input" style={{ width: 70 }} value={p.codigo} maxLength={2} aria-label="Código de país" onChange={(e) => setPais((pp) => { pp.codigo = e.target.value.toUpperCase() })} />
                <input className="input" value={p.nombre} aria-label="Nombre del país" onChange={(e) => setPais((pp) => { pp.nombre = e.target.value })} />
              </div>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => upd('envio', (x) => { x.paises.splice(pi, 1); return x })}>Quitar país</button>
            </div>
            <Field label="Cómo se calcula el envío">
              <select value={modo} onChange={(e) => setPais((pp) => {
                pp.modo = e.target.value
                if (pp.modo === 'courier' && !pp.courier) pp.courier = { origen: '', recargo: 0, gratis_desde: null }
                if (pp.modo === 'peso' && !pp.peso) pp.peso = { nombre: '', base: 0, precio_por_kg: 0, factor_volumetrico: 4000, gratis_desde: null, plazo: null }
              })}>
                <option value="manual">Tarifas planas (manual)</option>
                <option value="courier">Courier Blue Express (Chile)</option>
                <option value="peso">Por peso y tamaño</option>
              </select>
            </Field>

            {modo === 'courier' && (
              <div className="form-grid" style={{ background: 'var(--surface)', padding: 12, borderRadius: 10 }}>
                <Field label="Comuna de origen" hint="Desde dónde despachas (código de comuna de Blue Express, p. ej. STGO).">
                  <input value={p.courier?.origen || ''} onChange={(e) => setPais((pp) => { pp.courier = { ...pp.courier, origen: e.target.value.toUpperCase() } })} placeholder="STGO" />
                </Field>
                <Field label={`Recargo de la tienda (${monedas.base})`} hint="Margen que se suma a la tarifa del courier (0 para cobrar lo mismo).">
                  <input type="number" min="0" step={baseStep} value={fromBase(p.courier?.recargo)} onChange={(e) => setPais((pp) => { pp.courier = { ...pp.courier, recargo: toBase(e.target.value) ?? 0 } })} />
                </Field>
                <Field label="Envío gratis desde" hint="Opcional: sobre este subtotal el envío es gratis.">
                  <input type="number" min="0" step={baseStep} placeholder="—" value={fromBase(p.courier?.gratis_desde)} onChange={(e) => setPais((pp) => { pp.courier = { ...pp.courier, gratis_desde: toBase(e.target.value) } })} />
                </Field>
              </div>
            )}

            {modo === 'peso' && (
              <div className="form-grid" style={{ background: 'var(--surface)', padding: 12, borderRadius: 10 }}>
                <Field label="Nombre del envío"><input value={p.peso?.nombre || ''} placeholder="Envío nacional" onChange={(e) => setPais((pp) => { pp.peso = { ...pp.peso, nombre: e.target.value } })} /></Field>
                <Field label={`Cargo base (${monedas.base})`}><input type="number" min="0" step={baseStep} value={fromBase(p.peso?.base)} onChange={(e) => setPais((pp) => { pp.peso = { ...pp.peso, base: toBase(e.target.value) ?? 0 } })} /></Field>
                <Field label={`Precio por kg (${monedas.base})`} hint="Se cobra por cada kg facturable (el mayor entre peso real y volumétrico)."><input type="number" min="0" step={baseStep} value={fromBase(p.peso?.precio_por_kg)} onChange={(e) => setPais((pp) => { pp.peso = { ...pp.peso, precio_por_kg: toBase(e.target.value) ?? 0 } })} /></Field>
                <Field label="Factor volumétrico" hint="cm³ por kg. Blue Express usa 4000; úsalo si no sabes."><input type="number" min="1" value={p.peso?.factor_volumetrico ?? 4000} onChange={(e) => setPais((pp) => { pp.peso = { ...pp.peso, factor_volumetrico: Number(e.target.value) || 4000 } })} /></Field>
                <Field label="Envío gratis desde"><input type="number" min="0" step={baseStep} placeholder="—" value={fromBase(p.peso?.gratis_desde)} onChange={(e) => setPais((pp) => { pp.peso = { ...pp.peso, gratis_desde: toBase(e.target.value) } })} /></Field>
                <Field label="Plazo"><input value={p.peso?.plazo || ''} placeholder="3 a 5 días hábiles" onChange={(e) => setPais((pp) => { pp.peso = { ...pp.peso, plazo: e.target.value || null } })} /></Field>
              </div>
            )}

            <div className="small muted">
              {modo === 'manual' ? 'Tarifas planas que elige el cliente. Si no agregas ninguna, el país queda con “despacho a coordinar”.'
                : modo === 'courier' ? 'El cliente ingresa su comuna y se cotiza con Blue Express. Los métodos de abajo se usan como respaldo (p. ej. “retiro en tienda”) o si el courier no responde.'
                : 'Se calcula un único costo según el peso y el tamaño del pedido. Los métodos de abajo son opcionales (p. ej. retiro).'}
            </div>
            {p.metodos.map((m, mi) => (
              <div key={mi} className="editor-row" style={{ background: 'var(--surface)' }}>
                <Field label="Nombre"><input value={m.nombre} placeholder={modo === 'manual' ? 'Despacho estándar' : 'Retiro en tienda'} onChange={(e) => upd('envio', (x) => { const mm = x.paises[pi].metodos[mi]; mm.nombre = e.target.value; if (!mm._idEdited) mm.id = slug(e.target.value) || mm.id; return x })} /></Field>
                <Field label={`Costo (${monedas.base})`}><input type="number" min="0" step={baseStep} value={fromBase(m.precio)} onChange={(e) => upd('envio', (x) => { x.paises[pi].metodos[mi].precio = toBase(e.target.value) ?? 0; return x })} /></Field>
                <Field label="Gratis desde"><input type="number" min="0" step={baseStep} placeholder="—" value={fromBase(m.gratis_desde)} onChange={(e) => upd('envio', (x) => { x.paises[pi].metodos[mi].gratis_desde = toBase(e.target.value); return x })} /></Field>
                <Field label="Plazo"><input value={m.plazo || ''} placeholder="2-4 días hábiles" onChange={(e) => upd('envio', (x) => { x.paises[pi].metodos[mi].plazo = e.target.value || null; return x })} /></Field>
                <button type="button" className="icon-btn" aria-label="Quitar método" onClick={() => upd('envio', (x) => { x.paises[pi].metodos.splice(mi, 1); return x })}><Icon name="trash" size={18} /></button>
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => upd('envio', (x) => { x.paises[pi].metodos.push({ id: `metodo-${x.paises[pi].metodos.length + 1}`, nombre: '', precio: 0, gratis_desde: null, plazo: null }); return x })}><Icon name="plus" size={16} />{modo === 'manual' ? 'Método de envío' : 'Método de respaldo'}</button></div>
          </div>
        )})}
        <div><button type="button" className="btn btn-sm" onClick={() => upd('envio', (x) => ({ ...x, paises: [...x.paises, { codigo: '', nombre: '', modo: 'manual', metodos: [] }] }))}><Icon name="plus" size={16} />Agregar país</button></div>
      </Section>

      {cfg.puntos && (() => {
        const pt = cfg.puntos
        const ej = 100000 * 10 ** (base?.decimales || 0)
        const gan = pt.monto_base > 0 ? Math.floor(ej / pt.monto_base) * pt.puntos_por_monto : 0
        const valor = gan * pt.valor_punto
        const pct = ej ? (valor / ej) * 100 : 0
        const fmtB = (v) => `${base?.simbolo || '$'}${new Intl.NumberFormat('es-CL').format(v / 10 ** (base?.decimales || 0))}`
        const setP = (k, v) => upd('puntos', (x) => ({ ...x, [k]: v }))
        return (
          <Section title="Programa de puntos" description={`Los clientes ganan puntos por cada compra pagada y los canjean como descuento. Montos en ${monedas.base}.`}
            onSave={save('puntos')} saving={saving === 'puntos'}>
            <label className="check"><input type="checkbox" checked={pt.activo} onChange={(e) => setP('activo', e.target.checked)} />Programa activo (si lo pausas, los saldos se conservan pero no se ganan ni canjean puntos)</label>
            <div className="form-grid">
              <Field label="Nombre del programa"><input value={pt.nombre} onChange={(e) => setP('nombre', e.target.value)} maxLength={60} /></Field>
              <Field label="Puntos que se ganan"><input type="number" min="0" value={pt.puntos_por_monto} onChange={(e) => setP('puntos_por_monto', Number(e.target.value))} /></Field>
              <Field label={`Por cada (${monedas.base})`}><input type="number" min="1" step={baseStep} value={fromBase(pt.monto_base)} onChange={(e) => setP('monto_base', toBase(e.target.value) || 0)} /></Field>
              <Field label={`Valor de 1 punto (${monedas.base})`}><input type="number" min="0" step={baseStep} value={fromBase(pt.valor_punto)} onChange={(e) => setP('valor_punto', toBase(e.target.value) || 0)} /></Field>
              <Field label="Mínimo para canjear (puntos)"><input type="number" min="0" value={pt.minimo_canje} onChange={(e) => setP('minimo_canje', Number(e.target.value))} /></Field>
              <Field label="Máximo del pedido pagable con puntos (%)"><input type="number" min="0" max="100" value={pt.maximo_porcentaje} onChange={(e) => setP('maximo_porcentaje', Number(e.target.value))} /></Field>
            </div>
            <div className="alert alert-info"><Icon name="star" size={18} />
              <span>Ejemplo: una compra de {fmtB(ej)} en productos da <b>{gan} puntos</b>, que valen <b>{fmtB(valor)}</b> en la siguiente compra (un <b>{pct.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%</b> de retorno).
              El envío no suma puntos. Se acreditan al quedar el pedido pagado y se revierten si se cancela.</span>
            </div>
          </Section>
        )
      })()}

      <Section title="Medios de pago" description="Los que el cliente puede elegir al comprar. Las instrucciones (p. ej. datos de transferencia) se muestran al confirmar el pedido. Si no defines ninguno, el pago queda “a coordinar”."
        onSave={save('pagos')} saving={saving === 'pagos'}>
        {pagos.metodos.map((m, i) => (
          <div key={i} className="panel form">
            <div className="row between">
              <input className="input" style={{ maxWidth: 360 }} value={m.nombre} placeholder="Transferencia bancaria" aria-label="Nombre del medio de pago"
                onChange={(e) => upd('pagos', (x) => { x.metodos[i].nombre = e.target.value; x.metodos[i].id = slug(e.target.value) || x.metodos[i].id; return x })} />
              <button type="button" className="btn btn-sm btn-danger" onClick={() => upd('pagos', (x) => { x.metodos.splice(i, 1); return x })}>Quitar</button>
            </div>
            <div className="form-grid">
              <Field label="Tipo">
                <select value={m.tipo || 'manual'} onChange={(e) => upd('pagos', (x) => { x.metodos[i].tipo = e.target.value; return x })}>
                  <option value="manual">Manual (transferencia, Pago Móvil, efectivo…)</option>
                  <option value="mercadopago">Mercado Pago (pago online)</option>
                </select>
              </Field>
              <div className="field"><span>Disponible en</span>
                <div className="row" style={{ minHeight: 44 }}>
                  {envio.paises.map((p) => (
                    <label key={p.codigo} className="check">
                      <input type="checkbox" checked={!m.paises?.length || m.paises.includes(p.codigo)}
                        onChange={(e) => upd('pagos', (x) => {
                          const all = envio.paises.map((q) => q.codigo)
                          const cur = new Set(x.metodos[i].paises?.length ? x.metodos[i].paises : all)
                          e.target.checked ? cur.add(p.codigo) : cur.delete(p.codigo)
                          x.metodos[i].paises = cur.size === all.length ? [] : [...cur]
                          return x
                        })} />{p.nombre}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {m.tipo === 'mercadopago' ? <p className="hint" style={{ margin: 0 }}>El cliente paga con tarjetas o saldo en el sitio de Mercado Pago; el pedido se marca como pagado automáticamente.</p> : (
            <Field label="Instrucciones para el cliente"><textarea rows={3} value={m.instrucciones || ''} placeholder={'Banco …\nCuenta corriente …\nRUT / Cédula …\nEnvía el comprobante a …'} onChange={(e) => upd('pagos', (x) => { x.metodos[i].instrucciones = e.target.value || null; return x })} /></Field>)}
          </div>
        ))}
        <div><button type="button" className="btn btn-sm" onClick={() => upd('pagos', (x) => ({ ...x, metodos: [...x.metodos, { id: `pago-${x.metodos.length + 1}`, nombre: '', tipo: 'manual', paises: [], instrucciones: null }] }))}><Icon name="plus" size={16} />Agregar medio de pago</button></div>
      </Section>

      <Section title="Correo (SMTP)" description="Servidor de correo para confirmaciones, avisos de estado del pedido y recuperación de contraseña. Si lo dejas inactivo, se usan las variables SMTP del servidor (si existen) o el modo desarrollo."
        onSave={save('smtp')} saving={saving === 'smtp'}>
        <label className="check"><input type="checkbox" checked={!!smtpCfg.activo} onChange={(e) => upd('smtp', (x) => ({ ...x, activo: e.target.checked }))} />Usar este servidor para enviar correos</label>
        <div className="form-grid">
          <Field label="Servidor (host)" hint="Ej: smtp.tudominio.cl"><input value={smtpCfg.host || ''} onChange={(e) => upd('smtp', (x) => ({ ...x, host: e.target.value }))} placeholder="smtp.tudominio.cl" /></Field>
          <Field label="Puerto"><input type="number" value={smtpCfg.port || 587} onChange={(e) => upd('smtp', (x) => ({ ...x, port: Number(e.target.value) }))} /></Field>
          <Field label="Seguridad">
            <select value={smtpCfg.security || 'starttls'} onChange={(e) => upd('smtp', (x) => ({ ...x, security: e.target.value }))}>
              <option value="starttls">STARTTLS (puerto 587)</option>
              <option value="tls">SSL/TLS (puerto 465)</option>
              <option value="none">Sin cifrado (sólo pruebas)</option>
            </select>
          </Field>
          <Field label="Usuario"><input value={smtpCfg.usuario || ''} onChange={(e) => upd('smtp', (x) => ({ ...x, usuario: e.target.value }))} autoComplete="off" placeholder="no-reply@tudominio.cl" /></Field>
          <Field label="Contraseña" hint={smtpCfg.password_set ? 'Ya hay una guardada. Déjala vacía para no cambiarla.' : 'Contraseña de la casilla'}>
            <input type="password" value={smtpCfg.password || ''} onChange={(e) => upd('smtp', (x) => ({ ...x, password: e.target.value }))} autoComplete="new-password" placeholder={smtpCfg.password_set ? '•••••••• (sin cambios)' : ''} />
          </Field>
          <Field label="Nombre del remitente"><input value={smtpCfg.from_nombre || ''} onChange={(e) => upd('smtp', (x) => ({ ...x, from_nombre: e.target.value }))} placeholder="JarStore" /></Field>
          <Field label="Correo del remitente (from)" hint="Debe pertenecer a tu dominio"><input type="email" value={smtpCfg.from_email || ''} onChange={(e) => upd('smtp', (x) => ({ ...x, from_email: e.target.value }))} placeholder="no-reply@tudominio.cl" /></Field>
        </div>
        <div className="panel stack" style={{ '--gap': '8px' }}>
          <strong className="small">Probar la configuración</strong>
          <p className="xs muted" style={{ margin: 0 }}>Guarda primero los cambios y luego envía un correo de prueba. Si falla, verás el error exacto del servidor.</p>
          <div className="inline-form">
            <input className="input" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Correo donde recibir la prueba (opcional, por defecto el tuyo)" />
            <button type="button" className="btn" disabled={testing} onClick={async () => {
              setTesting(true)
              try { const r = await post('/admin/config/smtp/test', testEmail ? { email: testEmail } : {}); toast(r.message || 'Correo de prueba enviado') }
              catch (e) { toast.error(e) } finally { setTesting(false) }
            }}><Icon name="mail" size={16} />{testing ? 'Enviando…' : 'Enviar prueba'}</button>
          </div>
        </div>
      </Section>
    </div>
  )
}
