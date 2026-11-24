import PlayerGrid from './components/PlayerGrid'
import { players } from './data/players'
import './app.css'

export default function App() {
  return (
    <main className="page">
      <header className="pageHeader">
        <p className="eyebrow">ESI BASKETBALL · SAISON 2026–2027</p>
        <h1>Les Lions</h1>
        <p className="intro">Les joueurs de l’effectif</p>
      </header>
      <PlayerGrid players={players} />
    </main>
  )
}
