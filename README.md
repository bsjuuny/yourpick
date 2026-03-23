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
- **basePath**: `/youerpick` (Cafe24 서브디렉토리 배포)
- **데이터 소스**: `public/data/institutions.json`에 정적 데이터가 구축되어 있으며, React Query가 이 정적 에셋을 캐싱해 사용합니다.
- **상태 관리**: URL 쿼리 파라미터와 Zustand 전역 상태 스토어(`useCompareStore`)가 결합되어 비교함 기능을 지원합니다.

## 🚀 개발 및 실행 방법

```bash
# 의존성 설치
npm install

# 로컬 개발 서버
npm run dev
# http://localhost:3000 에 접속

# 정적 빌드
npm run build

# 빌드 + GitHub Pages 배포
npm run build:push
```

## 📦 Cafe24 배포 가이드

1. `npm run build` 실행
2. 빌드 성공 후 `out` 디렉토리 생성 확인
3. FTP 클라이언트(FileZilla 등)로 Cafe24 서버에 접속
4. `www/youerpick/` 폴더에 `out` 내부 파일 전체 업로드
5. 도메인/youerpick 에 접속하여 동작 확인
