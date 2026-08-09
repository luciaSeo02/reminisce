import { useState } from 'react'
import HomeScreen from './screens/HomeScreen.jsx'
import PhotosScreen from './screens/PhotosScreen.jsx'
import MusicScreen from './screens/MusicScreen.jsx'
import GameScreen from './screens/GameScreen.jsx'
import './App.css'

const SCREENS = {
  home: HomeScreen,
  photos: PhotosScreen,
  music: MusicScreen,
  game: GameScreen,
}

function App() {
  const [screen, setScreen] = useState('home')
  const Screen = SCREENS[screen] ?? HomeScreen

  return (
    <div className="app">
      {screen !== 'home' && (
        <button
          type="button"
          className="home-button"
          onClick={() => setScreen('home')}
        >
          Home
        </button>
      )}
      <main className="screen">
        <Screen onNavigate={setScreen} />
      </main>
    </div>
  )
}

export default App
