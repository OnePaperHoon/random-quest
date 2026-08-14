/**
 * "이 재료로 만든 것" — using 축이 멈춘 뒤 보여주는 실존 사례.
 *
 * 프레이밍 주의: 이것은 **추천이 아니라 가능성의 증거**다. 완성품 카탈로그처럼 보이면
 * "이미 있네, 만들 필요 없겠다"가 되어 아이디어 룰렛의 목적이 무너진다.
 * 그래서 설명은 "무엇을 만들었나"만 적고 "얼마나 잘났나"는 적지 않는다.
 *
 * 운영 원칙:
 *  - 전부 웹서치로 실존 확인한 것만 넣는다. 지어내지 않는다.
 *  - 카테고리당 최대 2개: 오래 갈 것 + 인디. 인디는 죽을 수 있다 — 원조 Snapdrop이
 *    수상한 회사에 인수되어 죽고 포크(PairDrop)만 남은 게 실례. 그래서 2개.
 *  - 사례가 없는 카테고리는 그냥 안 보여준다. 빈 칸을 채우려고 억지로 넣지 않는다.
 *  - 키는 data.ts의 TOOLKITS 항목명과 정확히 일치해야 한다.
 */

export interface Hint {
  name: string
  /** "무엇을 만들었나" 한 줄. 존대·과장 없이. */
  desc: string
  url: string
}

export const HINTS: Record<string, Hint[]> = {
  '지도·지리': [
    { name: 'Terraink', desc: '지도를 인쇄용 포스터로', url: 'https://terraink.app/' },
    {
      name: 'City Roads',
      desc: '도시의 모든 도로를 한 장의 라인아트로',
      url: 'https://anvaka.github.io/city-roads/',
    },
  ],
  '2D 캔버스·제너러티브 그래픽': [
    {
      name: 'Patatap',
      desc: '키를 누르면 소리와 도형이 터진다',
      url: 'https://patatap.com/',
    },
  ],
  '오디오 합성·분석': [
    {
      name: 'Typatone',
      desc: '타이핑이 곧 작곡이 된다',
      url: 'https://experiments.withgoogle.com/typatone',
    },
    { name: 'Patatap', desc: '키보드 26키 = 소리 26개', url: 'https://patatap.com/' },
  ],
  '임베딩·시맨틱 검색': [
    {
      name: 'Semantle',
      desc: '정답 단어와의 의미 거리만 알려주는 추리 게임',
      url: 'https://semantle.com/',
    },
  ],
  'LLM·생성 AI': [
    {
      name: 'Infinite Craft',
      desc: '두 단어를 합치면 LLM이 결과를 정한다',
      url: 'https://neal.fun/infinite-craft/',
    },
  ],
  '컴퓨터 비전·자세 추정': [
    {
      name: 'Quick, Draw!',
      desc: '내 낙서를 신경망이 맞힌다',
      url: 'https://quickdraw.withgoogle.com/',
    },
  ],
  '카메라·QR/바코드': [
    { name: 'QRBTF', desc: 'QR 코드를 작품으로 만든다', url: 'https://qrbtf.com/' },
  ],
  '실시간 동기화·협업': [
    {
      name: 'Internet Roadtrip',
      desc: '모두가 투표로 차 한 대를 같이 운전한다',
      url: 'https://neal.fun/internet-roadtrip/',
    },
  ],
  '데이터 시각화·차트': [
    {
      name: 'The Deep Sea',
      desc: '스크롤로 심해까지 내려가는 한 페이지',
      url: 'https://neal.fun/deep-sea/',
    },
  ],
  '다이어그램·노드 에디터': [
    {
      name: 'Make Real',
      desc: '그린 UI를 동작하는 코드로 바꾼다',
      url: 'https://makereal.tldraw.com/',
    },
  ],
  'P2P·WebRTC': [
    {
      name: 'PairDrop',
      desc: '브라우저만으로 되는 AirDrop',
      url: 'https://pairdrop.net/',
    },
  ],
  '웹 스크래핑·자동화': [
    {
      name: 'changedetection.io',
      desc: '웹페이지가 바뀌면 알려준다 — 그게 전부',
      url: 'https://changedetection.io/',
    },
  ],
  '이미지 처리·필터': [
    {
      name: 'remove.bg',
      desc: '배경 제거 한 가지로 시작한 서비스',
      url: 'https://www.remove.bg/',
    },
    {
      name: 'Squoosh',
      desc: '브라우저 안에서만 도는 이미지 압축기',
      url: 'https://squoosh.app/',
    },
  ],
  '캘린더·일정·반복규칙': [
    {
      name: 'When2meet',
      desc: '로그인 없는 모임 시간 맞추기 — 20년 생존',
      url: 'https://www.when2meet.com/',
    },
  ],
  '드래그앤드롭·제스처': [
    {
      name: '2048',
      desc: '스와이프 하나가 게임의 전부',
      url: 'https://play2048.co/',
    },
  ],
}
