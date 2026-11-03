import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { post } from '../api'
import Icon from '../components/Icon'
import { Spinner } from '../components/ui'
import { usePageMeta } from '../seo'

/** /newsletter/confirmar?token=… y /newsletter/baja?token=… */
export default function NewsletterAction() {
  const [sp] = useSearchParams()
  const { pathname } = useLocation()
  const baja = pathname.endsWith('/baja')
  const [state, setState] = useState(null)
  usePageMeta({ title: baja ? 'Darse de baja' : 'Confirmar suscripción', noindex: true })
  useEffect(() => {
    post(baja ? '/newsletter/baja' : '/newsletter/confirmar', { token: sp.get('token') || '' })
      .then((r) => setState({ ok: true, msg: r.message })).catch((e) => setState({ ok: false, msg: e.message }))
  }, [baja, sp])
  if (!state) return <Spinner />
  return (
    <div className="card pad-lg" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
      <div className="empty-icon" style={{ margin: '0 auto 12px', background: state.ok ? 'var(--ok-soft)' : 'var(--bad-soft)', color: state.ok ? 'var(--ok)' : 'var(--bad)' }}><Icon name={state.ok ? 'mail' : 'alert'} size={28} /></div>
      <h1 className="page-title">{state.msg}</h1>
      <Link className="btn btn-dark" to="/" style={{ marginTop: 12 }}>Ir a la tienda</Link>
    </div>
  )
}
