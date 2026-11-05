// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { decodeTitle } from './decodeTitle.js'
import { addSelectedSong, getSelectedSongs } from './musicStore.js'
import { createBackupZip } from './backupStore.js'

describe('decodeTitle', () => {
  it('decodes an apostrophe', () => {
    expect(decodeTitle('What I&#39;ve Done')).toBe("What I've Done")
  })

  it('decodes an ampersand', () => {
    expect(decodeTitle('Rock &amp; Roll')).toBe('Rock & Roll')
  })

  it('decodes quotes', () => {
    expect(decodeTitle('&quot;Heroes&quot;')).toBe('"Heroes"')
  })

  it('decodes decimal and hex numeric entities', () => {
    expect(decodeTitle('Don&#39;t &#x26; Won&#x27;t')).toBe("Don't & Won't")
  })

  it('decodes named entities beyond the basic five', () => {
    expect(decodeTitle('Canci&oacute;n de cuna &ntilde;')).toBe('Canción de cuna ñ')
  })

  it('leaves a plain title unchanged', () => {
    expect(decodeTitle('Moon River')).toBe('Moon River')
  })

  it('keeps a raw "<" and script-like text as text, never as markup', () => {
    expect(decodeTitle('<script>alert(1)</script> &amp; more')).toBe(
      '<script>alert(1)</script> & more',
    )
    expect(decodeTitle('<img src=x onerror=alert(1)> &amp;')).toBe(
      '<img src=x onerror=alert(1)> &',
    )
    expect(decodeTitle('1 < 2 &amp; 3 > 2')).toBe('1 < 2 & 3 > 2')
  })

  it('turns encoded markup into text, not elements', () => {
    expect(decodeTitle('&lt;b&gt;Bold&lt;/b&gt;')).toBe('<b>Bold</b>')
  })

  it('decodes only once', () => {
    expect(decodeTitle('Rock &amp;amp; Roll')).toBe('Rock &amp; Roll')
  })

  it('returns an empty string for an empty string', () => {
    expect(decodeTitle('')).toBe('')
  })
})

describe('decoding for display does not touch stored data', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps the saved title and the backup title raw', async () => {
    const raw = 'What I&#39;ve Done &amp; more'
    addSelectedSong({ videoId: 'a', title: raw, thumbnailUrl: null })
    const storedBefore = localStorage.getItem('reminisce-selected-songs')

    const [song] = getSelectedSongs()
    expect(decodeTitle(song.title)).toBe("What I've Done & more")

    expect(localStorage.getItem('reminisce-selected-songs')).toBe(storedBefore)
    expect(getSelectedSongs()[0].title).toBe(raw)
    const { manifest } = await createBackupZip({ includePhotos: false })
    expect(manifest.songs[0].title).toBe(raw)
  })
})
