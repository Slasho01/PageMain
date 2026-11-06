import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { post } from '../api'
import { useAuth } from '../auth'
import Icon from '../components/Icon'
import { useBenefits } from '../components/Benefits'
import { Field } from '../components/ui'
import { usePageMeta } from '../seo'
import { useStore } from '../store'

function AuthLayout({ title, subtitle, children }) {
  const { tienda } = useStore()
  const benefits = useBenefits()
  usePageMeta({ title, store: tienda.nombre, noindex: true })
  const perks = [
    { icon: 'receipt', title: 'Sigue tus pedidos', text: 'Estado de pago y envío en tiempo real.' },
    { icon: 'pin', title: 'Compra más rápido', text: 'Guarda tus direcciones y datos.' },
    { icon: 'heart', title: 'Guarda favoritos', text: 'Vuelve a tus productos cuando quieras.' },
    ...benefits.slice(0, 2).map((b) => ({ icon: b.icon, title: b.title, text: b.text })),
  ]
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Link to="/" className="logo" style={{ color: '#fff' }}><span className="logo-mark" style={{ background: '#fff', color: 'var(--ink)' }}><Icon name="zap" /></span>{tienda.nombre}</Link>
        <div className="stack" style={{ '--gap': '20px' }}>
          <h2>Tu cuenta en {tienda.nombre}</h2>
          <ul>{perks.map((p, i) => <li key={i}><Icon name={p.icon} size={18} /><span><strong style={{ color: '#fff' }}>{p.title}</strong>{p.text && <><br /><span style={{ opacity: .75 }}>{p.text}</span></>}</span></li>)}</ul>
        </div>
        <span className="xs" style={{ opacity: .6 }}>© {new Date().getFullYear()} {tienda.nombre}</span>
      </aside>
      <div className="auth-main">
        <div className="stack" style={{ '--gap': '20px' }}>
          <div><h1 className="page-title">{title}</h1>{subtitle && <p className="muted" style={{ margin: 0 }}>{subtitle}</p>}</div>
          {children}
        </div>
      </div>
    </div>
  )
}

function PasswordInput({ value, onChange, autoComplete, minLength }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={minLength} style={{ paddingRight: 48, width: '100%' }} />
      <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{ position: 'absolute', right: 2, top: 1 }}><Icon name="eye" size={18} /></button>
    </div>
  )
}

export function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [need2fa, setNeed2fa] = useState(false)
  const [codigo, setCodigo] = useState('')
  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      const r = await login(form.username, form.password, need2fa ? codigo : undefined)
      if (r?.twofa_required) { setNeed2fa(true); setBusy(false); return }
      navigate(from, { replace: true })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <AuthLayout title="Iniciar sesión" subtitle="Bienvenido de vuelta.">
      <form className="form" onSubmit={submit}>
        {error && <div className="alert alert-bad" role="alert"><Icon name="alert" size={18} />{error}</div>}
        <Field label="Email o usuario"><input autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus /></Field>
        <label className="field">
          <span className="row between"><span>Contraseña</span><Link className="link xs" to="/recuperar">¿La olvidaste?</Link></span>
          <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
        </label>
        {need2fa && (
          <Field label="Código de verificación (2FA)"><input inputMode="numeric" autoComplete="one-time-code" placeholder="6 dígitos" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus /></Field>
        )}
        <button className="btn btn-dark btn-lg btn-block" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>¿Primera vez aquí? <Link className="link" to="/registro" state={location.state}>Crea tu cuenta</Link></p>
      </form>
    </AuthLayout>
  )
}

export function Register() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/" replace />
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null)
    try { await register(form); navigate(location.state?.from || '/', { replace: true }) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <AuthLayout title="Crear cuenta" subtitle="Toma menos de un minuto.">
      <form className="form" onSubmit={submit}>
        {error && <div className="alert alert-bad" role="alert"><Icon name="alert" size={18} />{error}</div>}
        <Field label="Email"><input type="email" autoComplete="email" value={form.email} onChange={set('email')} required autoFocus /></Field>
        <Field label="Nombre de usuario" hint="3 a 50 caracteres: letras, números, '_', '.' o '-'"><input autoComplete="username" value={form.username} onChange={set('username')} required minLength={3} maxLength={50} /></Field>
        <label className="field"><span>Contraseña</span><PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} /><span className="hint">Mínimo 8 caracteres.</span></label>
        <button className="btn btn-dark btn-lg btn-block" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>¿Ya tienes cuenta? <Link className="link" to="/login" state={location.state}>Inicia sesión</Link></p>
      </form>
    </AuthLayout>
  )
}

export function Forgot() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null)
    try { setSent((await post('/auth/forgot', { email })).message) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <AuthLayout title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una nueva.">
      {sent ? (
        <div className="stack">
          <div className="alert alert-ok"><Icon name="mail" size={18} />{sent}</div>
          <p className="small muted">Revisa también tu carpeta de spam. El enlace vence en 60 minutos.</p>
          <Link className="btn btn-block" to="/login">Volver a iniciar sesión</Link>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          {error && <div className="alert alert-bad"><Icon name="alert" size={18} />{error}</div>}
          <Field label="Email de tu cuenta"><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
          <button className="btn btn-dark btn-lg btn-block" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
          <Link className="link small" style={{ textAlign: 'center' }} to="/login">Volver a iniciar sesión</Link>
        </form>
      )}
    </AuthLayout>
  )
}

export function Reset() {
  const [sp] = useSearchParams()
  const token = sp.get('token') || ''
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (pw !== pw2) return setError('Las contraseñas no coinciden')
    setBusy(true); setError(null)
    try { await post('/auth/reset', { token, password: pw }); setDone(true) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <AuthLayout title="Nueva contraseña">
      {!token ? <div className="alert alert-bad"><Icon name="alert" size={18} />El enlace no es válido. <Link className="link" to="/recuperar">Solicita uno nuevo</Link></div>
        : done ? (
          <div className="stack">
            <div className="alert alert-ok"><Icon name="check" size={18} />Tu contraseña fue actualizada.</div>
            <Link className="btn btn-dark btn-lg btn-block" to="/login">Iniciar sesión</Link>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            {error && <div className="alert alert-bad"><Icon name="alert" size={18} /><span>{error} {error.includes('expiró') && <Link className="link" to="/recuperar">Solicitar otro enlace</Link>}</span></div>}
            <label className="field"><span>Nueva contraseña</span><PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} /></label>
            <label className="field"><span>Repite la contraseña</span><PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" minLength={8} /></label>
            <button className="btn btn-dark btn-lg btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}
    </AuthLayout>
  )
}
