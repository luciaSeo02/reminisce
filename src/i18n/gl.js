// Galician translation. Same keys as en.js; see that file for the source of
// truth on what each key is used for.
//
// FIRST DRAFT, MACHINE-TRANSLATED: this has not been reviewed by a fluent
// Galician speaker. Do not treat it as ready to merge on green checks alone;
// see the PR description for what needs review before this ships.
export const gl = {
  commonHome: 'Inicio',
  commonBackToApp: 'Volver á app',
  commonRemove: 'Eliminar',
  commonTapHintPaused: 'En pausa. Toca para continuar.',
  commonTapHintPlaying: 'Toca para pausar.',

  homeTitle: 'Reminisce',
  homeGreeting: 'Ola',
  homePrompt: 'Que che apetece facer?',
  homeSettings: 'Axustes',
  homePhotos: 'Fotos',
  homeMusic: 'Música',
  homeGame: 'Xogo',

  photosTitle: 'Fotos',
  photosPauseLabel: 'Pausar presentación',
  photosResumeLabel: 'Retomar presentación',

  musicTitle: 'Música',
  musicEmptyState: 'Aínda non se engadiu música. Pide a un familiar que engada cancións.',
  musicPauseLabel: 'Pausar música',
  musicResumeLabel: 'Retomar música',
  musicSkip: 'Saltar',

  gameTitleReveal: 'Xogo',
  gameTitlePicking: '¿Que canción é esta?',
  gameEmptyState: 'Engade polo menos dúas cancións en Axustes para xogar.',
  gamePauseLabel: 'Pausar vídeo',
  gameResumeLabel: 'Retomar vídeo',
  gameNext: 'Seguinte',

  managePinSetTitle: 'Establecer un PIN',
  managePinSetDescription:
    'Escolle un PIN para protexer esta páxina. Precisarás del para volver abrir Axustes.',
  managePinNewPlaceholder: 'PIN novo',
  managePinConfirmPlaceholder: 'Confirmar PIN',
  managePinTooShortError: 'Usa un PIN numérico de polo menos 4 díxitos.',
  managePinMismatchError: 'Os PIN non coinciden.',
  managePinSetSubmit: 'Establecer PIN',
  managePinEnterTitle: 'Introducir PIN',
  managePinEnterDescription: 'Esta páxina está protexida. Introduce o PIN para continuar.',
  managePinPlaceholder: 'PIN',
  managePinUnlock: 'Desbloquear',
  managePinForgotPrompt: '¿Esqueciches o PIN?',
  managePinForgotAction: 'Restablecelo',
  managePinForgotNote: 'As túas fotos, cancións e axustes consérvanse.',
  managePinWrongError: 'Non é correcto. Téntao de novo, ou volve atrás.',
  managePinResetConfirm:
    'Restablecer o PIN? Calquera persoa que use este dispositivo poderá poñer un novo. As túas fotos, cancións e axustes non se borran.',
  managePinResetConfirmButton: 'Restablecer PIN',
  managePinResetCancel: 'Cancelar',
  manageLockNow: 'Bloquear agora',

  manageSubtitle: 'Zona para quen coida',
  manageContentTitle: 'Xestionar contido',
  manageContentDescription:
    'Esta páxina é para o familiar coidador. Accédese a través da pequena icona da pantalla de Inicio, non é unha das opcións principais.',

  manageAddPhotosTitle: 'Engadir fotos',
  manageCaptionPlaceholder: 'Descrición (p. ex. Unha foto da túa voda)',
  manageSavePhotos: (count) => `Gardar ${count} foto${count === 1 ? '' : 's'}`,
  manageAddPhotosRejected: (count) =>
    `Non se puido engadir ${count} arquivo${count === 1 ? '' : 's'}: non é un tipo de foto admitido.`,
  manageSavedPhotosTitle: 'Fotos gardadas',
  manageLoading: 'Cargando...',
  manageNoSavedPhotos:
    'Aínda non se engadiron fotos. A presentación amosa as fotos de exemplo ata que se engadan aquí.',
  manageNoCaption: '(sen descrición)',

  manageSearchMusicTitle: 'Buscar música',
  manageSearchPlaceholder: 'Busca unha canción',
  manageSearching: 'Buscando...',
  manageSearch: 'Buscar',
  manageSearchError: 'Non se puido buscar música agora mesmo. Téntao de novo.',
  manageSelectedSongsTitle: 'Cancións seleccionadas',
  manageNoSongsSelected: 'Aínda non se seleccionou ningunha canción.',
  manageAdded: 'Engadida',
  manageAdd: 'Engadir',

  manageLanguageTitle: 'Idioma',

  manageFontSizeTitle: 'Tamaño de texto',
  manageFontSizeNormal: 'Normal',
  manageFontSizeLarge: 'Grande',
  manageFontSizeExtraLarge: 'Extra grande',

  manageThemeTitle: 'Tema',
  manageThemeWarm: 'Cálido',
  manageThemeSky: 'Ceo',
  manageThemeContrast: 'Contraste',
  manageThemeSunset: 'Solpor',

  manageBackupTitle: 'Copia de seguridade',
  manageBackupDescription:
    'Garda unha copia de seguridade para protexer as cancións, os axustes e as fotos se este dispositivo se perde, se cambia, ou borra os seus datos.',
  manageBackupNoBackupYet: 'Aínda non hai copia de seguridade.',
  manageBackupLastBackup: (date) => `Última copia de seguridade: ${date}`,
  manageBackupSaveSongs: 'Gardar copia (cancións e axustes)',
  manageBackupSaveWithPhotos: 'Gardar copia con fotos',
  manageBackupEstimatedSize: (size) => `Tamaño aproximado: ${size}`,
  manageBackupRestore: 'Restaurar unha copia de seguridade',
  manageBackupSaveError: 'Non se puido gardar a copia de seguridade. Non se cambiou nada.',
  manageBackupConfirmRestore: 'Isto substituirá o gardado neste dispositivo.',
  manageBackupConfirmRestoreButton: 'Substituír e restaurar',
  manageBackupCancel: 'Cancelar',
  manageBackupRestoreSuccess: 'Copia de seguridade restaurada. A páxina recargarase agora.',
  manageBackupRestoreErrorInvalid:
    'Este arquivo non se puido usar como copia de seguridade. Non se cambiou nada.',
  manageBackupRestoreErrorFutureVersion:
    'Esta copia de seguridade fíxose cunha versión máis nova da app. Non se cambiou nada.',
}
