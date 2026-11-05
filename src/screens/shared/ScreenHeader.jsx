import { useStrings } from '../../i18n/LanguageContext.jsx'
import { BackgroundBlob } from '../home/HomeIllustrations.jsx'
import { GameIcon, HomeIcon, MusicIcon, PhotosIcon } from './icons.jsx'
import './ScreenHeader.css'

const SECTIONS = {
  photos: { titleKey: 'photosTitle', Icon: PhotosIcon },
  music: { titleKey: 'musicTitle', Icon: MusicIcon },
  game: { titleKey: 'gameTitleReveal', Icon: GameIcon },
}

// Header shared by Photos, Music and Game: a Home pill on the left and the
// section title with its round icon on the right. The section colors come
// from the .section-* class set on the app wrapper (see ScreenHeader.css).
function ScreenHeader({ section, onHome }) {
  const strings = useStrings()
  const { titleKey, Icon } = SECTIONS[section]

  return (
    <>
      <div className="section-backdrop" aria-hidden="true">
        <BackgroundBlob className="section-blob section-blob-top" />
        <BackgroundBlob className="section-blob section-blob-bottom" />
      </div>
      <header className="screen-header">
        <button type="button" className="screen-header-home" onClick={onHome}>
          <HomeIcon />
          <span>{strings.commonHome}</span>
        </button>
        <div className="screen-header-section">
          <h1>{strings[titleKey]}</h1>
          <span className="screen-header-icon" aria-hidden="true">
            <Icon />
          </span>
        </div>
      </header>
    </>
  )
}

export default ScreenHeader
