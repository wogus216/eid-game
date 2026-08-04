export const CONFIG = {
  maxEntry: 100,
  defaultEntry: 100,
  targetDb: 100,
  winnerCount: 4,
  attempts: [
    { peakDb: 92, success: false },
    { peakDb: 98, success: false },
    { peakDb: 104, success: true },
  ],
  escHoldMs: 1500,
  copy: {
    standbyTitle: '잠시 후 게임을 시작합니다',
    decibelTitle: '다 같이 소리 질러!',
    decibelFail: '아깝다!',
    decibelLastChance: '마지막 기회!',
    decibelSuccess: '목표 돌파!!',
    rouletteTitle: '돌려 돌려 돌림판',
    resultTitle: '축하합니다!',
    joinTitle: '이름으로 로그인',
    joinPlaceholder: '이름을 입력해 줘',
    joinEmpty: '이름을 알려줘!',
    joinSuccess: (name: string) => `${name}님, 로그인 완료!`,
    joinWelcome: '발표회에 온 걸 환영해!',
  },
} as const

export type AttemptSpec = (typeof CONFIG.attempts)[number]
