# 사전예약 오픈 구현 계획 (Codex 작업용)

홈페이지(For-Garden-Web)의 이메일 사전예약을 실제로 열고, 달성 게이지가 실제 인원을 보여 주게 하는 작업이다.
코드는 이미 main에 있다. 남은 일은 **운영 설정과 확인**이 대부분이다.

## 0. 현재 상태 (2026-10-27 확인)

| 항목 | 상태 |
| --- | --- |
| 화면 | 사전예약 폼 + 달성 보상 게이지(`src/ui/register-milestones.ts`, 단계·보상은 `src/preregistration.ts`) |
| 접수 API | `api/preregister.ts` — `PREREGISTRATION_ENABLED=true`·운영자명·개인정보 문의처·Supabase가 모두 있어야 받는다. 하나라도 없으면 503 |
| 인원 API | `api/preregister-count.ts` — 홈페이지 사전예약 수 + `PREREGISTRATION_COUNT_OFFSET`. DB를 못 읽으면 `count: null`이라 화면이 숫자를 숨긴다. CDN 60초 캐시 |
| 운영 DB (`forgarden-prod`, ref `udujahnlyhedlrfbaaow`) | `website_preregistrations`·`website_registration_limits`·`register_website_interest`·`prereg_no_client` 정책 **모두 적용됨**, 현재 0행 |
| 테스트 DB (`forgarden-test`, ref `rscxzfdnbdmftortrcqt`) | 미확인 — 아래 1단계에서 확인 |

**2026-11-20 갱신 — 휴대폰 번호·동의 개편.** 폼은 이메일·휴대폰 중 하나 이상, [필수] 만 14세 이상, [필수] 수집·이용,
[선택] 광고성 정보(번호를 적으면 필수)를 받는다. 접수 API는 새 함수 `register_website_interest_v2`를 부르므로
**`supabase/migrations/20261124000000_preregistration_phone.sql`을 운영 DB에 먼저 적용한 뒤 배포**해야 한다
(적용 전 배포하면 접수가 503으로 떨어진다 — 행은 생기지 않는다). 같은 파일이 어드민 저장소에도 있고, 어드민 「사전예약」
화면(통계·조회·마스킹·CSV 내보내기·삭제)이 그 함수들을 읽는다. 같은 연락처는 409(`duplicate`)이며 기존 행을 바꾸지 않는다.
번호는 E.164(`+8210…`)로 굳혀 중복을 막는다(`server/contact.ts`). 유입 경로는 `?ref=gstar`처럼 붙인다.

## 1. DB 확인 (쓰기 없음)

두 프로젝트에서 아래를 읽기만 한다. 테스트 DB에 없으면 `supabase/migrations/202610160001_website.sql` →
`20261017080000_security_hardening.sql` 순서로 **테스트 DB에만** 적용한다. 운영 DB에는 아무것도 적용하지 않는다.

```sql
select to_regclass('public.website_preregistrations') as prereg,
       to_regclass('public.website_registration_limits') as limits,
       (select count(*) from pg_proc where proname = 'register_website_interest') as fn,
       (select count(*) from pg_policies where policyname = 'prereg_no_client') as policy;
```

## 2. Vercel 환경 변수 (프로젝트 `forgarden-web`)

Production·Preview 각각에 넣는다. Preview는 **테스트 DB**를, Production은 **운영 DB**를 가리킨다.

| 이름 | 값 | 비고 |
| --- | --- | --- |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | https만 허용 |
| `SUPABASE_SERVICE_ROLE_KEY` | 해당 프로젝트 service_role 키 | **서버 전용.** `VITE_` 접두사 금지, 채팅·Git에 남기지 않는다 |
| `SITE_OPERATOR_NAME` | 운영 주체 이름 | 개인정보 안내에 공개됨 — 응태 확인 필요 |
| `PRIVACY_CONTACT_EMAIL` | 개인정보 문의 메일 | 응태 확인 필요 |
| `PREREGISTRATION_ENABLED` | `true` | 마지막에 켠다 |
| `PREREGISTRATION_COUNT_OFFSET` | `0` | 스토어 사전등록이 열리면 그 인원을 넣는다(3단계) |

환경 변수는 재배포해야 반영된다. 변경 뒤 main 최신 커밋으로 Redeploy 한다.

## 3. 구글 플레이 사전등록이 열린 뒤

- 플레이 콘솔의 사전등록 인원을 주기적으로(예: 매일) `PREREGISTRATION_COUNT_OFFSET`에 넣고 재배포한다.
  자동화하려면 별도 작업으로 Edge Config나 Supabase의 설정 행에서 읽게 바꾼다(지금은 범위 밖).
- 홈페이지 주 버튼(`#register`)을 플레이 사전등록 링크로 바꾸는 것은 별도 결정이다. 이메일 폼은 iOS·PC 방문자용으로 남긴다.

## 4. 확인 절차

1. Preview 배포에서 `GET /api/site` → `registrationOpen: true`.
2. `GET /api/preregister-count` → `{"count": 0}` (또는 오프셋 값), 응답 헤더 `Cache-Control: public, s-maxage=60...`.
3. 폼에 테스트 메일로 신청 → 성공 문구. 테스트 DB에 행 1개 생겼는지 확인. 같은 메일 재신청 → 「이미 사전예약된…」(409), 행은 그대로.
4. 같은 IP로 6번째 신청 → 429(`rate_limited`) 문구.
5. 60초 뒤 게이지 숫자가 1 오른 것 확인.
6. 테스트 행 삭제(테스트 DB만): `delete from public.website_preregistrations where email = '<테스트 메일>';`
7. Production에 같은 변수를 넣고 재배포 → 1·2번만 확인(운영 DB에 테스트 행을 남기지 않는다).
8. `npm test`, `npm run build` 통과 확인.

## 5. 함께 할 운영 설정

- Vercel Firewall에서 `/api/preregister` 봇 보호·속도 제한을 켠다(README 권장).
- 개인정보 안내(`/legal/preregistration-consent`)는 목적을 **출시·사전예약 안내**로 적고 있다.
  달성 보상을 이메일 신청자에게 쿠폰 코드로 보내려면 그 안내 범위에 들어가는지 확인하고, 필요하면 동의문 버전
  (`consent_version`, 기본 `launch-notification-v1`)을 올려 문구를 고친다.
- 이메일 발송 공급자·수신 거부 처리는 아직 없다. 출시 알림을 보내기 전에 별도로 연결한다.
- 알림 종료 후 30일 이내 파기 약속을 지킬 삭제 작업을 일정에 넣는다.

## 6. 하지 말 것

- 운영 DB에 마이그레이션·테스트 데이터를 넣지 않는다.
- 접수가 꺼진 상태에서 성공을 흉내 내거나 인원수를 임의로 부풀리지 않는다(오프셋은 실제 스토어 인원만).
- 서비스 롤 키를 클라이언트 번들·로그·커밋에 넣지 않는다.

## 7. v3 — 번호 필수 · 번호 하나에 한 건 (2026-11-20)

가짜 이메일 여러 개로 인원을 부풀리는 일을 막으려고 휴대폰 번호를 필수로 바꿨다. 이메일은 선택이다.

### 전환 순서 (운영 적용은 응태가 직접)

2026-11-21: 1(마이그레이션 운영 적용)을 확인했다 — 칸·제약·함수·인덱스 모두 들어갔고 v3는 service_role만 실행한다. 이어서 2(홈페이지 배포)를 진행했다.

1. 마이그레이션 `supabase/migrations/20261125000000_preregistration_phone_required.sql`을 운영 DB에 적용한다(어드민 저장소에도 같은 사본이 있다). `20261124000000_preregistration_phone.sql` 다음이다.
2. 곧바로 홈페이지 main을 배포한다. 새 홈페이지는 `register_website_interest_v3`만 부르므로 1보다 먼저 배포하면 접수가 503이 된다.
3. 새 홈페이지로 한 건이 들어오는 것을 확인한 뒤 v2를 닫는다.
   `revoke all on function public.register_website_interest_v2(text, text, text, text, text, boolean, text, text) from service_role;`

### 바뀐 규칙

- 번호가 없으면 접수하지 않는다. 같은 번호가 이미 있으면 `duplicate`다.
- 예전에 이메일만으로 신청한 사람이 같은 이메일로 다시 오면 그 줄에 번호를 붙인다(새 줄을 만들지 않는다).
- 같은 접속지(IP 해시)는 시간당 5회, 하루 신청 10건까지다.
- 광고 수신 동의는 선택이다. 번호가 필수가 된 이상 광고 동의를 번호에 묶으면 선택 동의를 강제하게 된다(개인정보보호법 22조 5항). 문자 발송 명단에는 광고 동의자만 담긴다.
- 홈페이지 게이지는 번호가 있는 신청만 센다. 예전 이메일만의 신청은 번호를 붙이기 전까지 세지 않는다.
- 달성 단계와 보상 값은 `src/preregistration.ts` 한 곳이 갖는다(1천 젬 1000 · 3천 화석 10 · 5천 젬 3000 · 1만 호박석 10 · 3만 젬 5000). 달성 보상은 출시 뒤 모든 연구원에게 우편으로 준다.
- 어드민 「사전예약」 화면이 인정 인원, 예전 이메일만의 신청 수, 문자 발송 대상, 중복 의심(같은 접속지 3건 이상 · 별칭 메일 2건 이상 · 끝 네 자리가 이어진 번호 3개 이상)을 보여 준다. 자동으로 막지는 않는다.

### 인증 현황

- 지금 막는 것: 번호 형식(E.164, 한국 휴대폰 01X), 지어낸 번호(같은 숫자 반복 · 12345678 같은 연속 · 국번 0000), 일회용 메일 도메인.
- 인증 문자(SMS OTP)는 넣지 않았다. 문자 발송 업체(또는 Firebase 전화 인증 같은 서비스)가 정해져야 한다.
- 이메일 인증(확인 링크·OTP)도 넣지 않았다. Supabase 기본 메일 발송은 프로젝트 팀원 주소에만 시간당 몇 통만 보내므로 공개 접수에 쓸 수 없다. 커스텀 SMTP(메일 발송 업체)를 붙이면 넣을 수 있다.
- 자동 제출 방어(Cloudflare Turnstile · Vercel BotID)는 키·설정이 필요해 넣지 않았다.

### 지급할 때의 검증

- 단계 달성 보상은 모든 연구원에게 주는 전체 우편이라 사전예약 명단과 대조할 필요가 없다.
- 사전예약자 개인에게 주는 보상을 만들 때는 출시 후 계정 연동에서 **등록한 번호로 인증 문자를 받아** 확인하고, 번호 하나에 계정 하나만 받게 한다. 그 전에는 명단만으로 개인 보상을 주지 않는다. 동의 문서(preregistration-v3)에 이 확인 절차가 적혀 있다.

## 8. v4 동의 — 이메일도 필수 (2026-11-21)

응태 요청으로 휴대폰 번호와 이메일을 모두 필수로 바꿨다. 번호는 한 사람이 여러 번 신청하지 못하게 하고 보상 지급 때 본인을 확인하는 데, 이메일은 출시 안내의 기본 수단으로 쓴다.

- 마이그레이션 `20261126000000_preregistration_email_required.sql`(어드민에도 사본). 함수 이름 `register_website_interest_v3`는 그대로 두고 몸만 바꾸므로 홈페이지 배포와 적용 순서가 어느 쪽이어도 접수가 끊기지 않는다.
- 제약은 v4 동의로 들어온 행에만 걸린다. 예전에 한쪽만 적은 신청은 남고, 같은 번호(또는 이메일)로 다시 오면 빠진 연락처를 그 줄에 붙인다. 번호와 이메일이 서로 다른 신청에 걸리면 `duplicate`.
- 동의 문서 `preregistration-v4`: 수집 항목은 모두 필수(번호·이메일·플랫폼·언어·유입 경로·IP 해시·만 14세 확인·동의 기록), 광고성 정보 수신은 선택으로 분리. 광고 동의는 2년마다 재확인한다(정보통신망법 시행령).
- 게이지는 여전히 번호가 있는 신청을 센다.
