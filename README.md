# 유어픽 - 유치원·어린이집 비교 서비스

Next.js(App Router), TypeScript, Tailwind CSS를 활용해 제작된 유치원·어린이집 비교 서비스입니다. Cafe24 정적 호스팅 환경에 최적화된 **Static Export** 방식을 지원합니다.

## ✨ 주요 기능

1. **내 주변 기관 검색**
   - 동 이름이나 간단한 주소, 반경, 기관 유형(국공립, 사립, 민간, 가정)을 선택하여 조회
2. **검색 결과 리스트 & 필터링**
   - 백엔드 의존 없이 브라우저 클라이언트 사이드에서 즉각적인 필터링 수행
   - 각 기관의 핵심 정보(운영시간, 나이, 정현원, 특징) 라벨 카드 UI 제공
3. **선택 기관 상세 비교 (최대 5개)**
   - 궁금한 기관들을 골라 '비교함'에 담고, 나란히 열(Column) 형태의 표로 데이터를 직관적으로 비교

## 🛠 아키텍처 및 정적 라우팅 구성

- **배포 방식**: Node.js 백엔드가 없는 순수 정적 호스팅 환경 대응을 위해 `next.config.ts`에 `output: 'export'`가 적용되어 있습니다.
- **basePath**: `/yourpick` (Cafe24 서브디렉토리 배포)
- **데이터 소스**: `public/data/institutions.json`에 정적 데이터가 구축되어 있으며, React Query가 이 정적 에셋을 캐싱해 사용합니다.
- **상태 관리**: URL 쿼리 파라미터와 Zustand 전역 상태 스토어(`useCompareStore`)가 결합되어 비교함 기능을 지원합니다.

## 🚀 개발 및 실행 방법

```bash
# 의존성 설치
npm install

# 로컬 개발 서버
npm run dev
# http://localhost:3000 에 접속

# 저장된 데이터로 정적 빌드 (API 재수집 없음)
npm run build:static

# 빌드 + GitHub Pages 배포
npm run build:push
```

## 📦 Cafe24 배포 가이드

1. `npm ci` 후 `npm run build:static` 실행 (저장소의 검증된 데이터를 사용하며 API 재수집은 하지 않음)
2. 빌드 성공 후 `out` 디렉토리 생성 확인
3. FTP 클라이언트(FileZilla 등)로 Cafe24 서버에 접속
4. `www/yourpick/` 폴더에 `out` 내부 파일 전체 업로드
5. 도메인/yourpick 에 접속하여 동작 확인

`next.config.ts`는 라우팅과 데이터 요청에 같은 `/yourpick` 경로를 빌드 시 주입합니다.
별도 `.env.local` 없이도 빌드할 수 있으며, `NEXT_PUBLIC_BASE_PATH`를 수동 설정할 필요는 없습니다.
`build:static`은 생성된 세 페이지의 CSS/JS와 전체 지역 데이터가 배포 폴더에 있는지도 검사합니다.
배포 후 지역 선택 → 검색 → 기관 비교를 확인하세요. 브라우저가 `/data/regions.json`을 요청하면 오래된 빌드가 배포된 상태입니다.

## 전국 데이터 정기 갱신 전 점검

API 키는 저장소에 커밋하지 않고 루트의 `.env.local`에만 둡니다.

```dotenv
NEXT_PUBLIC_CHILDINFO_API_KEY=유치원알리미_API_키
CHILDCARE_API_KEY=어린이집정보공개_API_키
```

기본 수집은 두 API를 모두 필수로 검사합니다. 환경변수 누락이나 인증 실패가 있으면 네트워크 수집과 파일 쓰기를 시작하지 않습니다.

```bash
# 파일 변경 없이 두 API의 설정·인증 상태만 확인
npm run data:preflight

# 사전 검증 후 전국 데이터를 임시 경로에 수집하고, 전 지역 완료 시에만 반영
npm run data:fetch
```

한쪽만 의도적으로 갱신할 때에만 부분 수집 명령을 사용합니다. 선택하지 않은 API 키는 요구하지 않고 해당 데이터 파일도 변경하지 않습니다.

```bash
npm run data:fetch:kindergarten
npm run data:fetch:childcare
```

수집 도중 한 지역이라도 실패하면 임시 결과를 폐기하고 기존 지역 데이터와 `fetch-manifest.json`을 유지합니다. 키 값과 API 원문 응답은 로그나 수집 이력에 기록하지 않습니다.
