import React from 'react'

interface SkeletonLoaderProps {
  width?: string | number
  height?: string | number
  borderRadius?: number
  count?: number
  style?: React.CSSProperties
}

export default function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = 6,
  count = 1,
  style,
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count })
  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer"
          style={{
            width,
            height,
            borderRadius,
            marginBottom: count > 1 && i < count - 1 ? 8 : 0,
            ...style,
          }}
        />
      ))}
    </>
  )
}
