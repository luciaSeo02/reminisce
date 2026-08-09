function HomeScreen({ onNavigate }) {
  return (
    <div className="home-screen">
      <h1>Reminisce</h1>
      <div className="option-grid">
        <button
          type="button"
          className="option-button"
          onClick={() => onNavigate('photos')}
        >
          Photos
        </button>
        <button
          type="button"
          className="option-button"
          onClick={() => onNavigate('music')}
        >
          Music
        </button>
        <button
          type="button"
          className="option-button"
          onClick={() => onNavigate('game')}
        >
          Game
        </button>
      </div>
    </div>
  )
}

export default HomeScreen
