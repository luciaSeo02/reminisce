// Flat table of every user-facing string in the app. Adding a new locale
// later means adding a new file with these same keys, no component changes.
export const en = {
  commonHome: 'Home',
  commonBackToApp: 'Back to app',
  commonRemove: 'Remove',
  commonTapHintPaused: 'Paused. Tap to continue.',
  commonTapHintPlaying: 'Tap to pause.',

  homeTitle: 'Reminisce',
  homeSettingsLabel: 'Caregiver settings',
  homePhotos: 'Photos',
  homeMusic: 'Music',
  homeGame: 'Game',

  photosTitle: 'Photos',
  photosPauseLabel: 'Pause slideshow',
  photosResumeLabel: 'Resume slideshow',

  musicTitle: 'Music',
  musicEmptyState: 'No music has been added yet. Ask a family member to add some songs.',
  musicPauseLabel: 'Pause music',
  musicResumeLabel: 'Resume music',
  musicSkip: 'Skip',

  gameTitleReveal: 'Game',
  gameTitlePicking: 'Which song is this?',
  gameEmptyState: 'Add at least two songs in Manage to play this game.',
  gamePauseLabel: 'Pause video',
  gameResumeLabel: 'Resume video',
  gameNext: 'Next',

  managePinSetTitle: 'Set a PIN',
  managePinSetDescription:
    'Choose a PIN to protect this page. You will need it to open Manage photos again.',
  managePinNewPlaceholder: 'New PIN',
  managePinConfirmPlaceholder: 'Confirm PIN',
  managePinTooShortError: 'Use a numeric PIN of at least 4 digits.',
  managePinMismatchError: 'PINs do not match.',
  managePinSetSubmit: 'Set PIN',
  managePinEnterTitle: 'Enter PIN',
  managePinEnterDescription: 'This page is protected. Enter the PIN to continue.',
  managePinPlaceholder: 'PIN',
  managePinUnlock: 'Unlock',
  managePinForgotPrompt: 'Forgot the PIN?',
  managePinForgotAction: 'Reset it',
  managePinForgotNote: 'Your saved photos will not be affected.',
  managePinWrongError: "That's not it. Try again, or go back.",

  manageContentTitle: 'Manage content',
  manageContentDescription:
    'This page is for the family caregiver. It is reached through the small icon on the Home screen, not one of the main options.',

  manageAddPhotosTitle: 'Add photos',
  manageCaptionPlaceholder: 'Caption (e.g. A photo from your wedding)',
  manageSavePhotos: (count) => `Save ${count} photo${count === 1 ? '' : 's'}`,
  manageSavedPhotosTitle: 'Saved photos',
  manageLoading: 'Loading...',
  manageNoSavedPhotos:
    'No photos added yet. The slideshow shows the example photos until some are added here.',
  manageNoCaption: '(no caption)',

  manageSearchMusicTitle: 'Search for music',
  manageSearchPlaceholder: 'Search for a song',
  manageSearching: 'Searching...',
  manageSearch: 'Search',
  manageSearchError: 'Could not search for music right now. Please try again.',
  manageSelectedSongsTitle: 'Selected songs',
  manageNoSongsSelected: 'No songs selected yet.',
  manageAdded: 'Added',
  manageAdd: 'Add',

  manageLanguageTitle: 'Language',
}
