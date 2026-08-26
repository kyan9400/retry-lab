import '@testing-library/jest-dom/vitest'

Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
