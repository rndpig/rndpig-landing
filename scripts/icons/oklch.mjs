/*
 * OKLCH -> sRGB hex.
 *
 * Why this exists: sharp rasterises SVG through librsvg, which implements
 * SVG 1.1 colour and does not know `oklch()`. It does not error on one either —
 * it silently treats the whole paint as unset, so every stroke and gradient
 * stop renders black. The first build of this icon set shipped seven identical
 * black squares that way, and the bug was invisible in review because the
 * contact sheet is rendered by Chrome, which does support oklch.
 *
 * So: author in OKLCH, because that is what the apps' own stylesheets use and
 * lightness there is perceptually even, then convert here before the SVG is
 * ever handed to a rasteriser.
 *
 * Björn Ottosson's conversion, https://bottosson.github.io/posts/oklab/
 */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Linear-light channel -> gamma-encoded sRGB. */
function encode(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(clamp01(v) * 255)
}

/**
 * `oklch(0.7 0.16 150)` -> `#4ac07a`. Any other syntax is passed through
 * untouched, so plain hex in the config keeps working.
 */
export function toHex(color) {
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(String(color).trim())
  if (!m) return color

  const L = parseFloat(m[1])
  const C = parseFloat(m[2])
  const hDeg = parseFloat(m[3])

  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  // OKLab -> approximate cone response, cubed back to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const mm = m_ * m_ * m_
  const s = s_ * s_ * s_

  // LMS -> linear sRGB
  const r = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s

  const hex = (n) => n.toString(16).padStart(2, '0')
  return `#${hex(encode(r))}${hex(encode(g))}${hex(encode(bl))}`
}
