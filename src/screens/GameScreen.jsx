import { useState } from 'react'
import { getSelectedSongs } from '../lib/musicStore.js'
import './GameScreen.css'

function pickRound(songs) {
  const shuffled = [...songs].sort(() => Math.random() - 0.5)
  const [target, distractor] = shuffled
  const options = Math.random() < 0.5 ? [target, distractor] : [distractor, target]
  return { target, options }
}

function GameScreen() {
  const [songs] = useState(() => getSelectedSongs())
  const [round, setRound] = useState(() => (songs.length >= 2 ? pickRound(songs) : null))
  const [revealed, setRevealed] = useState(false)

  if (songs.length < 2) {
    return (
      <div className="placeholder-screen game-screen">
        <h1>Game</h1>
        <p>Add at least two songs in Manage to play this game.</p>
      </div>
    )
  }

  function handleNext() {
    setRevealed(false)
    setRound(pickRound(songs))
  }

  if (revealed) {
    return (
      <div className="placeholder-screen game-screen">
        <h1>Game</h1>
        <p className="game-reveal-title">{round.target.title}</p>
        <button type="button" className="game-next-button" onClick={handleNext}>
          Next
        </button>
      </div>
    )
  }

  return (
    <div className="placeholder-screen game-screen">
      <h1>Which song is this?</h1>
      <div className="game-options">
        {round.options.map((song) => (
          <button
            type="button"
            key={song.videoId}
            className="game-option"
            onClick={() => setRevealed(true)}
          >
            {song.thumbnailUrl && (
              <img src={song.thumbnailUrl} alt="" className="game-option-thumb" />
            )}
            <span className="game-option-title">{song.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default GameScreen
