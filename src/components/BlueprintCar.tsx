import { useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function BlueprintCar() {
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const frame = useRef(0)
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || !root.current) return
    const bounds = root.current.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - .5
    const y = (event.clientY - bounds.top) / bounds.height - .5
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => root.current?.style.setProperty('--explode', `${Math.min(1, Math.hypot(x, y) * 2.2)}`))
    root.current.style.setProperty('--tilt-x', `${x * 10}deg`)
    root.current.style.setProperty('--tilt-y', `${y * -8}deg`)
  }
  const reset = () => root.current?.style.setProperty('--explode', '0')
  return <div ref={root} className="blueprint-car" onPointerMove={move} onPointerLeave={reset} aria-label="Interaktive technische Zeichnung eines klassischen amerikanischen Coupés">
    <div className="car-stage">
      <svg viewBox="0 0 1000 520" role="img" aria-hidden="true">
        <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g className="measurements"><path d="M102 442H900M130 456V428M870 456V428M500 92V457"/><text x="420" y="478">5 284 MM / WHEELBASE</text><text x="514" y="115">CENTER AXIS</text></g>
        <g className="part chassis"><path d="M158 373L231 344H785L860 373L812 407H203Z"/><path d="M236 373H766M270 407V430M728 407V430"/></g>
        <g className="part body"><path d="M127 337C165 306 233 289 310 281L380 207C432 174 572 171 638 205L701 280C778 289 836 307 874 338L849 371H151Z"/><path d="M313 281H701M380 207L422 280M638 205L597 280"/></g>
        <g className="part cabin"><path d="M336 279L397 218C440 195 558 195 603 217L663 279Z"/><path d="M420 222V276M580 222V276"/></g>
        <g className="part hood"><path d="M177 333L310 286H473L455 358H153Z"/><path d="M199 329L325 298"/></g>
        <g className="part engine"><rect x="365" y="292" width="111" height="45"/><path d="M380 292V279H402V292M427 292V279H449V292M395 337V350M450 337V350"/></g>
        <g className="part door"><path d="M480 282H647L691 335L461 344Z"/><path d="M510 296H612"/></g>
        <g className="part wheel left"><circle cx="286" cy="374" r="57"/><circle cx="286" cy="374" r="28"/><path d="M286 317V431M229 374H343M246 334L326 414M326 334L246 414"/></g>
        <g className="part wheel right"><circle cx="720" cy="374" r="57"/><circle cx="720" cy="374" r="28"/><path d="M720 317V431M663 374H777M680 334L760 414M760 334L680 414"/></g>
        <g className="part bumper"><path d="M140 353H865L882 365H126Z"/></g>
        <g className="part lights"><circle cx="187" cy="331" r="15"/><circle cx="814" cy="331" r="15"/></g>
      </svg>
      <span className="callout callout-engine">V8 ENGINE <i /></span><span className="callout callout-body">BODYWORK <i /></span><span className="callout callout-chassis">CHASSIS <i /></span><span className="callout callout-suspension">SUSPENSION <i /></span>
    </div>
    <p className="car-instruction">CURSOR STEUERT EXPLODED VIEW <b>·</b> 2.5D TECHNICAL STUDY</p>
  </div>
}
