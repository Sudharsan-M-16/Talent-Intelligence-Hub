import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, FileText, Loader2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { safeUrl } from '../../lib/utils'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

interface ResumePreviewProps {
  resumeUrl?: string
  resumeFile?: File
  onClose: () => void
}

const MAX_PAGES = 10

export default function ResumePreview({ resumeUrl, resumeFile, onClose }: ResumePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPdf =
    resumeFile?.type === 'application/pdf' ||
    (resumeUrl ? resumeUrl.toLowerCase().includes('.pdf') || resumeUrl.startsWith('data:application/pdf') : false)

  useEffect(() => {
    if (!isPdf) return

    let cancelled = false

    async function renderPdf() {
      setLoading(true)
      setError(null)

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let source: any

        if (resumeFile) {
          source = { data: await resumeFile.arrayBuffer() }
        } else if (resumeUrl) {
          source = resumeUrl
        } else {
          return
        }

        const loadingTask = pdfjsLib.getDocument(source)
        const pdf = await loadingTask.promise

        if (cancelled) return

        const total = Math.min(pdf.numPages, MAX_PAGES)
        setPageCount(total)

        // Clear previous canvases
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        for (let i = 1; i <= total; i++) {
          if (cancelled) break

          const page = await pdf.getPage(i)
          if (cancelled) break

          const viewport = page.getViewport({ scale: 1.5 })

          const wrapper = document.createElement('div')
          wrapper.style.cssText = `
            margin: 0 auto 12px;
            max-width: 100%;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid var(--border);
            background: #fff;
          `

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.cssText = `display: block; width: 100%; height: auto;`

          wrapper.appendChild(canvas)

          if (containerRef.current) {
            containerRef.current.appendChild(wrapper)
          }

          const ctx = canvas.getContext('2d')
          if (ctx) {
            // pdfjs-dist v6 requires canvas in RenderParameters
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (page.render as any)({ canvasContext: ctx, viewport, canvas }).promise
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PDF render error:', err)
          setError('Failed to render PDF. The file may be corrupt or unsupported.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    renderPdf()

    return () => {
      cancelled = true
    }
  }, [resumeUrl, resumeFile, isPdf])

  const hasResume = !!(resumeUrl || resumeFile)

  return (
    <motion.div
      initial={{ x: 480 }}
      animate={{ x: 0 }}
      exit={{ x: 480 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        right: 0,
        top: 'var(--topbar-h, 56px)',
        bottom: 0,
        width: 480,
        zIndex: 50,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={15} color="var(--accent)" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: "'Figtree', sans-serif",
            }}
          >
            Resume Preview
          </span>
          {pageCount > 0 && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                padding: '1px 7px',
              }}
            >
              {pageCount} page{pageCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ padding: '4px 6px', height: 30 }}
          aria-label="Close preview"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        {!hasResume && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'var(--text-muted)',
            }}
          >
            <FileText size={36} strokeWidth={1.2} />
            <span style={{ fontSize: 13 }}>No resume uploaded</span>
          </div>
        )}

        {hasResume && !isPdf && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            <FileText size={36} strokeWidth={1.2} />
            <span style={{ fontSize: 13 }}>Preview not available for this file type.</span>
            {safeUrl(resumeUrl) && (
              <a
                href={safeUrl(resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ fontSize: 12, marginTop: 6, textDecoration: 'none' }}
              >
                Open file
              </a>
            )}
          </div>
        )}

        {hasResume && isPdf && loading && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'var(--text-secondary)',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Rendering PDF…</span>
          </div>
        )}

        {hasResume && isPdf && error && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '0 16px',
            }}
          >
            <FileText size={36} strokeWidth={1.2} />
            <span style={{ fontSize: 13 }}>{error}</span>
            {safeUrl(resumeUrl) && (
              <a
                href={safeUrl(resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ fontSize: 12, marginTop: 6, textDecoration: 'none' }}
              >
                Download resume
              </a>
            )}
          </div>
        )}

        {/* Canvas container — pdfjs renders into this */}
        <div
          ref={containerRef}
          style={{ display: hasResume && isPdf && !loading && !error ? 'block' : 'none' }}
        />
      </div>
    </motion.div>
  )
}
