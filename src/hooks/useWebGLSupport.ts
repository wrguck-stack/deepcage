import { useEffect, useState } from 'react'

export function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    try { setSupported(Boolean(document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'))) }
    catch { setSupported(false) }
  }, [])
  return supported
}
