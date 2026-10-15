# For Garden 공식 홈페이지

게임의 실제 배경·렐릭 아트로 만든 반응형 홈페이지. 한국어·영어·일본어, 공지 분류·상세·공유 URL, 렐릭 선택, 출시 알림 폼을 제공합니다. 출시일·예약자 수·보상은 확정되지 않은 값을 표시하지 않습니다.

## 실행 / Vercel

Node 24 기준. `npm ci` → `npm run dev` (기본 5173). 게임과 함께 실행할 때는 `npm run dev -- --port 5174`. 개발 서버에서 `/api/*`도 동작합니다. `npm run build`로 타입 검사와 배포 빌드를 실행합니다.

Vercel Framework: Vite, Build: `npm run build`, Output: `dist`. `api/`는 Vercel Node 서버리스 함수입니다. `vite preview`는 정적 빌드만 제공하므로 API는 개발 서버나 Vercel에서 검증하세요. Vercel에 Git 연동이 설정되어 있으면 `main`에 푸시할 때 프로덕션 배포가 시작됩니다. 배포 성공 여부는 Vercel의 해당 커밋 상태에서 확인하세요.

## 공지 운영

Supabase 미설정 시 `server/seed-notices.ts`의 세 언어 기본 안내문을 제공합니다. 날짜는 운영 시 실제 게시일로 조정하세요. DB 연결 후에는 DB만 조회하며, 장애 시 기본 공지를 최신 공지처럼 표시하지 않습니다.

`supabase/migrations/202610160001_website.sql`을 의도한 forgarden 프로젝트에서 검토 후 적용하세요. 기존 게임 테이블은 수정하지 않습니다. 원격 적용은 수행하지 않았습니다.

`website_notices`에 slug·분류·게시일·상태를, `website_notice_translations`에 같은 notice_id의 ko/en/ja 제목·요약·본문을 입력합니다. `status=published`이고 게시일이 지난 항목만 공개됩니다. 번역이 없는 언어에서는 노출하지 않습니다. Supabase Dashboard에서 관리하거나 추후 Admin 편집 UI를 연결할 수 있습니다. Admin UI는 이번 범위에 포함하지 않았습니다.

본문은 일반 텍스트이며 HTML은 이스케이프합니다. 주소 `/?lang=ko&notice=welcome-to-garden`으로 공지를 공유할 수 있습니다.

## 출시 알림 / 사전예약

현재는 **출시 알림 신청**이며 스토어 사전예약·보상 지급·메일 발송을 가장하지 않습니다.

Vercel에 `.env.example`의 서버 환경 변수를 입력하세요. 서비스 역할 키는 브라우저에 포함하지 않습니다. DB 마이그레이션, `PREREGISTRATION_ENABLED=true`, 운영 주체·개인정보 문의처가 모두 준비돼야 접수를 엽니다. 미설정·DB 오류 시 503을 반환하고 화면은 접수 완료를 표시하지 않습니다. 키를 채팅·Git에 남기지 마세요.

이메일·플랫폼·언어·동의 시각·동의문 버전을 저장합니다. 중복 이메일은 동일 응답을 보내지만 기존 동의를 덮어쓰지 않습니다. IP는 저장하지 않고 HMAC으로 변환해 시간당 5회 제한에 사용하며 오래된 제한 기록은 접수 시 정리합니다. 인터넷 운영 시 Vercel Firewall/봇 보호를 함께 설정하세요. 개인정보는 로그에 남기지 않습니다.

개인정보 안내는 알림 종료 후 30일 이내 파기를 명시하므로 운영자가 삭제를 이행해야 합니다. 운영 주체·문의처 공개 후 접수를 여세요. 이메일 공급자·수신 거부 처리·발송 자동화는 별도 연결이 필요합니다.

## 디자인 / 에셋

`public/assets`는 게임 배경 및 Puppet ZIP의 원화를 웹용으로 최적화했습니다. 게임 저장소는 변경하지 않았습니다. NEXON 폰트 라이선스는 `public/assets/FONT-LICENSES.md`에 포함합니다. 외부 폰트·추적 리소스는 로드하지 않습니다.

폰트는 인게임의 실제 `public/fonts/` 파일을 그대로 복사합니다. NEXON Kart Medium/Bold/ExtraBold를 각각 500/700/800으로 등록하고, 일본어는 게임의 FG Sans JP 500/700/800 파일을 동일한 폴백 순서로 사용합니다. 임의의 비슷한 폰트나 합성 굵기는 사용하지 않습니다. 모든 언어·반응형 구간에서 안내·라벨·본문의 CSS 폰트 크기는 최소 12px이며, 본문은 주로 15~16px입니다.

타이틀 로고는 인게임 `sprites/ui/titlename.webp`의 투명 여백만 정리한 원본 아트입니다. 게임을 실행해 타이틀·로비·렐릭 도감·연구소·지도·편성·전투 화면 7장을 직접 캡처하고 `public/assets/screenshots/`에 웹용 WebP로 저장했습니다. 홈페이지에서 각 화면을 확대할 수 있습니다. 자세한 출처와 확인 기록은 `docs/game-style-audit.md`에 있습니다.

참고 요청 사이트 `https://stellarcraft.biz/`는 환경 네트워크 정책상 차단돼 직접 시각 분석하지 못했습니다. 게임 세계관을 바탕으로 독자적으로 구성했습니다.
