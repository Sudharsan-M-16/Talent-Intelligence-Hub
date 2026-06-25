interface SkillChipProps {
  skill: string
  variant?: 'primary' | 'secondary'
  onRemove?: () => void
}

export default function SkillChip({ skill, variant = 'primary', onRemove }: SkillChipProps) {
  return (
    <span className={`skill-chip ${variant}`}>
      {skill}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            marginLeft: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
            padding: 0,
            fontSize: 13,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          ×
        </button>
      )}
    </span>
  )
}
