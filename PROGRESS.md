# Death Snail - 개발 진행 상황

## 현재 브랜치
`claude/murder-snail-meme-kgcNC`

---

## 완료된 작업

### Phase 0 ✅ (완료)
- [x] pnpm 모노레포 구성
- [x] `packages/shared` - 공유 타입 + Great Circle 이동 수학
- [x] `apps/api` - Fastify 백엔드 뼈대 (라우트, 미들웨어, lib)
- [x] `apps/mobile` - Expo RN 앱 뼈대 (4개 탭 화면, 훅, 스토어)
- [x] PostgreSQL + PostGIS Prisma 스키마
- [x] BullMQ 달팽이 이동 크론잡 (매일 자정 UTC)
- [x] Pre-generated 달팽이 대사 시스템 (국가별 + 상황별)
- [x] 실시간 위치 보간 로직
- [x] 버프 시스템 라우트 (`POST /buffs`)
- [x] 업적 체크 워커

---

## Phase 1 - 핵심 게임루프 (다음 작업)

> **목표**: "달팽이가 매일 나를 향해 움직인다"

- [ ] `pnpm install` 실행 확인 및 의존성 설치 안내
- [ ] Expo Location 권한 흐름 완성 (GPS 권한 → 위치 공유)
- [ ] `POST /players/location` 연동 테스트
- [ ] BullMQ 수동 트리거 `/admin/trigger-movement` 테스트
- [ ] 지도에 달팽이 마커 표시 + 이동 궤적 폴리라인
- [ ] 게임오버 판정 UI (달팽이 도달 시 화면)
- [ ] Expo Push Notification 등록 및 토큰 저장
- [ ] 기본 푸시 알림 (daily_moved 메시지)
- [ ] 달팽이 여행 일지 탭 완성 (현재 국가/지역/랜드마크)

---

## Phase 2 - 소셜/멀티플레이 (다다음)

> **목표**: "친구의 달팽이를 버프하면 실시간 알림이 간다"

- [ ] `GET /snails/nearby` PostGIS 반경 쿼리 → 지도에 타인 달팽이 표시
- [ ] `GET /players/nearby` 반경 100m 플레이어 조회 UI
- [ ] 버프 버튼 UI + 근접성 검증 전체 플로우
- [ ] Socket.io 서버 Geohash 룸 실제 구현 (`ngeohash` 패키지)
- [ ] Socket.io 클라이언트 구독 (앱 → 서버 `subscribe:region`)
- [ ] 실시간 이벤트: `buff:received`, `snail:nearby`, `snail:left`
- [ ] 버프 알림 Toast/Modal UI

---

## Phase 3 - 업적 + 폴리시 (이후)

- [ ] 업적 15-20개 완성 (현재 6개만 정의)
- [ ] 달팽이 코스메틱 시스템
- [ ] 달팽이 묘지 지도 레이어
- [ ] 공황 모드 UI (10km 이내 시 붉은 색조)
- [ ] 리더보드 화면 완성
- [ ] 나이트메어 모드 (1년 생존 후 옵트인)

---

## Phase 4 - 앱스토어 출시 (마지막)

- [ ] Apple 로그인 구현 (App Store 필수)
- [ ] Expo EAS Build 설정
- [ ] 앱 아이콘 / 스플래시 스크린
- [ ] 앱스토어 / 플레이스토어 제출

---

## 기술 스택 요약

| 레이어 | 선택 |
|---|---|
| 모바일 | Expo SDK 53 + React Native 0.79 (TypeScript) |
| 내비게이션 | Expo Router v5 |
| 상태관리 | Zustand v5 |
| 지도 | react-native-maps (Google Maps) |
| 백엔드 | Fastify v5 + Node.js v22 |
| 실시간 | Socket.io v4 |
| DB | PostgreSQL + PostGIS (Supabase) |
| ORM | Prisma v6 |
| 캐시/잡큐 | Redis + BullMQ (Upstash) |
| 인증 | Fastify JWT |
| 푸시 | Expo Push Notification Service |
| 배포 | Railway (API) + Supabase (DB) + Upstash (Redis) |

---

## 중요 설계 결정 사항

- **달팽이 이동**: 하루 1회 크론잡 (자정 UTC), Great Circle 구면 삼각법
- **실시간 위치 보간**: DB 업데이트는 1회/일, 클라이언트에서 30초마다 경과 시간 × 속도로 계산
- **푸시 메시지**: 실시간 AI 생성 X → Pre-generated DB에서 조합 ($0.6 일회성 vs $3,360/월)
- **위치 추적**: 앱 포그라운드 시 500m 이동마다 업데이트, 배터리 최소화
- **유저 이사**: 달팽이는 자정 크론 시 최신 GPS 타겟으로 자동 방향 전환
- **버프 범위**: 반경 100m 이내 플레이어만 버프 가능 (PostGIS ST_DWithin)

---

## 파일 구조

```
deathSnail/
├── PROGRESS.md          ← 이 파일
├── DEVELOPMENT.md       ← 개발 가이드 (환경설정)
├── apps/
│   ├── mobile/          # Expo React Native
│   │   ├── app/         # Expo Router 화면
│   │   ├── stores/      # Zustand
│   │   ├── hooks/       # useLocation, useSocket
│   │   └── lib/         # api.ts, geo.ts, socket.ts
│   └── api/             # Fastify 백엔드
│       ├── src/
│       │   ├── routes/  # auth, snails, buffs, players, achievements
│       │   ├── jobs/    # snail-movement (크론), achievement-check
│       │   ├── lib/     # prisma, redis, socket, geo
│       │   └── data/    # achievements.ts, snail-dialogues.ts, land-coordinates.json
│       └── prisma/      # schema.prisma
└── packages/
    └── shared/          # 공유 타입 + geo 수학
```
