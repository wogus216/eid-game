# 참가 화면 — 로그인 완료 후 데시벨 루프 화면 설계

작성일: 2026-08-06
대상: `eid-game` (건양대 AI·SW 캠프 데시벨 게임)

## 배경

참가자가 `join.html`에서 이름을 입력하고 로그인을 마치면 "OO, 반가워!" 완료 화면만 보인다. 무대 쪽 데시벨 게임을 기다리는 동안 참가자가 지루하지 않도록, 완료 화면에 "스타트" 버튼을 추가하고 누르면 데시벨 숫자가 계속 오르락내리락하는 장식용 화면으로 전환한다. 옆에는 꾸미(마스코트)가 함께 나와 숫자에 반응한다.

참가 화면(`JoinApp`)은 무대 쪽 `showMachine`/localStorage 상태와 지금도 완전히 분리되어 있고, 이 기능도 실제 게임 판정(성공/실패, 목표 dB)이 없는 순수 장식이므로 계속 분리된 채로 둔다.

## 상태 모델

`JoinApp`의 `submitted: boolean` 하나를 `stage: 'form' | 'success' | 'decibel'` 3단계로 바꾼다.

- `form`: 현재의 이름 입력 화면
- `success`: 현재의 "OO, 반가워!" 완료 화면 + 새로 추가되는 "스타트" 버튼
- `decibel`: 스타트 버튼을 누르면 진입하는 데시벨 루프 화면

전환은 `form → success → decibel` 단방향이다. 뒤로가기는 두지 않는다(기존 참가 플로우도 되돌아가는 길이 없어 일관됨).

## `useIdleDecibelLoop` 훅

기존 `useDecibelAnim`(목표 dB까지 상승 후 종료 콜백을 호출하는 시도형 훅)과는 별도로, 시작·종료·목표 개념이 없는 순수 장식용 훅을 새로 만든다.

- `requestAnimationFrame` 기반으로 여러 sine 파형을 합성해 대략 20~105dB 범위를 영원히 오르내리는 값을 반환한다. 느린 파형(진폭 큰, 주기 4~6초)으로 전체적인 오르내림을 만들고, 빠른 파형(진폭 작은, 주기 0.3초 전후)을 더해 값이 딱딱하지 않고 살아있게 만든다(`useDecibelAnim`의 지터 방식과 동일한 결).
- `onDone`, `peakDb`, `attemptKey` 같은 인자는 없다. `useEffect` 정리(`cancelAnimationFrame`)만 있으면 된다.
- 언마운트 없이 계속 실행되므로 `decibel` 단계에 머무는 동안 멈추지 않는다.

## 화면 구성

`success` 단계 화면 하단에 "스타트" 버튼을 추가한다. 기존 참가 폼의 버튼 스타일(`join button`)을 그대로 재사용한다.

`decibel` 단계 화면:

- 맨 위: 꾸미의 대사 한 줄(`copy.joinDecibelTitle`)
- 그 아래: 가로 배치 — **왼쪽 꾸미 / 오른쪽 큰 dB 숫자**
- dB 값이 임계치를 넘으면(오를 때 68dB, 내릴 때 62dB — 경계에서 mood가 떨리지 않도록 히스테리시스를 둔다) 꾸미 `mood`를 `idle`(둥실둥실) ↔ `tense`(부르르 떨림)로 전환한다. 임계값 판단과 전 단계 mood 유지는 `useState`로 들고 있는다.

## 스타일

`join.css`에 새 클래스를 추가한다. 무대용 `stage.css`의 게이지·스파크 이펙트는 가져오지 않고, 참가자 화면에 맞게 단순하게 만든다.

- `.join-decibel`: 세로 flex 컨테이너 (기존 `.join`과 톤 통일)
- `.decibel-row`: 가로 flex, 꾸미와 숫자를 나란히 배치
- `.decibel-readout`: 큰 dB 숫자 (기존 무대의 `.db-readout`과 톤은 맞추되 클래스는 join 전용으로 새로 만든다)

## `config.ts` 추가

```ts
copy: {
  // ...
  joinStartButton: '스타트',
  joinDecibelTitle: '얼마나 커질까? 두근두근!',
}
```

## 테스트

다른 애니메이션 훅(`useDecibelAnim` 등)도 별도 단위 테스트가 없는 것과 일관되게, `useIdleDecibelLoop`의 애니메이션 로직 자체는 테스트하지 않는다. 기존 테스트(`showMachine.test.ts`, `persistence.test.ts`, `draw.test.ts`)는 이번 변경과 무관하므로 손대지 않는다.

## 범위 밖

- 실제 마이크 입력을 이용한 소리 크기 측정
- 목표 dB 달성/실패 판정, 시도 횟수 등 실제 게임 로직
- 무대 쪽 `showMachine`/localStorage와의 연동
- 완료 화면 카피(“OO, 반가워!” / “로그인 완료…”) 문구 변경
