import { useEffect, useRef } from 'react'

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener('resize', resize)
    resize()

    // Star properties
    type Star = {
      x: number
      y: number
      radius: number
      alpha: number
      velocity: number
      flickerSpeed: number
    }
    const stars: Star[] = []
    const numStars = 600
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5,
        alpha: Math.random(),
        velocity: Math.random() * 0.05 + 0.01,
        flickerSpeed: Math.random() * 0.02 + 0.005,
      })
    }

    const shootingStars: {
      x: number
      y: number
      length: number
      speed: number
      angle: number
      alpha: number
    }[] = []

    const draw = () => {
      // Clear with deep cosmic black
      ctx.fillStyle = '#02040a'
      ctx.fillRect(0, 0, width, height)

      // Draw Andromeda-like radial gradient in the center
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.5,
      )
      gradient.addColorStop(0, 'rgba(30, 27, 75, 0.5)') // Deep indigo core
      gradient.addColorStop(0.4, 'rgba(15, 23, 42, 0.3)') // Slate mid
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Draw stars
      stars.forEach((star) => {
        star.alpha += star.flickerSpeed
        if (star.alpha > 1 || star.alpha < 0.1) {
          star.flickerSpeed *= -1
        }

        // Slow parallax movement upwards
        star.y -= star.velocity
        if (star.y < 0) {
          star.y = height
          star.x = Math.random() * width
        }

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`
        ctx.fill()
      })

      // Shooting stars logic
      if (Math.random() < 0.008) {
        // Spawn rate
        shootingStars.push({
          x: Math.random() * width,
          y: 0,
          length: Math.random() * 80 + 20,
          speed: Math.random() * 15 + 5,
          angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1), // Roughly 45 degrees down-right
          alpha: 1,
        })
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i]
        ss.x += Math.cos(ss.angle) * ss.speed
        ss.y += Math.sin(ss.angle) * ss.speed
        ss.alpha -= 0.015

        if (ss.alpha <= 0) {
          shootingStars.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.moveTo(ss.x, ss.y)
        ctx.lineTo(ss.x - Math.cos(ss.angle) * ss.length, ss.y - Math.sin(ss.angle) * ss.length)
        ctx.strokeStyle = `rgba(255, 255, 255, ${ss.alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className='fixed inset-0 w-full h-full z-0 pointer-events-none' />
}
