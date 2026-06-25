interface PageLoaderProps {
  fullScreen?: boolean
}

export default function PageLoader({ fullScreen }: PageLoaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: fullScreen ? '100vh' : '100%',
        minHeight: fullScreen ? undefined : 200,
        color: 'var(--text-muted)',
        gap: 10,
        background: fullScreen ? 'var(--bg-base, #0c0c0f)' : undefined,
      }}
    >
      <div className="spinner" />
      <span style={{ fontSize: 13, fontFamily: 'Figtree, sans-serif' }}>Loading...</span>
    </div>
  )
}
