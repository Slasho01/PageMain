import { Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { get } from '../api'
import { Breadcrumbs, Empty, Spinner } from '../components/ui'
import { useFetch } from '../hooks'
import { usePageMeta } from '../seo'
import { useStore } from '../store'
import { date } from '../utils'

/**
 * Formato sencillo y seguro (sin HTML): "## Título", "### Subtítulo",
 * líneas que empiezan con "- " forman listas y las líneas en blanco separan párrafos.
 */
export function SimpleText({ text }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  return blocks.map((b, i) => {
    const lines = b.split('\n')
    if (b.startsWith('### ')) return <h3 key={i}>{b.slice(4)}</h3>
    if (b.startsWith('## ')) return <h2 key={i}>{b.slice(3)}</h2>
    if (lines.every((l) => l.startsWith('- '))) return <ul key={i}>{lines.map((l, k) => <li key={k}>{l.slice(2)}</li>)}</ul>
    return <p key={i}>{lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}{l}</Fragment>)}</p>
  })
}

export default function Policy() {
  const { slug } = useParams()
  const { tienda } = useStore()
  const { data, error, loading } = useFetch(() => get(`/paginas/${slug}`), [slug])
  usePageMeta({ title: data?.titulo, store: tienda.nombre, description: data?.contenido?.slice(0, 160) })
  if (loading) return <Spinner />
  if (error) return <Empty icon="file" title="Página no disponible" action={<Link className="btn btn-dark" to="/">Ir al inicio</Link>}>Puede que aún no esté publicada.</Empty>
  return (
    <article style={{ maxWidth: 820, margin: '0 auto' }}>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: data.titulo }]} />
      <h1 className="page-title">{data.titulo}</h1>
      <p className="xs muted">Actualizado el {date(data.updated_at)}</p>
      {!data.visible && <div className="alert alert-warn" style={{ marginBlock: 12 }}>Borrador: sólo los administradores pueden ver esta página.</div>}
      <div className="card pad-lg prose" style={{ marginTop: 16 }}>
        {data.contenido.trim() ? <SimpleText text={data.contenido} /> : <p className="muted">Contenido pendiente.</p>}
      </div>
    </article>
  )
}
