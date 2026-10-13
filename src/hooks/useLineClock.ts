import { useEffect, useRef, useState } from 'react'

const POLL_INTERVAL_MS = 50
const TIME_STEP_SECONDS = 0.05

function readTime(getCurrentTime: () => number): number {
  return Math.round(getCurrentTime() / TIME_STEP_SECONDS) * TIME_STEP_SECONDS
}

/** The player clock for the line being read, in steps fine enough to follow word by word */
export function useLineClock(getCurrentTime: () => number): number {
  const getCurrentTimeRef = useRef(getCurrentTime)
  getCurrentTimeRef.current = getCurrentTime

  const [time, setTime] = useState(() => readTime(getCurrentTime))

  useEffect(() => {
    const update = () => setTime(readTime(getCurrentTimeRef.current))
    update()
    const intervalId = setInterval(update, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [])

  return time
}
