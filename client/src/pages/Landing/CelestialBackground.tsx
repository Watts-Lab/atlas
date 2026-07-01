import { useEffect, useRef } from 'react'

export function CartographicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return

    const canvas = canvasRef.current
    if (!canvas) return
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      return
    }
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    let animationFrameId = 0

    type Star = {
      x: number
      y: number
      radius: number
      phase: number
      speed: number
      parallax: number
      alpha: number
      color: string
    }

    type Dust = {
      x: number
      y: number
      radius: number
      alpha: number
    }

    type ShootingStar = {
      x: number
      y: number
      vx: number
      vy: number
      length: number
      life: number
      maxLife: number
    }

    let stars: Star[] = []
    let dust: Dust[] = []
    let shootingStars: ShootingStar[] = []
    let lastTime = 0
    let nextShootingStarAt = 900

    const seedField = () => {
      const starCount = Math.max(170, Math.floor(width / 7))
      const dustCount = Math.max(220, Math.floor(width / 5))

      stars = Array.from({ length: starCount }, (_, i) => {
        const warmAccent = i % 41 === 0
        const coolAccent = i % 3 === 0

        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.7 + 0.45,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.000017 + 0.000011,
          parallax: Math.random() * 18 + 6,
          alpha: Math.random() * 0.42 + 0.2,
          color: warmAccent ? '111, 29, 27' : coolAccent ? '60, 96, 130' : '11, 31, 58',
        }
      })

      dust = Array.from({ length: dustCount }, () => {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.pow(Math.random(), 1.85)
        const spreadX = Math.max(width, height) * 0.48
        const spreadY = Math.max(width, height) * 0.12

        return {
          x: width * 0.54 + Math.cos(angle) * distance * spreadX,
          y: height * 0.34 + Math.sin(angle) * distance * spreadY,
          radius: Math.random() * 1.8 + 0.35,
          alpha: Math.random() * 0.08 + 0.025,
        }
      })

      shootingStars = []
      lastTime = 0
      nextShootingStarAt = 800
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      seedField()
    }

    const spawnShootingStar = () => {
      const leftToRight = Math.random() > 0.25
      const speed = Math.random() * 420 + 680

      shootingStars.push({
        x: leftToRight ? -90 : width + 90,
        y: Math.random() * height * 0.44 + height * 0.04,
        vx: leftToRight ? speed : -speed,
        vy: speed * (Math.random() * 0.12 + 0.08),
        length: Math.random() * 90 + 110,
        life: 0,
        maxLife: Math.random() * 0.28 + 0.68,
      })
    }

    const draw = (time: number) => {
      const elapsed = time / 1000
      const delta = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.04)
      lastTime = time

      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, width, height)

      const wash = ctx.createRadialGradient(
        width * 0.5,
        height * 0.15,
        0,
        width * 0.5,
        height * 0.15,
        Math.max(width, height) * 0.9,
      )
      wash.addColorStop(0, 'rgba(111, 149, 189, 0.16)')
      wash.addColorStop(0.48, 'rgba(248, 250, 252, 0.68)')
      wash.addColorStop(1, 'rgba(248, 250, 252, 0)')
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, width, height)

      const galaxy = ctx.createRadialGradient(
        width * 0.58,
        height * 0.34,
        0,
        width * 0.58,
        height * 0.34,
        Math.max(width, height) * 0.58,
      )
      galaxy.addColorStop(0, 'rgba(11, 31, 58, 0.11)')
      galaxy.addColorStop(0.36, 'rgba(111, 149, 189, 0.1)')
      galaxy.addColorStop(0.72, 'rgba(248, 250, 252, 0.02)')
      galaxy.addColorStop(1, 'rgba(248, 250, 252, 0)')
      ctx.fillStyle = galaxy
      ctx.fillRect(0, 0, width, height)

      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 48) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.strokeStyle = x % 240 === 0 ? 'rgba(51, 65, 85, 0.1)' : 'rgba(51, 65, 85, 0.045)'
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 48) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.strokeStyle = y % 240 === 0 ? 'rgba(51, 65, 85, 0.1)' : 'rgba(51, 65, 85, 0.045)'
        ctx.stroke()
      }

      ctx.strokeStyle = 'rgba(111, 29, 27, 0.16)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(width * 0.12, height * 0.24, Math.min(width, height) * 0.18, 0.35, 1.65)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(11, 31, 58, 0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(width * 0.82, height * 0.72, Math.min(width, height) * 0.32, 3.85, 5.95)
      ctx.stroke()

      ctx.save()
      ctx.translate(width * 0.58, height * 0.34)
      ctx.rotate(-0.16)
      ctx.strokeStyle = 'rgba(60, 96, 130, 0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath()
        ctx.ellipse(
          0,
          0,
          width * (0.18 + i * 0.08),
          height * (0.035 + i * 0.018),
          0,
          0,
          Math.PI * 2,
        )
        ctx.stroke()
      }
      ctx.restore()

      dust.forEach((point) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(60, 96, 130, ${point.alpha})`
        ctx.fill()
      })

      const pivotX = width * 0.5
      const pivotY = height * 1.85

      stars.forEach((star, index) => {
        const twinkle = Math.sin(time * 0.004 + star.phase) * 0.16
        const angle = elapsed * star.speed + star.phase * 0.012
        const dx = star.x - pivotX
        const dy = star.y - pivotY
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const x = pivotX + dx * cos - dy * sin + elapsed * star.parallax
        const y = pivotY + dx * sin + dy * cos

        ctx.beginPath()
        ctx.arc(x, y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${star.color}, ${Math.max(0.08, star.alpha + twinkle)})`
        ctx.fill()

        if (index % 17 === 0) {
          const next = stars[(index + 5) % stars.length]
          const nextAngle = elapsed * next.speed + next.phase * 0.012
          const nextDx = next.x - pivotX
          const nextDy = next.y - pivotY
          const nextCos = Math.cos(nextAngle)
          const nextSin = Math.sin(nextAngle)
          const nextX = pivotX + nextDx * nextCos - nextDy * nextSin + elapsed * next.parallax
          const nextY = pivotY + nextDx * nextSin + nextDy * nextCos
          const distance = Math.hypot(nextX - x, nextY - y)

          if (distance < 220) {
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(nextX, nextY)
            ctx.strokeStyle = 'rgba(11, 31, 58, 0.07)'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      })

      if (time >= nextShootingStarAt && shootingStars.length < 3) {
        spawnShootingStar()
        nextShootingStarAt = time + Math.random() * 1900 + 1600
      }

      shootingStars = shootingStars.filter((star) => {
        star.life += delta
        star.x += star.vx * delta
        star.y += star.vy * delta

        const progress = star.life / star.maxLife
        const alpha = Math.sin(Math.min(progress, 1) * Math.PI) * 0.72

        if (
          star.life >= star.maxLife ||
          star.x > width + star.length ||
          star.x < -star.length ||
          star.y > height + 80
        ) {
          return false
        }

        const direction = Math.sign(star.vx)
        const tailX = star.x - star.length * direction
        const tailY = star.y - star.length * 0.14
        const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY)
        gradient.addColorStop(0, `rgba(11, 31, 58, ${alpha})`)
        gradient.addColorStop(0.3, `rgba(60, 96, 130, ${alpha * 0.54})`)
        gradient.addColorStop(1, 'rgba(60, 96, 130, 0)')

        ctx.beginPath()
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(tailX, tailY)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(star.x, star.y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(11, 31, 58, ${alpha})`
        ctx.fill()

        return true
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    resize()
    animationFrameId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className='fixed inset-0 w-full h-full z-0 pointer-events-none' />
}
