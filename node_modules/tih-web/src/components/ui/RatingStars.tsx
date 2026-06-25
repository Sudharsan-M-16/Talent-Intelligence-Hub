interface RatingStarsProps {
  rating?: number
  max?: number
  size?: number
  showValue?: boolean
}

export default function RatingStars({
  rating = 0,
  max = 5,
  size = 12,
  showValue = false,
}: RatingStarsProps) {
  const stars = Array.from({ length: max }, (_, i) => {
    const filled = rating >= i + 1
    const half = !filled && rating > i && rating < i + 1
    return { filled, half }
  })

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {stars.map((s, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill="none">
          {s.filled ? (
            <path
              d="M8 1l1.854 3.756L14 5.569l-3 2.924.708 4.131L8 10.75l-3.708 1.874L5 8.493 2 5.569l4.146-.813L8 1z"
              fill="#fbbf24"
            />
          ) : s.half ? (
            <>
              <path
                d="M8 1l1.854 3.756L14 5.569l-3 2.924.708 4.131L8 10.75V1z"
                fill="#374151"
              />
              <path
                d="M8 1l-1.854 3.756L2 5.569l3 2.924-.708 4.131L8 10.75V1z"
                fill="#fbbf24"
              />
            </>
          ) : (
            <path
              d="M8 1l1.854 3.756L14 5.569l-3 2.924.708 4.131L8 10.75l-3.708 1.874L5 8.493 2 5.569l4.146-.813L8 1z"
              fill="#374151"
            />
          )}
        </svg>
      ))}
      {showValue && rating > 0 && (
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 3, fontWeight: 500 }}>
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  )
}
