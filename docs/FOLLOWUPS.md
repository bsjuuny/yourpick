# 남은 작업

2026-10-26 Cafe24 데이터 로딩 복구(PR #1)와 지역 랭킹 삭제(`3e55ec1`) 배포 뒤 남은 일.
끝난 항목은 지우지 말고 완료 날짜와 커밋을 적는다.

## 1. 운영 서버의 옛 랭킹 파일 삭제

- 상태: **완료 2026-11-17** (사용자 승인) — SFTP 1회 로그인으로 `ranking/`, `data/region-ranking.json`, 지역 코드가 바뀐 옛 데이터 16개(28_28110·28140·28260, 29_29110·29140·29155·29170·29200 의 유치원·어린이집 파일) 삭제, 18/18 삭제·재확인 0건 잔존. 배포 업로더는 여전히 파일을 지우지 않으므로, 지역·페이지를 없앨 때는 같은 방식으로 따로 지운다.
- 배경: `scheduler/lib/ftp.mjs` 업로더는 파일을 추가·덮어쓰기만 하고 지우지 않는다.
  그래서 랭킹 삭제 배포 뒤에도 옛 파일이 남아 주소로 직접 열린다.
- 대상 (Cafe24 `/www/yourpick/` 기준):
  - `ranking/` 디렉터리 (옛 랭킹 페이지)
  - `data/region-ranking.json`
- 방법: SFTP로 한 번만 로그인해 위 두 경로만 삭제한다. 로그인 실패를 반복하면 IP가 차단되므로 재시도하지 않는다.
- 확인: `https://bsjuuny2026.mycafe24.com/yourpick/ranking/`과 `/yourpick/data/region-ranking.json`이
  옛 내용을 돌려주지 않을 것. 홈 → 검색 → 비교가 여전히 정상일 것.
- 참고: 앞으로 삭제한 페이지가 남지 않게 하려면 배포 스크립트에 서버 잔여 파일 정리를 추가하는 방안도 있다(별도 검토).

## 2. 로컬 메인 체크아웃의 미커밋 변경 정리

- 상태: **완료 2026-11-17** — 커밋 안 한 변경 13개 파일을 로컬 브랜치 `local/uncommitted-2026-11-17`(476702f, 원격에 올리지 않음)에 그대로 커밋하고 로컬 main 을 origin/main 과 맞췄다. 검색 노출 메타데이터(`layout.tsx`)는 필요하면 그 브랜치에서 골라 PR 로 올린다. `.mjs` 사본은 지금 스크립트보다 오래돼 그대로 쓰면 안 된다.
- 대상: `C:\github\yourpick`의 `src/app/layout.tsx`(SEO 메타데이터), `README.md`(자동 배포 설명), `CLAUDE.md`, `AGENTS.md`(미추적)
- 주의: 이 체크아웃은 `origin/main`보다 뒤처져 있다. `3993af4`가 `layout.tsx`에서 `DonationPopup`을
  `Layout.tsx`로 옮겼으므로, 최신 main을 받을 때 `layout.tsx`의 메타데이터 추가분만 남기고
  `DonationPopup` import·렌더링은 빼야 한다. `README.md`의 Cafe24 배포 절도 main 쪽 `build:static` 안내와 합친다.
- `AGENTS.md`의 `build-ranking.js` 언급은 삭제된 스크립트이므로 함께 고친다.

## 3. 기존 코드 문제 (기능 영향 없음)

- 상태: **완료 2026-11-17** — 비교함 링크 prefetch 끔(PR #6, 홈→목록→비교 4xx 0건), `compare/page.tsx` effect 안 setState·의존성 경고 정리, CommonJS 스크립트 require 예외 주석, 쓰이지 않는 import 제거. CI ESLint 를 `src scripts tests` 전체로 넓혔다.
- Next 16 정적 export의 RSC 프리페치 요청 `/<route>/__next.<route>.__PAGE__.txt`가 404다.
  파일은 `<route>/__next.<route>/__PAGE__.txt`로 생성된다. 페이지 이동은 정상(하드 내비게이션으로 대체)이며
  Cafe24에서는 HTML이 200으로 돌아온다. Next 업데이트나 링크 `prefetch={false}` 적용을 검토한다.
- CI 대상 밖 ESLint 오류 4건: `src/app/compare/page.tsx`(`any` 사용, effect 안 동기 `setState`),
  `scripts/augment-data.js`(`require` import 2건). 고친 뒤 CI의 eslint 파일 목록에 추가한다.
- `src/components/layout/Navbar.tsx`의 쓰지 않는 `Search` import 경고.

## 4. 맞춤 추천 2단계 이후 (2026-11-17, `feat/fit-recommendation`)

- 상태: 대기 (사용자 결정 필요)
- 통학시간: 경로 API(카카오맵 대중교통·도보 등)는 결과 저장·캐시가 금지되고 REST 키를 브라우저에 둘 수 없다.
  넣으려면 Cafe24 PHP 중계 + 비교함(최대 5곳)만 실시간 조회로 범위를 정하고, 키 등록·호출 시험 횟수를 승인받는다.
  자동차 경로(카카오모빌리티)는 상업적 이용 시 제휴가 필요하다는 안내가 있어 제외 검토.
- 예산: 기관별 실제 원비를 모으지 않아 지금은 모두 '확인 필요'. 유치원알리미·어린이집 공시에서 원비 항목을 받을 수 있는지 확인.
- 통학차량: 수집기가 운영 여부를 true/false 로만 저장해 '운영 안 함'과 '공시 없음'을 구분하지 못한다.
  `fetch-data.js` 에서 세 가지(운영/미운영/공시 없음)로 저장하면 통학차량 필수 조건을 '미충족'까지 판정할 수 있다.
- 주소 직접 입력: 지오코딩 API(카카오 로컬 등) 약관·키 노출을 검토한 뒤 결정. 지금은 행정동 선택과 기기 현재 위치(저장 안 함)만.
- 행정동 목록(`public/data/dongs.json`)은 경계 스냅샷이 바뀌면 `scripts/geo/build-dong-centroids.py` 로 다시 만든다.

## 5. 울릉군 유치원 1곳 위치 미확인 (2026-11-17, 전국 확대 Codex 검수)

- 상태: **확인 2026-11-17** — 단순화하지 않은 원본 경계(admdongkor 2026-10-01)로도 좌표가 울릉군 북면 해안선 밖 약 135m(바다 쪽)라 경계 단순화 문제가 아니다. 공시 좌표 오차로 보고 위치 미확인을 유지한다(거리 계산에서 빠짐). 실제 위치는 공식 지도로 따로 확인할 수 있다.
- 천부초등학교병설유치원(경상북도 울릉군 천부길 95-3)의 공시 좌표가 울릉군 경계 밖으로 판정돼 `region_mismatch`(위치 미확인)다.
  섬 해안선 경계를 0.0001도로 단순화한 영향일 수 있다. 위치 미확인 기관은 지도·거리 계산에서 이미 빠진다.
- 확인: 공식 지도에서 실제 위치를 보고, 경계 단순화 때문이면 `build-boundaries.py`의 단순화 정도를 섬 지역에 맞게 조정한다.

## 6. 계룡시 어린이집 (2026-11-17)

- 어린이집 정보공개 API 가 계룡시(44250)에 어떤 코드로도 결과를 주지 않는다(코드 대입 확인). 유치원만 표시하고 목록에서 안내한다.
- 공개 API 에 나오기 시작하면 `fetch-data.js` REGIONS 의 `childcareUnavailable` 을 지운다(데이터 검사가 빈 목록이 아니면 막는다).
