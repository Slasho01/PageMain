import { useState } from 'react'
import { post } from '../api'
import { useStore } from '../store'
import Icon from './Icon'

/** Suscripción con doble confirmación (el correo llega con un enlace para confirmar). */
export default function Newsletter() {
  const { tienda } = useStore()
  const [email, setEmail] = useState('')
  const [state, setState] = useState(null) // null | 'sending' | {ok, msg}
  const submit = async (e) => {
    e.preventDefault()
    setState('sending')
    try { setState({ ok: true, msg: (await post('/newsletter', { email })).message }); setEmail('') }
    catch (err) { setState({ ok: false, msg: err.message }) }
  }
  return (
    <section className="newsletter section" aria-labelledby="nl-title">
      <div>
        <div className="eyebrow" style={{ color: 'rgb(255 255 255 / 60%)' }}>Newsletter</div>
        <h2 id="nl-title">Entérate primero de ofertas y lanzamientos</h2>
        <p style={{ margin: '8px 0 0', opacity: .8 }}>Te escribiremos sólo cuando haya algo que valga la pena. Puedes darte de baja cuando quieras.</p>
      </div>
      <div className="stack" style={{ '--gap': '10px' }}>
        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="nl-email">Tu email</label>
          <input id="nl-email" type="email" required placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <button className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Suscribirme'}</button>
        </form>
        {state && state !== 'sending' && (
          <span className="small row" role="status" style={{ '--gap': '6px', color: state.ok ? '#7ee2a8' : '#ff9b93' }}>
            <Icon name={state.ok ? 'mail' : 'alert'} size={16} />{state.msg}
          </span>
        )}
        <span className="xs" style={{ opacity: .6 }}>Al suscribirte aceptas recibir correos de {tienda.nombre}.</span>
      </div>
    </section>
  )
}
