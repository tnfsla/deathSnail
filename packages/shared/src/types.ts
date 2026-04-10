// ============================================================
// 공유 타입 정의 (모바일 앱 + API 서버 모두 사용)
// ============================================================

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  isDead: boolean;
  deathCount: number;
  longestSurvivalDays: number;
  currentTitle: string | null;
}

export interface Snail {
  id: string;
  ownerId: string;

  // 생성 정보
  spawnLat: number;
  spawnLng: number;
  spawnedAt: string;

  // 현재 위치 (DB 공식 위치)
  currentLat: number;
  currentLng: number;

  // 오늘 이동 계산용 (보간에 사용)
  dayStartLat: number;
  dayStartLng: number;
  targetLat: number;
  targetLng: number;
  todaySpeedKm: number;

  // 통계
  distanceKm: number;        // 현재 유저까지 거리
  totalDistanceKm: number;   // 누적 이동 거리
  baseSpeedKmDay: number;

  // 코스메틱
  skinId: string;
  name: string;

  // 현재 위치 지역 정보 (역지오코딩 결과)
  currentCountry: string | null;
  currentCountryFlag: string | null;
  currentRegion: string | null;
  landmarkComment: string | null;

  // 여행 기록
  positionHistory: SnailPosition[];
  travelLog: TravelLogEntry[];
}

export interface SnailPosition {
  lat: number;
  lng: number;
  dayNumber: number;
}

export interface TravelLogEntry {
  dayNumber: number;
  description: string;
  countryCode: string | null;
}

export interface NearbySnail {
  snailId: string;
  ownerId: string;
  ownerName: string;
  currentLat: number;
  currentLng: number;
  distanceM: number;
  canBuff: boolean; // 오늘 이미 버프 줬으면 false
}

export interface Buff {
  id: string;
  targetSnailId: string;
  giverUserId: string;
  speedBonusKm: number;
  buffType: 'standard' | 'reverse' | 'freeze';
  createdAt: string;
  expiresAt: string;
  isConsumed: boolean;
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  reward: string | null;
  category: 'survival' | 'social' | 'mischief' | 'exploration';
  isComplete: boolean;
  unlockedAt: string | null;
  progress: number | null; // 0.0 ~ 1.0
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  title: string | null;
  survivalDays: number;
  distanceKm: number;
  rank: number;
}

// ============================================================
// Socket.io 이벤트 타입
// ============================================================

export interface SocketEvents {
  'snail:moved': {
    snailId: string;
    lat: number;
    lng: number;
    distanceTraveledToday: number;
  };
  'snail:nearby': NearbySnail;
  'snail:left': { snailId: string };
  'buff:received': {
    fromUsername: string;
    speedBonus: number;
    buffType: string;
  };
  'buff:given': {
    toSnailId: string;
    toUsername: string;
  };
  'achievement:unlocked': {
    achievementKey: string;
    reward: string | null;
  };
  'game:over': {
    snailId: string;
  };
}

// ============================================================
// API 요청/응답 타입
// ============================================================

export interface RegisterRequest {
  username: string;
}

export interface RegisterResponse {
  token: string;
  user: User;
  snail: Snail;
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
}

export interface GivBuffRequest {
  targetSnailId: string;
}
