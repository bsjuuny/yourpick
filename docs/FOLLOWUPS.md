# 남은 작업

2026-10-26 Cafe24 데이터 로딩 복구(PR #1)와 지역 랭킹 삭제(`3e55ec1`) 배포 뒤 남은 일.
끝난 항목은 지우지 말고 완료 날짜와 커밋을 적는다.

## 1. 운영 서버의 옛 랭킹 파일 삭제

- 상태: 대기 (운영 서버 삭제라 실행 전 승인 필요)
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

- 상태: 대기 (사용자 작업 — 내용 확인 후 커밋 여부 결정)
- 대상: `C:\github\yourpick`의 `src/app/layout.tsx`(SEO 메타데이터), `README.md`(자동 배포 설명), `CLAUDE.md`, `AGENTS.md`(미추적)
- 주의: 이 체크아웃은 `origin/main`보다 뒤처져 있다. `3993af4`가 `layout.tsx`에서 `DonationPopup`을
  `Layout.tsx`로 옮겼으므로, 최신 main을 받을 때 `layout.tsx`의 메타데이터 추가분만 남기고
  `DonationPopup` import·렌더링은 빼야 한다. `README.md`의 Cafe24 배포 절도 main 쪽 `build:static` 안내와 합친다.
- `AGENTS.md`의 `build-ranking.js` 언급은 삭제된 스크립트이므로 함께 고친다.

## 3. 기존 코드 문제 (기능 영향 없음)

- 상태: 대기
- Next 16 정적 export의 RSC 프리페치 요청 `/<route>/__next.<route>.__PAGE__.txt`가 404다.
  파일은 `<route>/__next.<route>/__PAGE__.txt`로 생성된다. 페이지 이동은 정상(하드 내비게이션으로 대체)이며
  Cafe24에서는 HTML이 200으로 돌아온다. Next 업데이트나 링크 `prefetch={false}` 적용을 검토한다.
- CI 대상 밖 ESLint 오류 4건: `src/app/compare/page.tsx`(`any` 사용, effect 안 동기 `setState`),
  `scripts/augment-data.js`(`require` import 2건). 고친 뒤 CI의 eslint 파일 목록에 추가한다.
- `src/components/layout/Navbar.tsx`의 쓰지 않는 `Search` import 경고.
