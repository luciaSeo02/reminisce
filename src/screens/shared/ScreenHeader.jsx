import { useStrings } from '../../i18n/LanguageContext.jsx'
import { BackgroundBlob } from '../home/HomeIllustrations.jsx'
import { GameIcon, HomeIcon, MusicIcon, PhotosIcon } from './icons.jsx'
import './ScreenHeader.css'

const SECTIONS = {
  photos: { titleKey: 'photosTitle', Icon: PhotosIcon },
  music: { titleKey: 'musicTitle', Icon: MusicIcon },
  game: { titleKey: 'gameTitleReveal', Icon: GameIcon },
  manage: { titleKey: 'homeSettings', subtitleKey: 'manageSubtitle' },
}

// Header shared by the inner screens: a Home pill on the left and the
// section title with its round icon on the right. The section colors come
// from the .section-* class set on a wrapper (see ScreenHeader.css).
// Settings lives on its own page (/manage), so there the Home pill is a
// plain link instead of a button that switches screens.
function ScreenHeader({ section, onHome, homeHref }) {
  const strings = useStrings()
  const { titleKey, subtitleKey, Icon } = SECTIONS[section]

  const homeContent = (
    <>
      <HomeIcon />
      <span>{strings.commonHome}</span>
    </>
  )

  return (
    <>
      <div className="section-backdrop" aria-hidden="true">
        <BackgroundBlob className="section-blob section-blob-top" />
        <BackgroundBlob className="section-blob section-blob-bottom" />
      </div>
      <header className="screen-header">
        {homeHref ? (
          <a href={homeHref} className="screen-header-home">
            {homeContent}
          </a>
        ) : (
          <button type="button" className="screen-header-home" onClick={onHome}>
            {homeContent}
          </button>
        )}
        <div className="screen-header-section">
          {subtitleKey ? (
            <div className="screen-header-titles">
              <h1>{strings[titleKey]}</h1>
              <p>{strings[subtitleKey]}</p>
            </div>
          ) : (
            <h1>{strings[titleKey]}</h1>
          )}
          {Icon && (
            <span className="screen-header-icon" aria-hidden="true">
              <Icon />
            </span>
          )}
        </div>
      </header>
    </>
  )
}

export default ScreenHeader
