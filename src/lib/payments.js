import { post } from '../api'

/** Inicia el pago con Mercado Pago: pide la preferencia y redirige a Checkout Pro. */
export async function payWithMercadoPago(orderId) {
  const { init_point } = await post(`/ordenes/${orderId}/pagar`)
  window.location.assign(init_point)
}

export const metodosPara = (pagos, paisCodigo) =>
  pagos.filter((m) => !m.paises?.length || m.paises.includes(paisCodigo))
