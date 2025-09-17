import { describe, it, expect } from 'vitest'
import { 
  parseCSVLine, isValidISODate, toBoolOptional,
  validateGrants, validateRevokes, validateKeys,
  shapeGrants, shapeRevokes, shapeKeyItems
} from '../bulkParsing'

describe('bulkParsing utils', () => {
  it('parseCSVLine trims cells', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a','b','c'])
  })

  it('isValidISODate checks valid dates', () => {
    expect(isValidISODate('2025-01-01T00:00:00Z')).toBe(true)
    expect(isValidISODate('not-a-date')).toBe(false)
  })

  it('toBoolOptional parses true/false variants', () => {
    expect(toBoolOptional('true')).toBe(true)
    expect(toBoolOptional('1')).toBe(true)
    expect(toBoolOptional('yes')).toBe(true)
    expect(toBoolOptional('false')).toBe(false)
    expect(toBoolOptional('0')).toBe(false)
    expect(toBoolOptional('no')).toBe(false)
    expect(toBoolOptional('maybe')).toBeUndefined()
    expect(toBoolOptional('')).toBeUndefined()
    expect(toBoolOptional()).toBeUndefined()
  })

  it('validateGrants flags bad lines', () => {
    const text = [
      'user,lock,2025-01-01T00:00:00Z,2025-12-31T00:00:00Z',
      'userOnly,',
      'user,lock,notadate,',
      'user,lock,2026-01-01T00:00:00Z,2025-01-01T00:00:00Z',
      ''
    ].join('\n')
    const errs = validateGrants(text)
    expect(errs.length).toBe(3)
    expect(errs.some(e => e.includes('requires userId,lockId'))).toBe(true)
    expect(errs.some(e => e.includes('invalid validFrom date'))).toBe(true)
    expect(errs.some(e => e.includes('validFrom is after validTo'))).toBe(true)
  })

  it('validateRevokes flags missing fields', () => {
    const text = ['user,lock', 'userOnly,', ''].join('\n')
    const errs = validateRevokes(text)
    expect(errs.length).toBe(1)
    expect(errs[0]).toMatch(/requires userId,lockId/)
  })

  it('validateKeys checks expiresAt and isActive', () => {
    const text = [
      'card,user,Name,2025-01-01T00:00:00Z,true',
      'card2,user2,Name2,notadate,true',
      'card3,user3,Name3,2025-01-01T00:00:00Z,invalid',
      ''
    ].join('\n')
    const errs = validateKeys(text)
    expect(errs.length).toBe(2)
    expect(errs.some(e => e.includes('invalid expiresAt date'))).toBe(true)
    expect(errs.some(e => e.includes('isActive must be'))).toBe(true)
  })

  it('shapeGrants/Revokes/KeyItems build payloads and skip blanks', () => {
    const grants = shapeGrants('u1,l1,2025-01-01T00:00:00Z,2025-12-31T00:00:00Z\n\n')
    expect(grants).toEqual([
      { userId: 'u1', lockId: 'l1', validFrom: '2025-01-01T00:00:00Z', validTo: '2025-12-31T00:00:00Z' }
    ])

    const revokes = shapeRevokes('u1,l1\n\n')
    expect(revokes).toEqual([{ userId: 'u1', lockId: 'l1' }])

    const items = shapeKeyItems('c1,u1,Main,2025-01-01T00:00:00Z,true\n\n')
    expect(items).toEqual([
      { cardId: 'c1', userId: 'u1', name: 'Main', expiresAt: '2025-01-01T00:00:00Z', isActive: true }
    ])
  })
})
