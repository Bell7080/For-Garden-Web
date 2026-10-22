# 메인 소개 화면 배치 복구

공지 상세의 `.hero-copy`가 메인 소개 영역과 충돌해 `position: absolute; display: flex; left: 18px; bottom: 16px`를 메인에도 적용했다. PC에서는 소개문 폭이 1,412px로 퍼지고 휴대폰에서는 y=-21px로 올라가 본문이 겹쳤다.

공지 내부 마크업과 스타일을 `.notice-hero-copy`로 분리했다. 메인은 원래의 relative/block과 반응형 그리드로 돌아오고, 공지의 배지/버전 위치는 절대 위치를 유지한다.

- 기존 41개 테스트와 production build(독립 Node API runtime 검사 포함) 통과.
- Chromium: ko/en/ja × 390/820/1440px, 9가지 화면 통과. 메인 위치·폭·가로 넘침, 공지 상세/스크롤 영역, 언어 선택기 열기/Escape, 빈 폼 검증·실제 전송 없음, 동의 체크박스 포커스를 확인했다.
- 실제 게임 이미지·글꼴·공지 세 가지 표시 양식·브라우저 기본 스크롤을 유지했다.
