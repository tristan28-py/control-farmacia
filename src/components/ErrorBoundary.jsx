import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="session-loading" id="contenido" tabIndex={-1}>
          <h1>Algo salió mal</h1>
          <p role="alert">No pudimos mostrar la aplicación. Recarga la página para volver a intentarlo.</p>
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
