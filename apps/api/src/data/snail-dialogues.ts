/**
 * 달팽이 캐릭터 대사 (Pre-generated)
 * AI로 미리 생성해서 DB화한 대사들
 * 상황 + 국가 정보를 조합해 푸시 메시지 구성
 */

interface DialogueContext {
  situation: 'daily_moved' | 'country_crossed' | 'direction_changed' | 'ocean_crossing' | 'milestone';
  countryCode: string | null;
  countryName: string | null;
  distanceKm: number;
  dayNumber: number;
  speedBonusKm: number;
}

// 상황별 대사 (각 10개 변형, 반복 방지를 위해 dayNumber % length로 선택)
const SITUATION_DIALOGUES: Record<string, string[]> = {
  daily_moved: [
    '오늘도 걸었어요. 당신이 더 가까워졌어요.',
    '하루가 지났어요. 저는 멈추지 않았어요.',
    '또 하루가 지났네요. 당신은 잘 지내나요? 저는 잘 걷고 있어요.',
    '오늘도 이동했어요. 잘 자요.',
    '피곤하지 않아요. 달팽이라서요. 계속 갈게요.',
    '오늘 열심히 걸었어요. 내일도 걸을 거예요.',
    '하루가 또 지나갔네요. 우린 점점 가까워지고 있어요.',
    '오늘도 당신에게 한 발짝 다가갔어요.',
    '쉬고 싶지 않아요. 당신이 기다리고 있으니까요.',
    '오늘의 이동이 끝났어요. 내일 다시 출발할게요.',
  ],
  country_crossed: [
    '새로운 나라에 들어왔어요. 구경은 안 할 거예요.',
    '국경을 넘었어요. 당신이 있는 곳이 더 중요하니까요.',
    '다른 나라에 왔어요. 예쁜 곳이더라고요. 하지만 멈추지 않아요.',
    '국경을 통과했어요. 세관에서 저를 보고 놀란 것 같았어요. 그냥 지나쳤어요.',
    '새 나라, 새로운 시작이에요. 목적지는 같아요 — 당신이에요.',
  ],
  direction_changed: [
    '당신이 사라졌어요. 냄새를 다시 찾았어요. 방향을 바꿀게요.',
    '어디로 가셨어요? 괜찮아요. 당신을 찾았어요. 다시 출발해요.',
    '당신이 멀리 갔군요. 하지만 저는 포기하지 않아요.',
    '방향이 바뀌었어요. 멀어졌지만 괜찮아요. 천천히 가면 돼요.',
    '이쪽으로 가셨군요. 알겠어요. 따라갈게요.',
  ],
  ocean_crossing: [
    '바다를 건너고 있어요. 파도가 차갑네요. 멈추지 않을 거예요.',
    '태평양을 건너는 중이에요. 깊고 넓어요. 그래도 걸을 수 있어요.',
    '바다 위를 걷고 있어요. 물고기들이 이상하게 쳐다봐요.',
    '대서양을 지나고 있어요. 당신까지 아직 멀지만 계속 갈게요.',
    '바닷속이 생각보다 외롭네요. 빨리 당신 곁에 가고 싶어요.',
  ],
  milestone: [
    '당신과 많이 가까워졌어요.',
    '목적지에 가까워지고 있어요.',
    '이제 꽤 왔네요.',
  ],
};

// 국가별 코멘트 (주요 국가만, 나머지는 기본값)
const COUNTRY_COMMENTS: Record<string, string> = {
  KR: '한국에 들어왔어요. 치킨이 유명하다네요. 먹고 싶지만 저는 달팽이라 패스할게요.',
  JP: '일본에 들어왔어요. 후지산이 보여요. 예쁘네요. 그래도 당신이 더 보고 싶어요.',
  CN: '중국을 지나고 있어요. 만리장성 옆을 지났어요. 긴 벽이네요. 저도 긴 여행 중이에요.',
  US: '미국에 들어왔어요. 정말 넓네요. 당신이 여기 있군요.',
  FR: '프랑스에 들어왔어요. 에펠탑이 유명하다네요. 구경은 안 할 거예요. 당신이 더 중요하니까.',
  DE: '독일에 들어왔어요. 맥주가 유명하다네요. 달팽이는 술을 안 마셔요. 계속 갈게요.',
  GB: '영국에 들어왔어요. 비가 오네요. 상관없어요. 저는 달팽이니까요.',
  IT: '이탈리아에 들어왔어요. 피자와 파스타가 유명하대요. 맛있어 보이네요. 그래도 당신이 먼저예요.',
  RU: '러시아를 지나고 있어요. 정말 넓네요. 걷고 또 걷고... 여전히 러시아예요.',
  BR: '브라질에 들어왔어요. 아마존 정글을 지나고 있어요. 울창하네요. 그래도 찾아낼게요.',
  AU: '호주에 들어왔어요. 캥거루가 저를 보고 놀란 것 같아요. 반갑다고 했는데 그냥 뛰어가더라고요.',
  IN: '인도에 들어왔어요. 타지마할이 유명하다네요. 사랑의 건물이래요. 저도 당신을 사랑... 하지는 않지만 쫓아가요.',
  CA: '캐나다에 들어왔어요. 눈이 많이 와요. 달팽이에게 눈길은 힘들지만 멈추지 않을게요.',
};

export function getSnailPushMessage(ctx: DialogueContext): string {
  const { situation, countryCode, countryName, distanceKm, dayNumber, speedBonusKm } = ctx;

  // 기본 상황 대사
  const dialogues = SITUATION_DIALOGUES[situation] ?? SITUATION_DIALOGUES.daily_moved;
  const baseLine = dialogues[dayNumber % dialogues.length];

  // 국가 코멘트 추가 (국경 통과 시)
  let countryLine = '';
  if (situation === 'country_crossed' && countryCode) {
    countryLine = COUNTRY_COMMENTS[countryCode]
      ?? `${countryName ?? '새 나라'}에 들어왔어요. 당신을 향해 계속 갈게요.`;
  }

  // 거리 표시
  const distanceLine =
    distanceKm < 10
      ? `당신까지 ${distanceKm.toFixed(1)}km 남았어요. 거의 다 왔어요.`
      : distanceKm < 100
      ? `당신까지 ${distanceKm.toFixed(0)}km 남았어요.`
      : '';

  // 버프 코멘트
  const buffLine =
    speedBonusKm > 0
      ? `누군가 저를 도와줘서 오늘 더 빨리 왔어요. 고마워요!`
      : '';

  // 조합
  const parts = [countryLine || baseLine, distanceLine, buffLine].filter(Boolean);
  return parts.slice(0, 2).join(' ');
}
