export class Star {
  x!: number
  y!: number
  r!: number
  dx!: number
  dy!: number
  fadingOut: boolean | null = null
  fadingIn = true
  opacity = 0
  opacityTresh!: number
  do!: number
  giant!: boolean
  comet!: boolean

  constructor(
    private width: number,
    private height: number,
    private speedCoeff: number,
    private universe: CanvasRenderingContext2D | null,
    private colors: { giantColor: string; starColor: string; cometColor: string },
    private first: boolean,
  ) {}

  reset() {
    const { getRandInterval, getProbability } = this.constructor as typeof Star
    this.giant = getProbability(5)
    this.comet = this.giant || this.first ? false : getProbability(3)
    this.x = getRandInterval(0, this.width - 10)
    this.y = getRandInterval(0, this.height)
    this.r = getRandInterval(1.1, 2.6)
    this.dx =
      getRandInterval(this.speedCoeff, 6 * this.speedCoeff) +
      (this.comet ? this.speedCoeff * getRandInterval(50, 120) : 0) +
      this.speedCoeff * 2
    this.dy =
      -getRandInterval(this.speedCoeff, 6 * this.speedCoeff) -
      (this.comet ? this.speedCoeff * getRandInterval(50, 120) : 0)
    this.opacityTresh = getRandInterval(0.2, 1 - (this.comet ? 0.4 : 0))
    this.do = getRandInterval(0.0005, 0.002) + (this.comet ? 0.001 : 0)
    this.fadingOut = null
    this.fadingIn = true
  }

  fadeIn() {
    if (this.fadingIn) {
      this.fadingIn = this.opacity > this.opacityTresh ? false : true
      this.opacity += this.do
    }
  }

  fadeOut() {
    if (this.fadingOut) {
      this.fadingOut = this.opacity < 0 ? false : true
      this.opacity -= this.do / 2
      if (this.x > this.width || this.y < 0) {
        this.fadingOut = false
        this.reset()
      }
    }
  }

  draw() {
    if (!this.universe) return

    const { universe } = this
    universe.beginPath()

    if (this.giant) {
      universe.fillStyle = `rgba(${this.colors.giantColor},${this.opacity})`
      universe.arc(this.x, this.y, 3, 0, 2 * Math.PI, false)
    } else if (this.comet) {
      universe.fillStyle = `rgba(${this.colors.cometColor},${this.opacity})`
      universe.arc(this.x, this.y, 2.5, 0, 2 * Math.PI, false)

      for (let i = 0; i < 30; i++) {
        universe.fillStyle = `rgba(${this.colors.cometColor},${this.opacity - (this.opacity / 20) * i})`
        universe.rect(this.x - (this.dx / 4) * i, this.y - (this.dy / 4) * i - 2, 2, 2)
        universe.fill()
      }
    } else {
      universe.fillStyle = `rgba(${this.colors.starColor},${this.opacity})`
      universe.rect(this.x, this.y, this.r, this.r)
    }

    universe.closePath()
    universe.fill()
  }

  move() {
    this.x += this.dx
    this.y += this.dy
    if (this.fadingOut === false) {
      this.reset()
    }
    if (this.x > this.width - this.width / 4 || this.y < 0) {
      this.fadingOut = true
    }
  }

  static getProbability(percents: number): boolean {
    return Math.floor(Math.random() * 1000) + 1 < percents * 10
  }

  static getRandInterval(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }
}

export function createUniverse(
  canva: HTMLCanvasElement,
  starDensity: number,
  speedCoeff: number,
  giantColor: string,
  starColor: string,
  cometColor: string,
  first: boolean,
) {
  const universe: CanvasRenderingContext2D | null = canva.getContext('2d')
  const stars: Star[] = []
  let width = window.innerWidth
  let height = window.innerHeight
  let starCount = width * starDensity

  const windowResizeHandler = () => {
    width = window.innerWidth
    height = window.innerHeight
    starCount = width * starDensity
    canva.setAttribute('width', width.toString())
    canva.setAttribute('height', height.toString())
  }

  function draw() {
    if (!universe) return
    universe.clearRect(0, 0, width, height)
    for (const star of stars) {
      star.move()
      star.fadeIn()
      star.fadeOut()
      star.draw()
    }
    requestAnimationFrame(draw)
  }

  windowResizeHandler()
  window.addEventListener('resize', windowResizeHandler)

  for (let i = 0; i < starCount; i++) {
    const star = new Star(
      width,
      height,
      speedCoeff,
      universe,
      { giantColor, starColor, cometColor },
      first,
    )
    star.reset()
    stars.push(star)
  }

  draw()

  return () => {
    window.removeEventListener('resize', windowResizeHandler)
  }
}
