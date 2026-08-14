import { animate, utils } from 'animejs'
import { createReel, type Reel } from './reel'
import {
  TARGETS,
  TARGET_GROUPS,
  AUDIENCE_GROUPS,
  TOOLKIT_GROUPS,
  TOOLKITS,
  SOLO_AUDIENCES,
} from './data'
import { initAudio, setMuted, isMuted, done } from './sound'
import { HINTS } from './hints'
import './style.css'

interface Axis {
  key: string
  /** 라벨은 영어 뼈대(Build a / for / using), 값은 한국어.
   *  한국어로 직역하면 조사가 값에 따라 바뀌는 문제("~를"/"~을")가 생긴다. */
  label: string
  /** 후보는 매번 계산한다 — 필터가 바뀌면 바로 반영돼야 한다. */
  pool: () => string[]
  /** 체크박스로 켜고 끌 수 있는 축인가 */
  optional?: boolean
}

const PLACEHOLDER = '?'

/** 첫 릴이 멈추기까지(ms) */
const SPIN_BASE = 2400
/** 릴 하나당 늘어나는 시간 — 이 간격만큼 순차로 멈춘다 */
const SPIN_STEP = 900

// ── 필터 상태 ────────────────────────────────────────────────
// "순수 랜덤"이 아니라 **내가 할 의향이 있는 것 중에서 랜덤**으로 좁히는 장치.
// 조합 룰이나 추천 로직을 짜지 않고도 황당한 결과를 사용자가 직접 걷어낼 수 있다.
const offTargets = new Set<string>()
const offGroups = new Set<string>()
const offToolkits = new Set<string>()

/**
 * "혼자 일하는 사람만" — 자기가 쓸 도구를 **직접 고르는** 직업으로 좁힌다.
 * 1인 개발자가 만든 것이 닿으려면 그 사람에게 선택권이 있어야 한다.
 */
let soloOnly = false

const targetPool = () => TARGETS.filter((t) => !offTargets.has(t))
const audiencePool = () =>
  AUDIENCE_GROUPS.filter((g) => !offGroups.has(g.name))
    .flatMap((g) => g.items)
    .filter((name) => !soloOnly || SOLO_AUDIENCES.has(name))
const toolkitPool = () => TOOLKITS.filter((t) => !offToolkits.has(t))

const AXES: Axis[] = [
  { key: 'build', label: 'Build a', pool: targetPool },
  { key: 'for', label: 'for', pool: audiencePool },
  { key: 'using', label: 'using', pool: toolkitPool, optional: true },
]

const app = document.querySelector<HTMLDivElement>('#app')!
const reels = new Map<string, Reel>()
const rows = new Map<string, HTMLElement>()

const checkbox = (name: string, count: number, group: string) => `
  <label class="chip">
    <input type="checkbox" checked data-filter="${group}" value="${name}" />
    <span>${name}</span><em>${count}</em>
  </label>`

app.innerHTML = `
  <main class="stage">
    ${AXES.map(
      (a) => `
      <section class="row" data-axis="${a.key}">
        <div class="row-inner">
          <span class="row-label">${a.label}<button type="button" class="reroll" data-reroll="${a.key}" title="이 줄만 다시">↻</button></span>
          <div class="row-reel"></div>
          <div class="row-bar"><span class="row-bar-fill"></span></div>
          <div class="row-hint" hidden></div>
        </div>
      </section>`
    ).join('')}

    <div class="controls">
      <label class="toggle">
        <input type="checkbox" id="use-toolkit" />
        <span>using — 기술 카테고리 추가</span>
      </label>
      <button id="filters-btn" class="ghost-btn" type="button">필터</button>
      <button id="mute" class="icon-btn" type="button" aria-pressed="false" title="소리 끄기">🔊</button>
      <button id="spin" class="spin-btn">돌리기 <kbd>Space</kbd></button>
    </div>

    <div class="filters" id="filters" hidden>
      <div class="filter-group">
        <h3>Build a <span class="hint">만들 형태 · 묶음 이름을 누르면 통째로</span></h3>
        ${TARGET_GROUPS.map(
          (g) => `
          <div class="subgroup">
            <button type="button" class="subgroup-title" data-group-of="target" data-group-name="${g.name}">${g.name}</button>
            <div class="chips">
              ${g.items.map((t) => checkbox(t, 1, 'target')).join('')}
            </div>
          </div>`
        ).join('')}
      </div>
      <div class="filter-group">
        <h3>for <span class="hint">직업 계열 · 옆 숫자는 직업 수</span></h3>
        <label class="solo-toggle">
          <input type="checkbox" id="solo-only" />
          <span><b>혼자 일하는 사람만</b> — 자기 도구를 직접 고르는 직업으로 좁힌다
          (자영업·프리랜서·1인 사업자). 공장 라인이나 조직 안에서 지급된 시스템을
          쓰는 직업은 개인이 만든 것이 닿을 경로가 없다.</span>
        </label>
        <div class="chips">
          ${AUDIENCE_GROUPS.map((g) => checkbox(g.name, g.items.length, 'group')).join('')}
        </div>
      </div>
      <div class="filter-group">
        <h3>using <span class="hint">기술 카테고리 · 묶음 이름을 누르면 통째로 켜고 끔</span></h3>
        ${TOOLKIT_GROUPS.map(
          (g) => `
          <div class="subgroup">
            <button type="button" class="subgroup-title" data-group-of="toolkit" data-group-name="${g.name}">${g.name}</button>
            <div class="chips">
              ${g.items.map((t) => checkbox(t, 1, 'toolkit')).join('')}
            </div>
          </div>`
        ).join('')}
      </div>
      <p class="filter-note" id="filter-note"></p>
    </div>
  </main>
`

for (const axis of AXES) {
  const row = app.querySelector<HTMLElement>(`[data-axis="${axis.key}"]`)!
  rows.set(axis.key, row)
  const reel = createReel(row.querySelector<HTMLElement>('.row-reel')!, axis.pool)
  reel.set(PLACEHOLDER)
  reels.set(axis.key, reel)
}

const bar = (key: string) => rows.get(key)!.querySelector<HTMLElement>('.row-bar')!
const barFill = (key: string) =>
  rows.get(key)!.querySelector<HTMLElement>('.row-bar-fill')!
const hintEl = (key: string) => rows.get(key)!.querySelector<HTMLElement>('.row-hint')!

/**
 * using 릴이 멈춘 뒤 그 카테고리의 실존 사례를 한 줄 보여준다.
 * "추천"이 아니라 **가능성의 증거** — 힌트가 필요한 순간은 뽑힌 직후뿐이라
 * 필터 패널이 아니라 여기에만 둔다. 사례가 없는 카테고리는 그냥 안 보여준다.
 */
function showHint(key: string, winner: string) {
  if (key !== 'using') return
  const el = hintEl(key)
  const hints = HINTS[winner]
  if (!hints?.length) {
    el.hidden = true
    return
  }
  el.innerHTML =
    '이 재료로 만든 것 → ' +
    hints
      .map(
        (h) =>
          `<a href="${h.url}" target="_blank" rel="noopener noreferrer">${h.name}</a> <span>· ${h.desc}</span>`
      )
      .join(' &nbsp;/&nbsp; ')
  el.hidden = false
}

function clearHints() {
  for (const axis of AXES) hintEl(axis.key).hidden = true
}

const toggle = app.querySelector<HTMLInputElement>('#use-toolkit')!
const spinBtn = app.querySelector<HTMLButtonElement>('#spin')!
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!
const filtersBtn = app.querySelector<HTMLButtonElement>('#filters-btn')!
const filters = app.querySelector<HTMLElement>('#filters')!
const filterNote = app.querySelector<HTMLElement>('#filter-note')!

/** 3번째 축은 켰을 때만 줄이 생긴다. 껐다 켜면 아래가 밀리므로 높이를 애니메이션한다. */
function syncOptionalRows() {
  for (const axis of AXES) {
    if (!axis.optional) continue
    rows.get(axis.key)!.classList.toggle('is-off', !toggle.checked)
  }
}
toggle.addEventListener('change', syncOptionalRows)
syncOptionalRows()

/** 한 축이라도 후보가 0개면 굴릴 수 없다. 버튼을 잠그고 이유를 알려준다. */
function syncFilterState() {
  const empty = AXES.filter((a) => (!a.optional || toggle.checked) && a.pool().length === 0)
  const blocked = empty.length > 0
  spinBtn.disabled = blocked
  const kits = toggle.checked ? toolkitPool().length : 1
  filterNote.textContent = blocked
    ? `${empty.map((a) => a.label).join(', ')} 에 남은 후보가 없어. 하나 이상 켜줘.`
    : `후보 ${targetPool().length} × ${audiencePool().length}${
        toggle.checked ? ` × ${toolkitPool().length}` : ''
      } = ${(targetPool().length * audiencePool().length * kits).toLocaleString()} 조합`
}

const offSet = (kind: string) =>
  kind === 'target' ? offTargets : kind === 'group' ? offGroups : offToolkits

filters.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  const kind = input.dataset.filter
  if (!kind) return
  const set = offSet(kind)
  if (input.checked) set.delete(input.value)
  else set.add(input.value)
  syncFilterState()
})

/** 묶음 이름을 누르면 그 묶음을 통째로 켜고 끈다 — 하나씩 누르긴 번거롭다.
 *  "하나라도 켜져 있으면 전부 끄고, 다 꺼져 있으면 전부 켠다". */
filters.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-group-of]')
  if (!btn) return
  const kind = btn.dataset.groupOf!
  const source = kind === 'target' ? TARGET_GROUPS : TOOLKIT_GROUPS
  const group = source.find((g) => g.name === btn.dataset.groupName)
  if (!group) return

  const set = offSet(kind)
  const anyOn = group.items.some((t) => !set.has(t))
  for (const item of group.items) {
    if (anyOn) set.add(item)
    else set.delete(item)
  }
  for (const input of filters.querySelectorAll<HTMLInputElement>(
    `input[data-filter="${kind}"]`
  )) {
    if (group.items.includes(input.value)) input.checked = !anyOn
  }
  syncFilterState()
})

const soloInput = app.querySelector<HTMLInputElement>('#solo-only')!
soloInput.addEventListener('change', () => {
  soloOnly = soloInput.checked
  syncFilterState()
})

filtersBtn.addEventListener('click', () => {
  filters.hidden = !filters.hidden
  filtersBtn.classList.toggle('is-on', !filters.hidden)
})

toggle.addEventListener('change', syncFilterState)
syncFilterState()

function syncMuteBtn() {
  muteBtn.textContent = isMuted() ? '🔇' : '🔊'
  muteBtn.setAttribute('aria-pressed', String(isMuted()))
  muteBtn.title = isMuted() ? '소리 켜기' : '소리 끄기'
}
// 음소거는 localStorage에 남는다. 새로고침할 때마다 다시 켜지면 공개 사이트에선 짜증난다.
syncMuteBtn()

muteBtn.addEventListener('click', () => {
  setMuted(!isMuted())
  syncMuteBtn()
})

let spinning = false
/** 휠 스핀 쿨다운 만료 시각 — 트랙패드 관성 이벤트가 다음 스핀을 연쇄시키는 걸 막는다 */
let wheelReadyAt = 0

async function spin() {
  if (spinning || spinBtn.disabled) return
  // 브라우저는 사용자 제스처 전에 오디오를 못 열게 막는다. 여기가 그 시점이다.
  initAudio()
  spinning = true
  spinBtn.disabled = true
  toggle.disabled = true // 도는 중에 축이 늘거나 줄면 정지 위치 계산이 깨진다
  filters.querySelectorAll('input').forEach((i) => (i.disabled = true))

  const active = AXES.filter((a) => !a.optional || toggle.checked)

  clearHints()
  for (const axis of active) {
    barFill(axis.key).style.width = '0px'
    bar(axis.key).style.width = '0px'
  }

  // 결과를 먼저 전부 뽑는다. 애니메이션은 이 결과로 가는 연출일 뿐이다.
  const results = active.map((a) => {
    const pool = a.pool()
    return { axis: a, winner: pool[utils.random(0, pool.length - 1)] }
  })

  // 모든 릴이 **동시에 출발**하고, 지속시간을 릴마다 늘려 **순서대로 멈추게** 한다.
  // (앞 릴이 완전히 끝난 뒤 다음 릴을 굴리면 축이 3개일 때 너무 길고,
  //  실제 슬롯머신의 느낌도 아니다.)
  await Promise.all(
    results.map(async ({ axis, winner }, i) => {
      const reel = reels.get(axis.key)!
      await reel.spin(winner, SPIN_BASE + i * SPIN_STEP)

      // 바는 글자 길이에 맞춘다. 값마다 폭이 다르므로 멈춘 뒤 재서 세팅한다.
      const width = reel.textWidth()
      bar(axis.key).style.width = `${width}px`
      await animate(barFill(axis.key), {
        width: [0, width],
        duration: 520,
        ease: 'outExpo',
      })
      showHint(axis.key, winner)
    })
  )

  done()
  spinning = false
  wheelReadyAt = performance.now() + 900
  toggle.disabled = false
  filters.querySelectorAll('input').forEach((i) => (i.disabled = false))
  syncFilterState()
}

/** 한 줄만 다시 굴린다. 필터로도 못 거른 "이건 아닌데" 를 값싸게 메운다. */
async function reroll(key: string) {
  if (spinning) return
  const axis = AXES.find((a) => a.key === key)
  if (!axis) return
  const pool = axis.pool()
  if (pool.length === 0) return

  initAudio()
  spinning = true
  spinBtn.disabled = true

  barFill(key).style.width = '0px'
  bar(key).style.width = '0px'
  hintEl(key).hidden = true

  const reel = reels.get(key)!
  const winner = pool[utils.random(0, pool.length - 1)]
  await reel.spin(winner, SPIN_BASE)
  const width = reel.textWidth()
  bar(key).style.width = `${width}px`
  await animate(barFill(key), { width: [0, width], duration: 520, ease: 'outExpo' })
  showHint(key, winner)

  spinning = false
  wheelReadyAt = performance.now() + 900
  syncFilterState()
}

app.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-reroll]')
  if (btn) void reroll(btn.dataset.reroll!)
})

spinBtn.addEventListener('click', spin)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
    spin()
  }
})

// ── 휠로 돌리기 (원본 UX 요구) ──────────────────────────────
// **릴 위에서 굴렸을 때만** 스핀한다 — 페이지 전체에 걸면 필터 패널을
// 스크롤하려는 휠까지 뺏는다.
//
// 쿨다운이 필수인 이유: 트랙패드는 손을 뗀 뒤에도 관성으로 wheel 이벤트를
// 계속 쏜다. 스핀이 끝나자마자 그 잔여 이벤트가 다음 스핀을 시작해버리면
// "한 번 굴렸는데 계속 돈다"가 된다.
for (const row of rows.values()) {
  row.querySelector<HTMLElement>('.row-reel')!.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) < 8) return // 미세 스크롤은 무시
      e.preventDefault()
      if (spinning || performance.now() < wheelReadyAt) return
      void spin()
    },
    { passive: false }
  )
}
