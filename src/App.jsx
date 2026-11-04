import { useState } from 'react'
import HomeScreen from './screens/HomeScreen.jsx'
import PhotosScreen from './screens/PhotosScreen.jsx'
import MusicScreen from './screens/MusicScreen.jsx'
import GameScreen from './screens/GameScreen.jsx'
import ScreenHeader from './screens/shared/ScreenHeader.jsx'
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
  const isInner = screen !== 'home' && SCREENS[screen]

  return (
    <div className={isInner ? `app section-${screen}` : 'app'}>
      {isInner && <ScreenHeader section={screen} onHome={() => setScreen('home')} />}
      <main className="screen">
        <Screen onNavigate={setScreen} />
      </main>
    </div>
  )
}

export default App
