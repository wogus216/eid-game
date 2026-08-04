export function Mascot({ size, className = '' }: { size: number; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}mascot.png`}
      alt=""
      style={{ width: size, height: 'auto' }}
      className={`mascot ${className}`}
      draggable={false}
    />
  )
}
