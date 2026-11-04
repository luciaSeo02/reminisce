import { useStrings } from '../i18n/LanguageContext.jsx'
import {
  BackgroundBlob,
  GameIllustration,
  MusicIllustration,
  PhotosIllustration,
} from './home/HomeIllustrations.jsx'
import './HomeScreen.css'

const TILES = [
  { screen: 'photos', labelKey: 'homePhotos', Illustration: PhotosIllustration },
  { screen: 'music', labelKey: 'homeMusic', Illustration: MusicIllustration },
  { screen: 'game', labelKey: 'homeGame', Illustration: GameIllustration },
]

function HomeScreen({ onNavigate }) {
  const strings = useStrings()

  return (
    <div className="home-screen">
      <div className="home-backdrop" aria-hidden="true">
        <BackgroundBlob className="home-blob home-blob-top" />
        <BackgroundBlob className="home-blob home-blob-bottom" />
      </div>

      <div className="home-content">
        <header className="home-header">
          <div className="home-brand">
            <span className="home-brand-mark" aria-hidden="true">
              <HeartIcon />
            </span>
            <span className="home-brand-name">{strings.homeTitle}</span>
          </div>
          <a href="/manage" className="home-settings">
            <GearIcon />
            <span>{strings.homeSettings}</span>
          </a>
        </header>

        <div className="home-greeting">
          <h1>{strings.homeGreeting}</h1>
          <p>{strings.homePrompt}</p>
        </div>

        <div className="home-tiles">
          {TILES.map(({ screen, labelKey, Illustration }) => (
            <button
              key={screen}
              type="button"
              className={`home-tile home-tile-${screen}`}
              onClick={() => onNavigate(screen)}
            >
              <span className="home-tile-art">
                <Illustration />
              </span>
              <span className="home-tile-footer">
                <span className="home-tile-label">{strings[labelKey]}</span>
                <span className="home-tile-arrow" aria-hidden="true">
                  <ArrowIcon />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export default HomeScreen
