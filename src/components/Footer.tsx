import { Link } from 'react-router'
import { versionLabel } from '../lib/version'

/** On every page: version, maker, and the privacy and terms links. */
export function Footer() {
  return (
    <footer className="footer">
      <span>Theros DM Companion {versionLabel()}</span>
      <span>Created by: Yannick Mul</span>
      <span className="footer-links">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </span>
    </footer>
  )
}
