import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock pdfjs-dist (heavy binary, not needed in tests)
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() =>
        Promise.resolve({
          getTextContent: vi.fn(() => Promise.resolve({ items: [] })),
        })
      ),
    }),
  })),
  GlobalWorkerOptions: { workerSrc: '' },
}))

// Mock pdfjs worker url import
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '' }))

// Mock mammoth
vi.mock('mammoth', () => ({
  extractRawText: vi.fn(() => Promise.resolve({ value: '' })),
}))

// Mock read-excel-file browser build
vi.mock('read-excel-file/browser', () => ({
  default: vi.fn(() => Promise.resolve([])),
  readSheet: vi.fn(() => Promise.resolve([])),
}))

// Mock write-excel-file browser build
vi.mock('write-excel-file/browser', () => ({
  default: vi.fn(() => ({ toFile: vi.fn() })),
}))
