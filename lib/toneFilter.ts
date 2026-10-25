/**
 * The Fabric filter that applies a tone curve.
 *
 * Fabric has brightness, contrast and gamma, but no curve - so this is a real
 * filter class, registered with Fabric's class registry so the parameters
 * survive the document round-trip. It carries the *parameters* (levels and
 * points) rather than the 256-entry table: the table is derived on demand, and
 * a document with a tone curve stays a few hundred bytes of JSON.
 *
 * It implements both backends. WebGL gets a 256×1 lookup texture sampled once
 * per channel, which is what makes dragging a curve feel immediate on a large
 * photo; the 2D path is the fallback for a browser without WebGL.
 */

import {
  classRegistry,
  filters,
  type T2DPipelineState,
  type TWebGLPipelineState,
} from "fabric"

import {
  buildToneLut,
  isNeutralTone,
  NEUTRAL_TONE,
  type TonePoint,
} from "./tonal"

const FRAGMENT_SOURCE = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform sampler2D uLUT;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    vec3 mapped = vec3(
      texture2D(uLUT, vec2(color.r, 0.5)).r,
      texture2D(uLUT, vec2(color.g, 0.5)).g,
      texture2D(uLUT, vec2(color.b, 0.5)).b
    );
    gl_FragColor = vec4(mapped, color.a);
  }
`

interface ToneCurveProps {
  black: number
  white: number
  gamma: number
  curve: TonePoint[]
}

export class ToneCurveFilter extends filters.BaseFilter<
  "ToneCurve",
  ToneCurveProps
> {
  static type = "ToneCurve"
  static uniformLocations = ["uLUT"]
  static defaults: ToneCurveProps & Record<string, unknown> = {
    black: NEUTRAL_TONE.black,
    white: NEUTRAL_TONE.white,
    gamma: NEUTRAL_TONE.gamma,
    curve: NEUTRAL_TONE.curve.map((point) => ({ ...point })),
  }

  declare black: number
  declare white: number
  declare gamma: number
  declare curve: TonePoint[]

  private lutCache?: Uint8ClampedArray
  private lutKey?: string

  private lut(): Uint8ClampedArray {
    const key = `${this.black}:${this.white}:${this.gamma}:${this.curve
      .map((point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`)
      .join(";")}`
    if (!this.lutCache || this.lutKey !== key) {
      this.lutCache = buildToneLut({
        black: this.black,
        white: this.white,
        gamma: this.gamma,
        curve: this.curve,
      })
      this.lutKey = key
    }
    return this.lutCache
  }

  isNeutralState(): boolean {
    return isNeutralTone({
      black: this.black,
      white: this.white,
      gamma: this.gamma,
      curve: this.curve,
    })
  }

  getFragmentSource(): string {
    return FRAGMENT_SOURCE
  }

  /** The lookup table as a 256×1 RGBA texture source. */
  private lutCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas")
    canvas.width = 256
    canvas.height = 1
    const context = canvas.getContext("2d")!
    const image = context.createImageData(256, 1)
    const lut = this.lut()

    for (let i = 0; i < 256; i++) {
      const value = lut[i]
      image.data[i * 4] = value
      image.data[i * 4 + 1] = value
      image.data[i * 4 + 2] = value
      image.data[i * 4 + 3] = 255
    }

    context.putImageData(image, 0, 0)
    return canvas
  }

  applyTo2d({ imageData: { data } }: T2DPipelineState): void {
    const lut = this.lut()
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]]
      data[i + 1] = lut[data[i + 1]]
      data[i + 2] = lut[data[i + 2]]
    }
  }

  applyToWebGL(options: TWebGLPipelineState): void {
    const gl = options.context
    const texture = options.filterBackend.getCachedTexture(
      `ToneCurve:${this.lutKey}`,
      this.lutCanvas(),
      gl.LINEAR
    )

    // A null texture would make the shader sample an unbound unit and render
    // black; falling back to the identity pass is the honest failure.
    if (!texture) {
      super.applyToWebGL(options)
      return
    }

    this.bindAdditionalTexture(gl, texture, gl.TEXTURE1)
    super.applyToWebGL(options)
    this.unbindAdditionalTexture(gl, gl.TEXTURE1)
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: Record<string, WebGLUniformLocation>
  ): void {
    gl.uniform1i(uniformLocations.uLUT, 1)
  }
}

/**
 * Registered at import time.
 *
 * `FabricImage.fromObject` resolves each serialized filter through this
 * registry; without the entry a saved document comes back with the curve
 * silently reduced to a plain object that filters nothing.
 */
classRegistry.setClass(ToneCurveFilter)
