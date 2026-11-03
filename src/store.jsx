// Configuración pública de la tienda (moneda, país, envíos, pagos, páginas) y formato de precios.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { get } from './api'

const StoreContext = createContext(null)
const CUR_KEY = 'jarstore_moneda'
const COUNTRY_KEY = 'jarstore_pais'

const FALLBACK = {
  tienda: { nombre: 'JarStore', descripcion: '', beneficios: [], redes: {} },
  monedas: { base: 'CLP', lista: [{ codigo: 'CLP', nombre: 'Peso chileno', simbolo: '$', decimales: 0, tasa: 1, locale: 'es-CL' }] },
  envio: { paises: [{ codigo: 'CL', nombre: 'Chile', metodos: [] }] },
  pagos: { metodos: [] },
  paginas: [],
  puntos: { activo: false, nombre: 'Puntos', monto_base: 1000, puntos_por_monto: 1, valor_punto: 10, minimo_canje: 0, maximo_porcentaje: 0 },
}

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* */ } }

function makeFormatter(moneda) {
  const nf = new Intl.NumberFormat(moneda.locale || 'es-CL', {
    minimumFractionDigits: moneda.decimales, maximumFractionDigits: moneda.decimales,
  })
  const sep = moneda.simbolo.length > 1 ? '\u00a0' : ''
  return (value) => `${value < 0 ? '−' : ''}${moneda.simbolo}${sep}${nf.format(Math.abs(value))}`
}

export function StoreProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState(null)
  const [codigo, setCodigo] = useState(read(CUR_KEY))
  const [pais, setPaisState] = useState(read(COUNTRY_KEY))

  const reload = useCallback(() => get('/config').then(setConfig).catch((e) => { setError(e); setConfig(FALLBACK) }), [])
  useEffect(() => { reload() }, [reload])

  const value = useMemo(() => {
    const cfg = config || FALLBACK
    const lista = cfg.monedas.lista
    const base = lista.find((m) => m.codigo === cfg.monedas.base) || lista[0]
    const actual = lista.find((m) => m.codigo === codigo) || base
    const tasa = actual.codigo === base.codigo ? 1 : actual.tasa
    const baseFactor = 10 ** base.decimales
    const fmtActual = makeFormatter(actual)
    const paises = cfg.envio.paises
    const paisActual = paises.find((p) => p.codigo === pais) || paises[0] || null

    return {
      ready: !!config,
      error,
      reload,
      config: cfg,
      tienda: cfg.tienda,
      paginas: cfg.paginas,
      pagos: cfg.pagos.metodos,
      paises,
      pais: paisActual,
      setPais: (c) => { write(COUNTRY_KEY, c); setPaisState(c) },
      monedas: lista,
      base,
      moneda: actual,
      setMoneda: (c) => { write(CUR_KEY, c); setCodigo(c) },
      /** Formatea un monto guardado en unidades mínimas de la moneda base. */
      money: (amount) => fmtActual(((amount ?? 0) / baseFactor) * tasa),
      /** Formatea con la moneda y tasa históricas de una orden. */
      moneyAt: (amount, codigoMoneda, tasaOrden) => {
        const m = lista.find((x) => x.codigo === codigoMoneda) || cfg.monedas.lista.find((x) => x.codigo === codigoMoneda) || base
        return makeFormatter(m)(((amount ?? 0) / baseFactor) * (tasaOrden ?? 1))
      },
      /** Formatea siempre en moneda base (para formularios del panel). */
      moneyBase: (amount) => makeFormatter(base)((amount ?? 0) / baseFactor),
      /** Monto escrito por una persona en moneda base => unidades mínimas. */
      toBase: (v) => (v === '' || v == null ? null : Math.round(Number(v) * baseFactor)),
      fromBase: (amount) => (amount == null ? '' : String(amount / baseFactor)),
      /** Monto en la moneda elegida => unidades base (para filtros de precio). */
      displayToBase: (v) => (v === '' || v == null ? null : Math.round((Number(v) / tasa) * baseFactor)),
      baseToDisplay: (amount) => (amount == null ? '' : String(Math.round(((amount / baseFactor) * tasa) * 10 ** actual.decimales) / 10 ** actual.decimales)),
      paginaVisible: (slug) => cfg.paginas.some((p) => p.slug === slug),
      puntos: cfg.puntos || FALLBACK.puntos,
      /** Puntos que genera un gasto (moneda base), según las reglas del programa. */
      puntosPor: (gasto) => {
        const p = cfg.puntos
        if (!p?.activo || !p.monto_base || gasto <= 0) return 0
        return Math.floor(gasto / p.monto_base) * p.puntos_por_monto
      },
      /** Formatea un monto base en una moneda concreta (para "ver precio en"). */
      moneyIn: (amount, codigo) => {
        const m = lista.find((x) => x.codigo === codigo) || base
        const t = m.codigo === base.codigo ? 1 : m.tasa
        return makeFormatter(m)(((amount ?? 0) / baseFactor) * t)
      },
    }
  }, [config, error, codigo, pais, reload])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)

/** Costo y reglas de envío de un país para un subtotal (en moneda base). */
export function shippingFacts(pais) {
  const metodos = pais?.metodos || []
  const gratis = metodos.map((m) => m.gratis_desde).filter((g) => g != null)
  return {
    metodos,
    gratisDesde: gratis.length ? Math.min(...gratis) : null,
    desde: metodos.length ? Math.min(...metodos.map((m) => m.precio)) : null,
  }
}
