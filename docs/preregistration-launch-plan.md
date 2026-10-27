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

**새 마이그레이션은 필요 없다.** 인원 API는 기존 표를 서비스 롤로 `count=exact` 조회만 한다.

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
3. 폼에 테스트 메일로 신청 → 성공 문구. 테스트 DB에 행 1개 생겼는지 확인. 같은 메일 재신청 → 성공 응답이지만 행은 그대로.
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
