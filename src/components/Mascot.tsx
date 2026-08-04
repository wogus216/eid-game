export function Mascot({ size, className = '' }: { size: number; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}mascot.svg`}
      alt=""
      width={size}
      height={size}
      className={`mascot ${className}`}
      draggable={false}
    />
  )
}
