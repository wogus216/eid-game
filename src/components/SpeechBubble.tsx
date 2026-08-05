import type { ReactNode } from 'react'

/**
 * 꾸미의 말풍선. 꼬리가 꾸미 쪽을 가리켜 '누가 말하는지'를 만든다.
 * 문구는 뒷줄까지 읽혀야 하므로 크게 가운데 두되, 꼬리로 화자를 연결한다.
 */
export function SpeechBubble({
  children,
  tail = 'right',
  className = '',
}: {
  children: ReactNode
  tail?: 'left' | 'center' | 'right'
  className?: string
}) {
  return <h1 className={`scene-title tail-${tail} ${className}`}>{children}</h1>
}
