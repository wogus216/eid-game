# 데시벨 게임 - EID 이벤트 앱

발표회 현장에서 운영되는 두 페이지 이벤트 앱입니다.
- **무대 앱** (`/`): 전체 게임 진행 (Standby → Decibel Challenge → Roulette Draw → Result)
- **참가자 폰 페이지** (`/join.html`): 이름 입력 및 성공 연출

## 설치 및 실행

```bash
npm install
npm run dev          # 개발 서버 시작 (포트 5173)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run test         # 단위 테스트
npm run typecheck    # 타입 체크
npm run lint         # 코드 스타일 검사
```

## 무대 앱 운영 가이드

### 실행 방법

1. **개발 중**: `npm run dev` 후 브라우저에서 `http://localhost:5173/` 접속
2. **본행사**: `npm run build` 후 `npm run preview`로 빌드 결과 확인, 또는 `dist` 폴더를 웹 서버로 정적 배포
3. **전체화면**: 브라우저 접속 후 `F` 키 누르기

### 운영자 키 맵

| 키 | 기능 |
|---|---|
| `Enter` | 다음 단계 진행 |
| `←` (왼쪽 화살표) | 이전 단계로 돌아가기 |
| `↑` (위 화살표) | 입장 인원 증가 |
| `↓` (아래 화살표) | 입장 인원 감소 |
| `R` | 돌림판 재추첨 (마지막 winner만) |
| `F` | 전체화면 전환 |
| `Esc` (1.5초 홀드) | 초기화 (리허설 종료 후 필수) |

### 스테이트 복구

앱 상태는 브라우저 localStorage에 자동 저장됩니다. 새로고침하면 이전 진행 상태가 그대로 복구됩니다.

## 참가자 폰 페이지

현장에 있는 참가자들이 자신의 폰에서 이름을 입력하고 성공 연출을 확인합니다.

### 배포 (미정)

폰 페이지 호스팅 URL이 확정되면:
1. 그 URL로 실제 QR 코드 생성
2. 영상 팀에 QR 코드 전달
3. 해당 QR을 스크린에 표시

현재는 로컬 테스트: `http://localhost:5173/join.html`

## 마스코트 이미지 교체

마스코트는 `public/mascot.svg`에 저장되어 있습니다.

**최종 이미지 받으면:**
1. 새 이미지로 `public/mascot.svg` 교체 (또는 `public/mascot.png` 추가 후 코드에서 확장자 수정)
2. 이미지 파일을 `public/` 디렉토리에 배치하면 앱 어디서나 자동 로드

## 기술 스택

- **React 19** + **TypeScript**
- **Vite** (빌드 도구)
- **Vitest** (단위 테스트)
- **Oxlint** (코드 스타일)

## 프로젝트 구조

```
eid_game/
├── src/
│   ├── stage/           # 무대 앱 (운영자)
│   ├── join/            # 참가자 폰 페이지
│   ├── state/           # 씬 머신 + persistence
│   ├── data/            # config.ts (한글 문구, 게임 설정)
│   ├── styles/          # CSS 토큰 & 스타일
│   └── components/      # Mascot 등 공용 컴포넌트
├── public/              # 정적 자산 (mascot.svg)
├── index.html           # 무대 앱 진입점
└── join.html            # 폰 페이지 진입점
```

## 리허설 체크리스트

`docs/rehearsal-checklist.md` 참고.
