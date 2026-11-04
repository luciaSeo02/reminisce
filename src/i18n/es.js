// Spanish translation. Same keys as en.js; see that file for the source of
// truth on what each key is used for.
export const es = {
  commonHome: 'Inicio',
  commonBackToApp: 'Volver a la app',
  commonRemove: 'Quitar',
  commonTapHintPaused: 'En pausa. Toca para continuar.',
  commonTapHintPlaying: 'Toca para pausar.',

  homeTitle: 'Reminisce',
  homeSettingsLabel: 'Ajustes del cuidador',
  homePhotos: 'Fotos',
  homeMusic: 'Música',
  homeGame: 'Juego',

  photosTitle: 'Fotos',
  photosPauseLabel: 'Pausar presentación',
  photosResumeLabel: 'Reanudar presentación',

  musicTitle: 'Música',
  musicEmptyState: 'Todavía no se ha añadido música. Pide a un familiar que añada canciones.',
  musicPauseLabel: 'Pausar música',
  musicResumeLabel: 'Reanudar música',
  musicSkip: 'Saltar',

  gameTitleReveal: 'Juego',
  gameTitlePicking: '¿Qué canción es esta?',
  gameEmptyState: 'Añade al menos dos canciones en Gestionar para jugar.',
  gamePauseLabel: 'Pausar vídeo',
  gameResumeLabel: 'Reanudar vídeo',
  gameNext: 'Siguiente',

  managePinSetTitle: 'Establecer un PIN',
  managePinSetDescription:
    'Elige un PIN para proteger esta página. Lo necesitarás para volver a abrir Gestionar fotos.',
  managePinNewPlaceholder: 'PIN nuevo',
  managePinConfirmPlaceholder: 'Confirmar PIN',
  managePinTooShortError: 'Usa un PIN numérico de al menos 4 dígitos.',
  managePinMismatchError: 'Los PIN no coinciden.',
  managePinSetSubmit: 'Establecer PIN',
  managePinEnterTitle: 'Introducir PIN',
  managePinEnterDescription: 'Esta página está protegida. Introduce el PIN para continuar.',
  managePinPlaceholder: 'PIN',
  managePinUnlock: 'Desbloquear',
  managePinForgotPrompt: '¿Olvidaste el PIN?',
  managePinForgotAction: 'Restablecerlo',
  managePinForgotNote: 'Tus fotos guardadas no se verán afectadas.',
  managePinWrongError: 'No es correcto. Inténtalo de nuevo, o vuelve atrás.',

  manageContentTitle: 'Gestionar contenido',
  manageContentDescription:
    'Esta página es para el familiar cuidador. Se accede desde el pequeño icono de la pantalla de Inicio, no es una de las opciones principales.',

  manageAddPhotosTitle: 'Añadir fotos',
  manageCaptionPlaceholder: 'Descripción (p. ej. Una foto de tu boda)',
  manageSavePhotos: (count) => `Guardar ${count} foto${count === 1 ? '' : 's'}`,
  manageSavedPhotosTitle: 'Fotos guardadas',
  manageLoading: 'Cargando...',
  manageNoSavedPhotos:
    'Todavía no se han añadido fotos. La presentación muestra las fotos de ejemplo hasta que se añadan aquí.',
  manageNoCaption: '(sin descripción)',

  manageSearchMusicTitle: 'Buscar música',
  manageSearchPlaceholder: 'Busca una canción',
  manageSearching: 'Buscando...',
  manageSearch: 'Buscar',
  manageSearchError: 'No se pudo buscar música en este momento. Inténtalo de nuevo.',
  manageSelectedSongsTitle: 'Canciones seleccionadas',
  manageNoSongsSelected: 'Todavía no se ha seleccionado ninguna canción.',
  manageAdded: 'Añadida',
  manageAdd: 'Añadir',

  manageLanguageTitle: 'Idioma',

  manageFontSizeTitle: 'Tamaño de texto',
  manageFontSizeNormal: 'Normal',
  manageFontSizeLarge: 'Grande',
  manageFontSizeExtraLarge: 'Extra grande',

  manageThemeTitle: 'Tema',
  manageThemeWarm: 'Cálido',
  manageThemeSky: 'Cielo',
  manageThemeContrast: 'Contraste',
  manageThemeSunset: 'Atardecer',

  manageBackupTitle: 'Copia de seguridad',
  manageBackupDescription:
    'Guarda una copia de seguridad para proteger las canciones, los ajustes y las fotos si este dispositivo se pierde, se cambia, o borra sus datos.',
  manageBackupNoBackupYet: 'Todavía no hay copia de seguridad.',
  manageBackupLastBackup: (date) => `Última copia de seguridad: ${date}`,
  manageBackupSaveSongs: 'Guardar copia (canciones y ajustes)',
  manageBackupSaveWithPhotos: 'Guardar copia con fotos',
  manageBackupEstimatedSize: (size) => `Tamaño aproximado: ${size}`,
  manageBackupRestore: 'Restaurar una copia de seguridad',
  manageBackupSaveError: 'No se pudo guardar la copia de seguridad. No se cambió nada.',
  manageBackupConfirmRestore: 'Esto sustituirá lo guardado en este dispositivo.',
  manageBackupConfirmRestoreButton: 'Sustituir y restaurar',
  manageBackupCancel: 'Cancelar',
  manageBackupRestoreSuccess: 'Copia de seguridad restaurada. La página se recargará ahora.',
  manageBackupRestoreErrorInvalid:
    'Este archivo no se pudo usar como copia de seguridad. No se cambió nada.',
  manageBackupRestoreErrorFutureVersion:
    'Esta copia de seguridad se hizo con una versión más nueva de la app. No se cambió nada.',
}
