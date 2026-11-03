import { useState } from 'react'
import { downloadFile, get } from '../../api'
import Icon from '../../components/Icon'
import { Empty, ErrorBox, Pagination, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { useToast } from '../../toast'
import { dateTime } from '../../utils'

export default function NewsletterAdmin() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [soloConfirmados, setSolo] = useState(true)
  const { data, error, loading, reload } = useFetch(() => get('/admin/newsletter', { page, per_page: 30, confirmados: soloConfirmados }), [page, soloConfirmados])
  const estado = (s) => s.baja_at ? ['De baja', 'badge-warn'] : s.confirmado_at ? ['Confirmado', 'badge-ok'] : ['Sin confirmar', '']
  return (
    <div className="stack" style={{ '--gap': '16px' }}>
      <div className="row between">
        <div className="row" style={{ '--gap': '16px' }}>
          <label className="check"><input type="checkbox" checked={soloConfirmados} onChange={(e) => { setPage(1); setSolo(e.target.checked) }} />Sólo confirmados y activos</label>
          {data && <span className="small muted">{data.total} suscriptor(es)</span>}
        </div>
        <button className="btn" onClick={() => downloadFile('/admin/newsletter.csv', 'newsletter.csv').catch(toast.error)}><Icon name="file" size={16} />Exportar CSV</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Sólo se cuentan como suscriptores quienes confirmaron desde el enlace del correo (doble confirmación). El CSV sirve para importar en tu herramienta de envío (Mailchimp, Brevo, etc.).</p>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.items.length === 0 ? <Empty icon="mail" title="Aún no hay suscriptores" /> : data && (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Email</th><th>Estado</th><th>Alta</th><th>Confirmado</th></tr></thead>
            <tbody>{data.items.map((s) => { const [l, t] = estado(s); return (
              <tr key={s.id}><td className="strong">{s.email}</td><td><span className={`badge ${t}`}>{l}</span></td><td className="small muted">{dateTime(s.created_at)}</td><td className="small muted">{s.confirmado_at ? dateTime(s.confirmado_at) : '—'}</td></tr>
            ) })}</tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={data?.total_pages} onChange={setPage} />
    </div>
  )
}
