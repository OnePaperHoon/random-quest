/**
 * 룰렛 결과를 PNG 카드로 뽑는다 — Instafest·Terraink의 "뽑아 가는 산출물" 패턴.
 * 카톡으로 공유되는 이미지가 이 앱의 실질 확산 경로다.
 *
 * ⚠️ 화면 DOM을 스크린샷 뜨지 않는다(html2canvas류 금지).
 * DOM→이미지 캡처는 CORS·iOS WKWebView 문제가 있고 외부 의존성이 붙는다.
 * 이 카드는 텍스트 + 막대 + 단색 배경뿐이라 캔버스에 직접 그리는 쪽이
 * 의존성 0에 픽셀까지 통제된다.
 */

export interface CardRow {
  label: string
  value: string
}

const W = 1080
const H = 1080 // 정사각 — 카톡·인스타 어디서든 안 잘리는 규격
const PAD = 100
const MAX_W = W - PAD * 2

const COLOR = {
  bg: '#111111',
  label: '#7d7d7d',
  value: '#ffffff',
  bar: '#ff8a0d',
  brand: '#5a5a5a',
}

/** 화면 CSS와 같은 글꼴 스택 — 카드가 화면과 다른 글씨로 나오면 어색하다. */
const font = (weight: number, size: number) =>
  `${weight} ${size}px Pretendard, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`

export function renderCard(rows: CardRow[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'

  const LABEL = 40
  const VALUE = 92
  const BAR = 10
  const GAP_LV = 24 // 라벨 → 값
  const GAP_VB = 30 // 값 → 막대
  const GAP_ROW = 88

  const rowH = LABEL + GAP_LV + VALUE + GAP_VB + BAR
  const totalH = rows.length * rowH + (rows.length - 1) * GAP_ROW
  let y = (H - totalH) / 2

  for (const row of rows) {
    ctx.fillStyle = COLOR.label
    ctx.font = font(700, LABEL)
    ctx.fillText(row.label, PAD, y)
    y += LABEL + GAP_LV

    // 긴 값은 화면과 같은 원칙으로 폰트를 줄여 담는다(자르면 정보가 사라진다).
    let size = VALUE
    ctx.font = font(700, size)
    let textW = ctx.measureText(row.value).width
    if (textW > MAX_W) {
      size = Math.max(40, (size * MAX_W) / textW)
      ctx.font = font(700, size)
      textW = Math.min(ctx.measureText(row.value).width, MAX_W)
    }
    ctx.fillStyle = COLOR.value
    ctx.fillText(row.value, PAD, y + (VALUE - size) / 2)
    y += VALUE + GAP_VB

    // 막대도 화면과 같은 규칙 — 글자 길이만큼만.
    ctx.fillStyle = COLOR.bar
    ctx.fillRect(PAD, y, textW, BAR)
    y += BAR + GAP_ROW
  }

  // 카드가 카톡방에 돌 때 유일한 유입 경로 — 프로젝트명이 아니라 도메인을 박는다.
  ctx.fillStyle = COLOR.brand
  ctx.font = font(600, 30)
  ctx.fillText('rouletteside.com', PAD, H - 88)

  return canvas
}

export function downloadCard(rows: CardRow[]) {
  const canvas = renderCard(rows)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // Windows 금지 문자 제거 — using 값에 '/'가 들어 있다("QR/바코드").
    const name = rows.map((r) => r.value).join(' × ').replace(/[\\/:*?"<>|]/g, '-')
    a.download = `random-quest ${name}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
