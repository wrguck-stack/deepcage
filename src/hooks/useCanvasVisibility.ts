import { useEffect, useState, type RefObject } from 'react'

export function useCanvasVisibility(ref: RefObject<Element | null>) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .03 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return visible
}
