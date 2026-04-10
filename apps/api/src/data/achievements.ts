interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  reward: string | null;
  rewardType: 'title' | 'skin' | 'none';
  rewardId: string | null;
  category: 'survival' | 'social' | 'mischief' | 'exploration';
  check: (ctx: { survivalDays: number; deathCount: number }) => boolean;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDef[] = [
  // === 생존 업적 ===
  {
    key: 'survived_7_days',
    name: '첫 주를 버텼다',
    description: '달팽이를 7일 동안 피했습니다.',
    icon: '🌱',
    reward: '신입 도망자',
    rewardType: 'title',
    rewardId: '신입 도망자',
    category: 'survival',
    check: ({ survivalDays }) => survivalDays >= 7,
  },
  {
    key: 'survived_30_days',
    name: '한 달을 버텼다',
    description: '30일 동안 달팽이를 피했습니다.',
    icon: '🌿',
    reward: '한 달의 도망자',
    rewardType: 'title',
    rewardId: '한 달의 도망자',
    category: 'survival',
    check: ({ survivalDays }) => survivalDays >= 30,
  },
  {
    key: 'survived_100_days',
    name: '100일의 공포',
    description: '100일 동안 달팽이와 공존했습니다.',
    icon: '💯',
    reward: '100일의 생존자',
    rewardType: 'title',
    rewardId: '100일의 생존자',
    category: 'survival',
    check: ({ survivalDays }) => survivalDays >= 100,
  },
  {
    key: 'survived_1_year',
    name: '365일 도주',
    description: '1년 동안 달팽이를 피했습니다. 이제 나이트메어 모드를 선택할 수 있습니다.',
    icon: '🎯',
    reward: '1년 생존자',
    rewardType: 'title',
    rewardId: '1년 생존자',
    category: 'survival',
    check: ({ survivalDays }) => survivalDays >= 365,
  },
  {
    key: 'survived_3_years',
    name: '3년의 정신력',
    description: '3년 동안 달팽이를 피했습니다. 달팽이도 당신을 존경할 것 같습니다.',
    icon: '🏅',
    reward: '전설의 도망자',
    rewardType: 'title',
    rewardId: '전설의 도망자',
    category: 'survival',
    check: ({ survivalDays }) => survivalDays >= 1095,
  },
  {
    key: 'survived_10_years',
    name: '10년의 신화',
    description: '10년. 달팽이는 아직도 오고 있습니다.',
    icon: '👑',
    reward: '불멸의 도망자',
    rewardType: 'title',
    rewardId: '불멸의 도망자',
    category: 'survival',
    check: ({ survivalDays }) => survivalDays >= 3650,
  },

  // === 사회 업적 ===
  {
    key: 'first_death',
    name: '첫 만남',
    description: '달팽이에게 처음으로 잡혔습니다.',
    icon: '💀',
    reward: null,
    rewardType: 'none',
    rewardId: null,
    category: 'social',
    check: ({ deathCount }) => deathCount >= 1,
  },

  // === 장난 업적 ===
  {
    key: 'mischief_first_buff',
    name: '나쁜 이웃',
    description: '처음으로 다른 사람의 달팽이에게 버프를 줬습니다.',
    icon: '😈',
    reward: null,
    rewardType: 'none',
    rewardId: null,
    category: 'mischief',
    check: () => false, // 버프 이벤트에서 별도 체크
  },
];
