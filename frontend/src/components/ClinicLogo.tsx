interface Props {
  size?: number
  color?: string
}

/** Vector medical-cross mark — crisp, themeable brand icon. */
export default function ClinicLogo({ size = 26, color = '#ffffff' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* rounded shield */}
      <path
        d="M12 2.2 4.4 5.1a1.4 1.4 0 0 0-.9 1.3v5.2c0 4.6 3.2 8.2 8.1 10.1a1.2 1.2 0 0 0 .8 0c4.9-1.9 8.1-5.5 8.1-10.1V6.4a1.4 1.4 0 0 0-.9-1.3L12 2.2Z"
        fill={color}
        opacity={0.25}
      />
      {/* medical cross */}
      <path
        d="M10.4 6.8h3.2v3.6h3.6v3.2h-3.6v3.6h-3.2v-3.6H6.8v-3.2h3.6V6.8Z"
        fill={color}
      />
    </svg>
  )
}
