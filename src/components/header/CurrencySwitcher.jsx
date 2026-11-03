import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import Icon from '../Icon'

/**
 * Botón para ver los precios en otra moneda (CLP, USD, Bs…). Las monedas y sus tasas
 * se definen en Admin → Tienda → Monedas; sólo aparecen las que tienen tasa.
 * Es sólo de visualización: los cobros se hacen en la moneda base de la tienda.
 */
export default function CurrencySwitcher() {
  const { monedas, moneda, setMoneda, base } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  if (monedas.length < 2) return null

  // "1 USD = $952 CLP" (la tasa es unidades de esa moneda por 1 unidad base)
  const equiv = (m) => {
    if (m.codigo === base.codigo || !m.tasa) return 'Moneda de la tienda'
    const unaEnBase = 1 / m.tasa
    const fmt = new Intl.NumberFormat(base.locale || 'es-CL', { maximumFractionDigits: unaEnBase >= 100 ? 0 : 2 })
    return `1 ${m.codigo} = ${base.simbolo}${fmt.format(unaEnBase)} ${base.codigo}`
  }

  return (
    <div className="menu" ref={ref}>
      <button className="cur-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`Moneda: ${moneda.nombre}. Cambiar moneda`} title="Ver precios en otra moneda">
        <span className="sym">{moneda.simbolo}</span>{moneda.codigo}<Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <div className="menu-panel cur-panel" role="listbox" aria-label="Moneda">
          <div className="menu-head"><div className="strong small">Ver precios en</div><div className="xs muted">Los pagos se procesan en {base.codigo}</div></div>
          {monedas.map((m) => (
            <button key={m.codigo} role="option" aria-selected={m.codigo === moneda.codigo}
              className={`cur-opt ${m.codigo === moneda.codigo ? 'on' : ''}`}
              onClick={() => { setMoneda(m.codigo); setOpen(false) }}>
              <span className="cur-code">{m.codigo}</span>
              <span className="grow"><span className="strong">{m.nombre}</span><br /><span className="xs muted">{equiv(m)}</span></span>
              {m.codigo === moneda.codigo && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Fila "Ver precio en: CLP · USD · Bs." para la ficha de producto. */
export function PriceIn({ amount }) {
  const { monedas, moneda, setMoneda, moneyIn } = useStore()
  if (monedas.length < 2) return null
  return (
    <div className="price-in" aria-label="Ver precio en otras monedas">
      <span className="xs muted">Ver precio en:</span>
      {monedas.map((m) => (
        <button key={m.codigo} type="button" className={m.codigo === moneda.codigo ? 'on' : ''} onClick={() => setMoneda(m.codigo)}
          aria-pressed={m.codigo === moneda.codigo} title={`${m.nombre}: ${moneyIn(amount, m.codigo)}`}>
          {m.codigo} {m.codigo !== moneda.codigo && <span className="muted">{moneyIn(amount, m.codigo)}</span>}
        </button>
      ))}
    </div>
  )
}
