import { useEffect, useState } from 'react'
import { siteConfig } from '../config/siteConfig'

const links = [['Start', '#start'], ['Leistungen', '#leistungen'], ['Fahrzeuge', '#fahrzeuge'], ['Restaurierung', '#restaurierung'], ['Werkstatt', '#werkstatt'], ['Kontakt', '#kontakt']]
export function Header() {
  const [scrolled, setScrolled] = useState(false); const [open, setOpen] = useState(false)
  useEffect(() => { const scroll = () => setScrolled(window.scrollY > 30); scroll(); window.addEventListener('scroll', scroll, { passive: true }); return () => window.removeEventListener('scroll', scroll) }, [])
  return <header className={`header ${scrolled ? 'header-scrolled' : ''}`}><a className="header-logo" href="#start" aria-label={`${siteConfig.name} Startseite`}><img src="/brand/workshop-logo.png" alt="DEEP CAGE US Car Tuning & Restorations" /></a><button className="menu-button" aria-label="Navigation öffnen" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /></button><nav className={open ? 'nav-open' : ''} aria-label="Hauptnavigation">{links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}<a className="nav-cta" href="#kontakt" onClick={() => setOpen(false)}>Projekt starten <b>↗</b></a></nav></header>
}
