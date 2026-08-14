import { animate, createSpring, utils } from 'animejs'
import { tick, land } from './sound'

/**
 * 슬롯 릴 하나.
 *
 * 핵심 원칙: **결과를 먼저 뽑고, 애니메이션은 그 위치로 가는 연출일 뿐이다.**
 * 돌린 뒤 멈춘 자리를 결과로 삼으면 정지 위치 계산과 확률 통제가 동시에 무너진다.
 */

/**
 * 결과 뒤에 붙이는 여유 항목.
 * 스프링이 목표를 살짝 지나쳤다 돌아오는데, 뒤가 비어 있으면 그 순간 빈칸이 보인다.
 */
const TAIL = 3

/** 기본 체감 지속시간(ms) */
const DEFAULT_DURATION = 2200

/**
 * 더미 개수를 지속시간에 비례시킨다.
 * 고정하면 오래 도는 릴일수록 느려 보인다 — 거리는 같은데 시간만 늘어나니까.
 */
const fillerFor = (duration: number) => Math.max(12, Math.round(duration / 40))

/** 글자가 창을 넘칠 때 줄일 수 있는 최소 폰트 크기(px). 이 아래로는 안 줄인다. */
const MIN_FONT = 22

/**
 * 긴 이름을 말줄임(...) 대신 **폰트를 줄여서** 담는다.
 * 직업명은 "석유 및 천연가스 제조 관련 제어 장치 조작원"(25자)처럼 긴 게 많은데,
 * 잘라버리면 무슨 직업인지 알 수가 없어 룰렛의 목적 자체가 무너진다.
 */
function autofit(text: HTMLElement, maxW: number) {
  text.style.fontSize = ''
  const full = text.scrollWidth
  if (full <= maxW || maxW === 0) return
  const base = parseFloat(getComputedStyle(text).fontSize)
  text.style.fontSize = `${Math.max(base * (maxW / full), MIN_FONT)}px`
}

export interface Reel {
  /**
   * 미리 정해진 결과로 굴린다. 정지까지의 Promise를 돌려준다.
   * `duration`은 체감 지속시간(ms) — 릴마다 다르게 줘서 순차 정지를 만든다.
   */
  spin(winner: string, duration?: number): Promise<void>
  /** 스핀 없이 값만 세팅(초기 표시용) */
  set(value: string): void
  /**
   * 현재 표시 중인 글자의 실제 렌더 폭(px).
   * 하단 바를 글자 길이에 맞추기 위해 필요하다 — 값마다 길이가 다르므로
   * 고정 폭으로는 맞출 수 없고, 렌더된 뒤 재는 수밖에 없다.
   */
  textWidth(): number
}

/**
 * @param getPool 후보 목록을 **매번 새로 받는다.** 사용자가 필터를 껐다 켜면
 *   더미로 스쳐가는 항목도 같이 바뀌어야 한다 — 생성 시점에 붙잡아두면
 *   꺼둔 카테고리가 스핀 중에 계속 스쳐 지나간다.
 */
export function createReel(mount: HTMLElement, getPool: () => string[]): Reel {
  mount.classList.add('reel')
  const strip = document.createElement('div')
  strip.className = 'reel-strip'
  mount.appendChild(strip)

  /** 지금 창에 보이는 글자 요소. 바 폭은 여기서 잰다. */
  let shown: HTMLElement | null = null

  /** 렌더된 `.reel-text` 요소들을 순서대로 돌려준다. */
  const render = (items: string[]): HTMLElement[] => {
    strip.innerHTML = ''
    const texts: HTMLElement[] = []
    for (const item of items) {
      const el = document.createElement('div')
      el.className = 'reel-item'
      // 글자를 span으로 감싸는 이유: 하단 바를 글자 폭에 맞추려면
      // 줄 전체 폭이 아니라 **글자 자체의 폭**을 재야 한다.
      const text = document.createElement('span')
      text.className = 'reel-text'
      text.textContent = item
      el.appendChild(text)
      strip.appendChild(el)
      texts.push(text)
    }
    const maxW = mount.clientWidth
    for (const t of texts) autofit(t, maxW)
    return texts
  }

  const pick = () => {
    const pool = getPool()
    return pool[utils.random(0, pool.length - 1)]
  }

  /**
   * 항목 높이는 **DOM에서 실측한다.**
   * JS 상수와 CSS 값을 따로 두면 반드시 어긋나고, 어긋나면 릴이 결과가 아닌
   * 엉뚱한 항목에서 멈춘다(실제로 72 vs 80으로 겪었다).
   */
  const itemHeight = () =>
    strip.firstElementChild?.getBoundingClientRect().height ?? 0

  return {
    set(value) {
      shown = render([value])[0]
      strip.style.transform = 'translateY(0px)'
    },

    textWidth() {
      if (!shown) return 0
      // 폰트 축소로 담기지만, 그래도 넘치면 창 폭으로 자른다.
      return Math.min(shown.getBoundingClientRect().width, mount.clientWidth)
    },

    spin(winner, duration = DEFAULT_DURATION) {
      // 1) 결과는 이미 정해져 있다. 스트립을 [더미... , 결과, 여유...] 로 짓는다.
      const count = fillerFor(duration)
      const filler = Array.from({ length: count }, pick)
      const tail = Array.from({ length: TAIL }, pick)
      const texts = render([...filler, winner, ...tail])
      shown = texts[count]

      // 2) 결과가 보이는 위치는 상수다. 거기까지 밀어올리기만 하면 된다.
      //    정지 후 다시 그리지 않는다 — 다시 그리면 "멈출 때 글자"와
      //    "멈춘 뒤 글자"가 달라 보일 여지가 생긴다.
      strip.style.transform = 'translateY(0px)'
      const h = itemHeight()
      const target = -count * h

      // 항목이 창을 지날 때마다 딸깍 소리를 낸다.
      // 간격을 스크립트로 짜지 않는 게 핵심 — 릴이 감속하면 경계를 넘는 빈도가
      // 저절로 줄어 "촤르륵… 착… 착" 이 물리에서 나온다.
      let lastIndex = 0

      return animate(strip, {
        translateY: target,
        // ⚠️ 스프링을 ease로 주면 `duration` 파라미터는 무시된다.
        //    길이는 스프링 자체에 넣어야 한다.
        //    bounce를 낮게 둬서 튕기지 않고 서서히 잦아들게 한다.
        ease: createSpring({ duration, bounce: 0.05 }),
        onUpdate: () => {
          if (h === 0) return
          const m = /translateY\((-?[\d.]+)px\)/.exec(strip.style.transform)
          if (!m) return
          const index = Math.floor(-parseFloat(m[1]) / h)
          if (index !== lastIndex) {
            lastIndex = index
            tick()
          }
        },
      }).then(() => {
        land()
      })
    },
  }
}
