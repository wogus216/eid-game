export const CONFIG = {
  maxEntry: 100,
  defaultEntry: 100,
  targetDb: 100,
  // 선물은 1차 3개 + 2차 3개. 돌림판은 3명을 뽑아 발표하고, 한 번 멈췄다 다음 3명을 뽑는다.
  prizeRounds: [
    { label: '1차 선물', count: 3 },
    { label: '2차 선물', count: 3 },
  ],
  // 시도별 대사는 그 시도와 함께 산다 — say는 진행 중, done은 끝난 뒤 꾸미의 말.
  attempts: [
    { peakDb: 92, success: false, say: '자, 다 같이 소리 질러!', done: '오— 좋았어! 근데 더 할 수 있지?' },
    { peakDb: 98, success: false, say: '이번엔 진짜 크게!', done: '앗! 정말 조금 남았어!' },
    { peakDb: 104, success: true, say: '마지막이야. 준비됐어?', done: '해냈다!! 우리가 해냈어!' },
  ],
  escHoldMs: 1500,
  // 관객이 읽는 문구는 전부 꾸미의 말. 운영자용 문구(큐 칩·초기화 안내)만
  // 시스템 말투를 유지한다 — 말하는 사람이 다르기 때문이다.
  copy: {
    standbyTitle: '안녕! 난 꾸미야 👋',
    decibelIntro: '소리 크게 낼 준비 됐어?',
    rouletteTitle: '누가 될까… 두근두근',
    rouletteChant: '돌려 돌려 돌림판!',
    rouletteAlmost: '나와라 나와라…!',
    resultTitle: '축하해! 오늘 정말 멋졌어',
    joinTitle: '이름 알려줄래?',
    joinPlaceholder: '이름을 입력해 줘',
    joinEmpty: '이름을 알려줘!',
    joinSuccess: (name: string) => `${name}, 반가워!`,
    joinWelcome: '로그인 완료! 이따 무대에서 만나자',
    joinButton: '로그인',
    escHoldHint: '초기화하려면 Esc를 계속 누르세요…',
    entryCountLabel: (n: number) => `입장 ${n}명`,
    restartButton: '다시하기',
    mutedHint: '소리 꺼짐 · M',
    cuePrefix: 'Enter ▶',
    cue: {
      standby: '데시벨 게임 시작',
      attemptReady: (n: number) => `${n}차 준비`,
      attemptStart: (n: number) => `${n}차 함성 시작!`,
      toRoulette: '돌림판으로',
      draw: (n: number) => `${n}번째 추첨`,
      nextRound: (label: string) => `${label} 추첨`,
      toResult: '결과 발표',
    },
  },
} as const

export type AttemptSpec = (typeof CONFIG.attempts)[number]
export type PrizeRound = (typeof CONFIG.prizeRounds)[number]
