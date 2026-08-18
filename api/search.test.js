import { afterEach, describe, expect, it } from 'vitest'
import { isAllowedOrigin } from './search.js'

afterEach(() => {
  delete process.env.VERCEL_URL
})

describe('isAllowedOrigin', () => {
  it('allows requests with no Origin or Referer header (fail-open)', () => {
    expect(isAllowedOrigin({ headers: { host: 'myapp.vercel.app' } })).toBe(true)
  })

  it('allows an Origin that matches the request Host header', () => {
    const req = {
      headers: { host: 'myapp.vercel.app', origin: 'https://myapp.vercel.app' },
    }
    expect(isAllowedOrigin(req)).toBe(true)
  })

  it('allows an Origin that matches VERCEL_URL when Host is absent', () => {
    process.env.VERCEL_URL = 'myapp-git-branch-team.vercel.app'
    const req = {
      headers: { origin: 'https://myapp-git-branch-team.vercel.app' },
    }
    expect(isAllowedOrigin(req)).toBe(true)
  })

  it('falls back to the Referer header when Origin is missing', () => {
    const req = {
      headers: { host: 'myapp.vercel.app', referer: 'https://myapp.vercel.app/manage' },
    }
    expect(isAllowedOrigin(req)).toBe(true)
  })

  it('allows localhost for local development regardless of port', () => {
    const req = {
      headers: { host: 'localhost:3000', origin: 'http://localhost:5173' },
    }
    expect(isAllowedOrigin(req)).toBe(true)
  })

  it('rejects an Origin pointing at an unrelated host', () => {
    const req = {
      headers: { host: 'myapp.vercel.app', origin: 'https://evil-site.example.com' },
    }
    expect(isAllowedOrigin(req)).toBe(false)
  })

  it('rejects a malformed Origin header', () => {
    const req = {
      headers: { host: 'myapp.vercel.app', origin: 'not-a-url' },
    }
    expect(isAllowedOrigin(req)).toBe(false)
  })
})
