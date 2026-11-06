import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const FOCUS_SECONDS = 25 * 60

function format(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function App() {
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const deadlineRef = useRef(0)

  useEffect(() => {
    if (!isRunning) return
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((deadlineRef.current - Date.now()) / 1000),
      )
      setSecondsLeft(remaining)
      if (remaining <= 0) setIsRunning(false)
    }
    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [isRunning])

  const start = () => {
    if (secondsLeft <= 0) return
    deadlineRef.current = Date.now() + secondsLeft * 1000
    setIsRunning(true)
  }

  const pause = () => {
    if (!isRunning) return
    setSecondsLeft(
      Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)),
    )
    setIsRunning(false)
  }

  const reset = () => {
    setIsRunning(false)
    setSecondsLeft(FOCUS_SECONDS)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="flex flex-col items-center gap-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          番茄钟
        </p>

        <time
          aria-label="剩余时间"
          className="select-none font-mono text-8xl font-semibold tabular-nums text-[#d64541] md:text-9xl"
        >
          {format(secondsLeft)}
        </time>

        <div className="flex items-center gap-3">
          <Button
            onClick={start}
            disabled={isRunning || secondsLeft <= 0}
            className="min-w-24 bg-[#d64541] text-white hover:bg-[#b93a37]"
          >
            开始
          </Button>
          <Button
            variant="outline"
            onClick={pause}
            disabled={!isRunning}
            className="min-w-24"
          >
            暂停
          </Button>
          <Button
            variant="ghost"
            onClick={reset}
            disabled={!isRunning && secondsLeft === FOCUS_SECONDS}
            className="min-w-24"
          >
            重置
          </Button>
        </div>
      </section>
    </main>
  )
}
