/**
 * 슬롯 사운드 — **오디오 파일 없이 Web Audio로 합성한다.**
 *
 * 파일을 쓰지 않는 이유:
 *  - 공개 사이트라 효과음 라이선스가 걸린다
 *  - 틱 소리는 수백 번 나는데 파일 재생은 겹칠 때 관리가 번거롭다
 *  - 합성이면 용량 0이고 음높이를 매번 흔들어 기계적인 반복감을 없앨 수 있다
 */

const STORAGE_KEY = 'rq:muted'

let ctx: AudioContext | null = null
/** 모든 소리가 지나가는 지점 — 여기서 전체 음량과 리미터를 건다. */
let master: GainNode | null = null
let muted = localStorage.getItem(STORAGE_KEY) === '1'
let lastTickAt = 0

/** 브라우저는 사용자 제스처 전에는 오디오를 못 열게 막는다. 첫 클릭·키 입력에서 호출할 것. */
export function initAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()

    // 릴 3개가 **동시에** 돌기 때문에 틱이 겹친다. 그대로 두면 피크가 배로 뛰어
    // 클리핑(지직거림)이 난다. 컴프레서를 물려 겹칠 때만 눌러준다.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.knee.value = 6
    limiter.ratio.value = 12
    limiter.attack.value = 0.002
    limiter.release.value = 0.12

    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(limiter).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

export function setMuted(value: boolean) {
  muted = value
  localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
}

export function isMuted() {
  return muted
}

/** 공통 — 오실레이터 하나를 감쇠 엔벨로프로 짧게 울린다. */
function blip(opts: {
  freq: number
  type: OscillatorType
  duration: number
  gain: number
  sweepTo?: number
}) {
  if (!ctx || !master || muted) return
  const t0 = ctx.currentTime
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()

  osc.type = opts.type
  osc.frequency.setValueAtTime(opts.freq, t0)
  if (opts.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + opts.duration)
  }

  // 딸깍 소리를 만드는 건 파형이 아니라 **엔벨로프**다. 순간 최대 → 급감쇠.
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.004)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration)

  osc.connect(amp).connect(master)
  osc.start(t0)
  osc.stop(t0 + opts.duration + 0.02)
  // 끝난 노드는 명시적으로 끊는다. 한 스핀에 100개 넘게 만들어지므로
  // GC에만 맡기지 않는 편이 안전하다.
  osc.onended = () => {
    osc.disconnect()
    amp.disconnect()
  }
}

/**
 * 항목 하나가 창을 지나갈 때마다.
 * **간격을 스크립트로 짜지 않는다** — 릴이 감속하면 호출 간격이 저절로 벌어져
 * "촤르륵… 착… 착… 착" 이 물리에서 나온다.
 */
export function tick() {
  if (!ctx || muted) return
  // 최소 간격은 **릴별이 아니라 전역**이다. 릴 3개가 동시에 도는데 각자 울리면
  // 초당 100회를 넘겨 소음이 된다. 셋이 틱 예산을 나눠 쓰게 두는 편이 낫다.
  const now = ctx.currentTime
  if (now - lastTickAt < 0.032) return
  lastTickAt = now

  blip({
    // 음높이를 매번 살짝 흔들어야 기계가 아니라 물건이 걸리는 소리로 들린다.
    freq: 1150 + Math.random() * 260,
    type: 'triangle',
    duration: 0.035,
    gain: 0.055,
  })
}

/** 릴이 결과에 안착할 때 — 틱보다 낮고 짧게 툭. */
export function land() {
  blip({ freq: 320, type: 'square', duration: 0.09, gain: 0.085, sweepTo: 150 })
}

/** 모든 릴이 멈추고 바까지 다 찼을 때 — 마무리 신호. */
export function done() {
  blip({ freq: 620, type: 'sine', duration: 0.16, gain: 0.07, sweepTo: 930 })
}
