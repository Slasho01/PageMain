import { Link } from 'react-router-dom'
import { shippingFacts, useStore } from '../store'
import Icon from './Icon'

/**
 * Beneficios reales: los que define el admin y los que se deducen de la
 * configuración (envío gratis, políticas publicadas, métodos de pago).
 * Nunca se muestra algo que la tienda no haya configurado.
 */
export function useBenefits() {
  const { tienda, pais, paginaVisible, pagos, money } = useStore()
  const list = (tienda.beneficios || []).map((b) => ({ icon: b.icono, title: b.titulo, text: b.texto }))
  if (list.length) return list
  const { gratisDesde, metodos } = shippingFacts(pais)
  if (gratisDesde != null) list.push({ icon: 'truck', title: `Envío gratis desde ${money(gratisDesde)}`, text: pais ? `Despachos en ${pais.nombre}` : null })
  else if (metodos.length) list.push({ icon: 'truck', title: `Despacho a ${pais.nombre}`, text: metodos.map((m) => m.nombre).join(' · ') })
  if (paginaVisible('garantia')) list.push({ icon: 'shield', title: 'Garantía', text: 'Conoce nuestra política', to: '/p/garantia' })
  if (paginaVisible('devoluciones')) list.push({ icon: 'refresh', title: 'Cambios y devoluciones', text: 'Revisa las condiciones', to: '/p/devoluciones' })
  if (pagos.length) list.push({ icon: 'card', title: 'Medios de pago', text: pagos.map((m) => m.nombre).join(' · ') })
  return list
}

export default function Benefits() {
  const list = useBenefits()
  if (!list.length) return null
  return (
    <section className="benefits" aria-label="Beneficios de comprar con nosotros">
      {list.map((b, i) => {
        const inner = (
          <>
            <span className="benefit-icon"><Icon name={b.icon} /></span>
            <span><strong>{b.title}</strong>{b.text && <span>{b.text}</span>}</span>
          </>
        )
        return b.to ? <Link key={i} to={b.to} className="benefit">{inner}</Link> : <div key={i} className="benefit">{inner}</div>
      })}
    </section>
  )
}
