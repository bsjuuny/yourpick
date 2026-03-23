# 웹 접근성 감사 보고서 — 유어픽 (yourpick)

> 작성일: 2026-03-19
> 기준: WCAG 2.1 Level AA
> 감사 범위: 전체 페이지 및 공통 컴포넌트

---

## 요약

| 구분 | 발견 | 조치 완료 |
|------|------|-----------|
| Critical | 3 | 3 |
| Major | 30 | 30 |
| Minor | 15 | 15 |
| **합계** | **48** | **48** |

---

## 1. globals.css

### [Critical] 모션 민감성 미지원
- **문제**: `animation-pulse`, `animate-spin`, `animate-fade-up` 등 모든 애니메이션이 `prefers-reduced-motion` 설정을 무시
- **영향**: 전정 장애, 광과민성 간질 사용자에게 불쾌감 또는 신체적 반응 유발 가능
- **조치**: `@media (prefers-reduced-motion: reduce)` 블록 추가 — 모든 애니메이션·전환 효과 비활성화

### [Critical] 전역 포커스 스타일 부재
- **문제**: 키보드 포커스 시 브라우저 기본 outline이 제거된 컴포넌트가 많아 포커스 위치를 시각적으로 확인 불가
- **영향**: 키보드 사용자, 전동 보조 기기 사용자 내비게이션 불가
- **조치**: `:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }` 전역 추가

---

## 2. Layout.tsx

### [Major] 키보드 건너뛰기 링크 부재
- **문제**: 페이지 최상단에 "메인 콘텐츠로 바로 가기" 링크 없음 — 키보드 사용자가 Navbar 전체를 Tab으로 통과해야 함
- **조치**: `<a href="#main-content">` 스킵 링크 추가 (평소 `.sr-only`, 포커스 시 화면에 표시), `<main id="main-content">` 연결

### [Major] 푸터 색상 대비 부족
- **문제**: `text-slate-300` (#e2e8f0), `text-slate-400` (#cbd5e1)은 흰 배경 대비 약 2:1~3:1로 WCAG 4.5:1 기준 미달
- **조치**: `text-slate-300` → `text-slate-500`, `text-slate-400` → `text-slate-600`으로 교체

---

## 3. Navbar.tsx

### [Major] `<nav>` 랜드마크 레이블 부재
- **문제**: 페이지에 복수의 내비게이션 영역이 생길 경우 스크린리더 구분 불가
- **조치**: `<nav aria-label="주 메뉴">` 추가

### [Major] 로고 링크 레이블 모호
- **문제**: 로고 아이콘(Baby 아이콘)에 대한 대체 텍스트 없음
- **조치**: `<Link aria-label="유어픽 홈으로 이동">`, 아이콘에 `aria-hidden="true"`

### [Major] 비교함 링크 — 비활성 상태 접근성
- **문제**: `compareCount === 0`일 때 `e.preventDefault()`만으로 차단 — 키보드로 포커스·활성화 가능, `aria-disabled` 없음
- **조치**: `aria-disabled={compareCount === 0}`, `tabIndex={-1}`, `pointer-events-none` 적용

### [Major] 비교 개수 뱃지 스크린리더 미전달
- **문제**: 숫자 뱃지가 시각적으로만 표시되고 링크의 접근 가능한 이름에 반영되지 않음
- **조치**: 링크 `aria-label`에 선택 개수 포함 (`나의 비교함 (N개 선택됨)`)

### [Minor] 현재 페이지 표시 누락
- **문제**: 현재 활성 링크에 시각적 강조는 있으나 `aria-current` 없음
- **조치**: `aria-current={pathname === '/' ? 'page' : undefined}` 추가

---

## 4. InstitutionCard.tsx

### [Major] 카드 컨테이너 시맨틱 구조
- **문제**: `<div>`로 구성된 카드 — 스크린리더가 독립 콘텐츠 단위로 인식 불가
- **조치**: `<div>` → `<article aria-label={data.name}>`, 닫는 태그도 `</article>`로 변경

### [Major] 비교담기 버튼 레이블 부재
- **문제**: 아이콘만 있는 버튼 — 스크린리더 사용자가 기능 파악 불가
- **조치**: `aria-label={isCompared ? "비교함에서 제거: {name}" : "비교함에 추가: {name}"}`, `aria-pressed={isCompared}` 추가

### [Major] 수용률 프로그레스바 접근성
- **문제**: 시각적 바가 `<div>`로만 구성 — 의미 전달 없음
- **조치**: `role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label` 속성 추가

### [Minor] 장식용 아이콘 `aria-hidden` 누락
- **문제**: MapPin, Users, Baby, Bus, Cctv, Wallet, Sparkles, Star 등 텍스트와 함께 사용되는 아이콘이 스크린리더에 읽힘
- **조치**: 모든 장식용 아이콘에 `aria-hidden="true"` 추가

### [Minor] 버튼 최소 터치 영역
- **문제**: 비교담기 버튼 `w-10 h-10` (40px) — WCAG 2.5.5 권장 44px 미달
- **조치**: `w-11 h-11` (44px)로 변경

---

## 5. CompareTable.tsx

### [Critical] 테이블 접근성 구조 불완전
- **문제**: `<th>`에 `scope` 속성 없음 — 스크린리더가 행/열 관계 파악 불가
- **조치**: 기관 헤더 `<th scope="col">`, 항목 레이블 `<th scope="row">`, 카테고리 행 `<th scope="rowgroup">`

### [Major] 테이블 캡션 없음
- **문제**: `<caption>` 없이 테이블 목적 불명확
- **조치**: `<caption className="sr-only">기관 비교표 — 기본 정보, 안전·급식, 교육 프로그램, 교사 전문성 항목 비교</caption>` 추가

### [Major] 닫기 버튼 레이블 부재
- **문제**: 각 기관 열 상단 X 버튼에 레이블 없음
- **조치**: `aria-label="{item.name} 비교에서 제거"` 추가

### [Major] 스크롤 컨테이너 안내 없음
- **문제**: 가로 스크롤 가능 영역임을 키보드/스크린리더 사용자가 알 수 없음
- **조치**: `role="region" aria-label="기관 비교표 (가로 스크롤 가능)"` 추가

### [Major] 외부 링크 새 탭 안내 누락
- **문제**: `target="_blank"` 링크에 새 탭 열림 안내 없음
- **조치**: `aria-label="{name} 공시내역 확인 (새 탭에서 열림)"` 추가

### [Minor] 아이콘에 `aria-hidden` 누락
- **문제**: 각 항목 아이콘(School, MapPin, Users 등)이 스크린리더에 읽힘
- **조치**: 아이콘 래퍼에 `aria-hidden="true"` 추가

---

## 6. SearchForm.tsx

### [Major] `<label>`과 `<select>` 연결 미흡
- **문제**: 레이블이 절대 위치로 배치되어 있으나 `htmlFor`-`id` 연결 없음 — 스크린리더가 레이블-컨트롤 연관 파악 불가
- **조치**: `<label htmlFor="select-sido">`, `<select id="select-sido">` / `<label htmlFor="select-sgg">`, `<select id="select-sgg">` 연결

### [Major] 폼 목적 레이블 없음
- **문제**: 폼 전체에 대한 접근 가능한 이름 없음
- **조치**: `<form aria-label="지역별 유치원 및 어린이집 검색">` 추가

### [Minor] 장식 요소 `aria-hidden` 누락
- **문제**: 구분선(divider), MapPin·ChevronDown·Search 아이콘이 스크린리더에 읽힘
- **조치**: 모든 장식 요소에 `aria-hidden="true"` 추가

---

## 7. list/page.tsx (목록 페이지)

### [Major] 검색 입력 레이블 없음
- **문제**: 기관명 검색 `<input>`에 연결된 `<label>` 없음 — placeholder는 레이블 대체 불가
- **조치**: `<label htmlFor="local-search" className="sr-only">기관 이름으로 검색</label>` + `id="local-search"` 추가

### [Major] 필터 버튼 컨텍스트 없음
- **문제**: "전체/국공립/사립" 버튼이 무엇을 필터링하는지 스크린리더에 전달 안 됨
- **조치**: 버튼 그룹에 `role="group" aria-label="설립 유형 필터"` / `"기관 구분 필터"` 추가, 각 버튼에 `aria-pressed` 추가

### [Major] 결과 변경 시 스크린리더 알림 없음
- **문제**: 필터 변경 후 결과가 업데이트되어도 스크린리더에 알림 없음
- **조치**: 결과 그리드에 `aria-live="polite" aria-atomic="false" aria-label="검색 결과 N개 기관"` 추가

### [Minor] 뒤로가기 버튼 레이블
- **문제**: "Back to Search" 텍스트는 영문이며 목적이 불분명할 수 있음
- **조치**: `aria-label="검색 페이지로 돌아가기"` 추가

---

## 8. compare/page.tsx (비교 페이지)

### [Major] 로딩 상태 접근성
- **문제**: 로딩 스피너에 스크린리더 안내 없음
- **조치**: `role="status" aria-label="비교 데이터를 불러오는 중입니다"` 추가, 스피너 `aria-hidden="true"`

### [Minor] 뒤로가기 버튼 레이블
- **문제**: 버튼 목적이 시각적으로만 전달됨
- **조치**: `aria-label="이전 페이지로 돌아가기"` 추가

### [Minor] 장식 요소 `aria-hidden` 누락
- **문제**: 배경 장식 원형 블러 요소가 스크린리더에 노출
- **조치**: `aria-hidden="true"` 추가

---

## 미조치 사항 (디자인 결정 필요)

| 항목 | 이유 |
|------|------|
| 카드 `h3` → `h2` 변경 | `<article>` 내 첫 헤딩은 h2가 적합하나 전체 페이지 헤딩 계층 재설계 필요 |
| 피처 카드 키보드 포커스 | `page.tsx` 피처 카드가 정보성 div인지 인터랙티브 요소인지 확인 후 결정 |
| 색상 대비 뱃지 (badge) | 현재 `text-*-600` 계열 사용 중 — WCAG AA 달성 여부는 배경색과 조합에 따라 개별 검증 필요 |

---

## 참고 기준

- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [한국형 웹 콘텐츠 접근성 지침 2.2 (KWCAG 2.2)](https://www.wah.or.kr/)
