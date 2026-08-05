/** 이미지는 한 장뿐이므로 감정은 전부 변형(스쿼시·스트레치·기울임)으로 만든다. */
export type MascotMood = 'idle' | 'wave' | 'tense' | 'nervous' | 'sad' | 'cheer' | 'excited'

export function Mascot({ size, mood = 'idle' }: { size: number; mood?: MascotMood }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}mascot.png`}
      alt=""
      style={{ width: size, height: 'auto' }}
      className={`mascot mascot-${mood}`}
      draggable={false}
    />
  )
}
