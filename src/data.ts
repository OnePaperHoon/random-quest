import kecoRaw from '../data/keco-2025-raw.json'
import { DISPLAY_OVERRIDES, EXTRA_AUDIENCES, SOLO_MIDS } from './occupations'

/** 원천: 한국고용직업분류(KECO) 2025 개정 항목표, 고용노동부. 세분류 495개. */
interface KecoItem {
  code: string
  name: string
  major: string
  mid: string
  minor: string
}

/**
 * 1축 — 무엇을 만들까. (결과물의 **형태**)
 *
 * 선정 기준: **그 형태만으로 대상이 고정되지 않을 것.**
 * 예를 들어 "VS Code 확장"은 대상이 개발자로 못 박혀서 `for [직업]` 축을 죽인다.
 * 형태 축은 직업 축과 자유롭게 곱해질 수 있어야 한다.
 *
 * 제외한 것과 이유:
 *  - **API·백엔드 서비스**: 배관이라 "누구를 위해"와 잘 안 붙는다
 *    (`using` 축에서 인증·결제·캐싱을 뺀 것과 같은 이유)
 *  - **VS Code 확장 / 개발자 도구**: 대상을 개발자로 고정시킨다
 *  - **노션·스프레드시트 템플릿**: 코딩이 아닐 수 있어 "연습" 목적에 안 맞는다
 */
export const TARGET_GROUPS: Group[] = [
  {
    // 원본 동기 3번("연습 삼아 뭘 해볼까")은 원래 이 크기다.
    // 제품 규모만 있으면 시작 자체가 부담스러워 고민이 줄지 않는다.
    name: '작게 — 주말~며칠',
    items: [
      '미니 게임',
      '한 페이지 도구',
      '제너레이터',
      '위젯',
      '기술 데모·실험',
      '자동화 스크립트',
      'CLI 도구',
      '브라우저 확장',
    ],
  },
  {
    name: '크게 — 몇 주 이상',
    items: [
      '웹사이트',
      '모바일 앱',
      '데스크톱 앱',
      '챗봇·메신저 봇',
      '게임',
      '키오스크·태블릿 앱',
    ],
  },
]

export const TARGETS = TARGET_GROUPS.flatMap((g) => g.items)

/**
 * 2축 — 누구를 위해.
 *
 * 원천 495개에서 **"기타 ○○" 57개(11%)를 제외**한다. 분류 체계는 모든 대상을
 * 빠짐없이 담아야 해서 잔여 범주가 반드시 있는데, 통계엔 필수여도 룰렛에서 나오면
 * 김샌다.
 *
 * TODO: 아직 안 한 것 두 가지
 *  - 표시명 다듬기: 공식명이 관공서 문체다("음료 조리원"=바리스타, "늘찬배달원"=배달라이더)
 *  - 누락 보충: 유튜버·타투이스트·바리스타·주부 등 **탐침 전부 0건**이었다
 *    (이 프로젝트 원본 아이디어의 예시 3개 중 2개가 목록에 없다)
 */
export interface Group {
  name: string
  items: string[]
}

/** 대분류로 묶어둔다 — 사용자가 "이 계열은 빼고" 라고 끌 수 있어야 하기 때문. */
/** 자기가 쓸 도구를 직접 고르는 직업들(표시명 기준). `SOLO_MIDS` 참조. */
export const SOLO_AUDIENCES = new Set<string>()

export const AUDIENCE_GROUPS: Group[] = (() => {
  const map = new Map<string, string[]>()
  const push = (major: string, mid: string, name: string) => {
    const list = map.get(major) ?? []
    list.push(name)
    map.set(major, list)
    if (SOLO_MIDS.has(mid)) SOLO_AUDIENCES.add(name)
  }

  for (const item of kecoRaw as KecoItem[]) {
    // 잔여 범주는 통계엔 필수여도 룰렛에서 나오면 김샌다.
    if (item.name.includes('기타')) continue
    // 공식명은 원천에 그대로 두고, 표시할 때만 갈아 끼운다.
    push(item.major, item.mid, DISPLAY_OVERRIDES[item.code] ?? item.name)
  }
  for (const item of EXTRA_AUDIENCES) push(item.major, item.mid, item.name)

  return [...map].map(([name, items]) => ({ name, items }))
})()

export const AUDIENCES = AUDIENCE_GROUPS.flatMap((g) => g.items)

/**
 * 3축 — 무엇으로 만들까. (체크박스로 on/off)
 *
 * 선정 기준: **결과물을 보거나 들을 수 있는가.** 카테고리를 들었을 때
 * "그럼 이걸로 뭘 만들지?"가 바로 나와야 한다.
 * → 인증/OAuth·결제·캐싱·REST API·배포는 의도적으로 제외했다.
 *   모든 프로젝트에 다 들어가는 배관이라 발상을 못 만든다.
 */
export const TOOLKIT_GROUPS: Group[] = [
  {
    name: '그림으로 나오는 것',
    items: [
      '지도·지리',
      '2D 캔버스·제너러티브 그래픽',
      '3D·WebGL',
      '데이터 시각화·차트',
      '다이어그램·노드 에디터',
      '이미지 처리·필터',
      '모션·애니메이션',
      'PDF·인쇄물 생성',
    ],
  },
  {
    name: '소리와 영상',
    items: ['오디오 합성·분석', '음성 인식·합성', '비디오 처리·편집'],
  },
  {
    name: '알아보는 것',
    items: ['OCR·문서 인식', '컴퓨터 비전·자세 추정', 'LLM·생성 AI', '임베딩·시맨틱 검색'],
  },
  {
    name: '입력 장치',
    items: [
      '카메라·QR/바코드',
      '위치·모션 센서',
      '특수 입력(게임패드·MIDI)',
      '드래그앤드롭·제스처',
    ],
  },
  {
    name: '여럿이 같이',
    items: ['실시간 동기화·협업', 'P2P·WebRTC'],
  },
  {
    name: '데이터를 다루는 것',
    items: [
      '웹 스크래핑·자동화',
      '표·스프레드시트',
      '캘린더·일정·반복규칙',
      '로컬 우선·오프라인 동기화',
      '리치 텍스트 에디터',
    ],
  },
]

export const TOOLKITS = TOOLKIT_GROUPS.flatMap((g) => g.items)
