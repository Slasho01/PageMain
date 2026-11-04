import { useState } from 'react'
import { get, post } from '../../api'
import Icon from '../../components/Icon'
import { ErrorBox, Spinner } from '../../components/ui'
import { useFetch } from '../../hooks'
import { useToast } from '../../toast'

export default function MeliHub() {
  const toast = useToast()
  const { data, error, loading, reload } = useFetch(() => get('/admin/melihub/estado'), [])
  const [sincronizando, setSincronizando] = useState(false)

  const sincronizar = async () => {
    setSincronizando(true)
    try {
      const r = await post('/admin/melihub/sincronizar', {})
      const partes = [`${r.creados} creado(s)`, `${r.actualizados} actualizado(s)`]
      if (r.pausados) partes.push(`${r.pausados} pausado(s)`)
      if (r.errores) partes.push(`${r.errores} con error`)
      toast(`Sincronización lista: ${partes.join(', ')} (de ${r.total}).`)
      reload()
    } catch (err) {
      toast.error(err)
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="stack" style={{ '--gap': '18px' }}>
      <div>
        <h2 style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>MeliHub · Mercado Libre</h2>
        <p className="muted sm" style={{ margin: '4px 0 0' }}>
          Trae a JarStore las publicaciones de Mercado Libre centralizadas en MeliHub. Al vender aquí,
          el stock baja también en Mercado Libre.
        </p>
      </div>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? (
        <Spinner />
      ) : data && (
        <>
          <div className="card row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div className="row" style={{ '--gap': '12px', alignItems: 'center' }}>
              <Icon name={data.configurado ? 'check' : 'alert'} />
              <div>
                <b>{data.configurado ? 'Conexión activa' : 'Sin configurar'}</b>
                <div className="muted sm">
                  {data.configurado
                    ? `${data.vinculados} producto(s) vinculado(s) a MeliHub.`
                    : 'Falta definir MELIHUB_URL y MELIHUB_API_KEY en el servidor.'}
                </div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={sincronizar} disabled={!data.configurado || sincronizando}>
              {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
          </div>

          {!data.configurado && (
            <div className="card stack" style={{ '--gap': '8px' }}>
              <b>¿Cómo conectar?</b>
              <ol className="muted sm" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                <li>En MeliHub → <b>API keys</b>, crea una clave con canal <b>JarStore</b>.</li>
                <li>En el servidor de JarStore define <code>MELIHUB_URL</code> (la URL de tu MeliHub) y <code>MELIHUB_API_KEY</code> (la clave).</li>
                <li>Reinicia JarStore y vuelve a esta página.</li>
              </ol>
            </div>
          )}

          <p className="muted sm" style={{ margin: 0 }}>
            La sincronización crea o actualiza productos vinculados por su origen en MeliHub (nombre, precio,
            stock, estado e imagen). No pisa el slug ni las imágenes que edites en JarStore. Puedes repetirla
            cuando quieras; es segura.
          </p>
        </>
      )}
    </div>
  )
}
