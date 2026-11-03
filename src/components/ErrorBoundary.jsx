import { Component } from 'react'
import Icon from './Icon'

/** Evita que un error de render deje la pantalla en blanco. */
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Error de interfaz:', error, info) }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="empty" role="alert">
        <div className="empty-icon"><Icon name="alert" size={28} /></div>
        <h2>Algo salió mal</h2>
        <p className="muted" style={{ margin: 0 }}>Ocurrió un error al mostrar esta página. Prueba recargar.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-dark" onClick={() => location.reload()}>Recargar</button>
          <a className="btn" href="/">Ir al inicio</a>
        </div>
      </div>
    )
  }
}
