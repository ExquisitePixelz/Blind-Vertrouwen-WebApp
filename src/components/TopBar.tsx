import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AccountButton } from './AccountButton'

/**
 * The bar at the top of every screen (ARCHITECTURE.md 1.5): a back arrow and
 * the screen title on the left, the screen's own buttons (`children`) and the
 * account button on the right. The dashboard has neither back nor title.
 */
export function TopBar({ title, back, children }: { title?: string; back?: string; children?: ReactNode }) {
  return (
    <header className="top-bar">
      {back && (
        <Link to={back} className="top-back" aria-label="Back">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
      {title && <h1 className="top-title">{title}</h1>}
      <span className="top-actions">
        {children}
        <AccountButton />
      </span>
    </header>
  )
}
