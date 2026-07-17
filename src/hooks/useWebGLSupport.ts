import { useState } from 'react'

function detectWebGLSupport() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function useWebGLSupport() {
  const [supported] = useState(detectWebGLSupport)
  return supported
}
