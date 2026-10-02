import { useEffect } from 'react'
import { TabBar } from './ink/Ink'

// The app's navigation is the bottom tab bar from the design: Today, Climb,
// Library, Me, plus the mic as the primary action. Older tool pages still
// render <Navbar />, so this keeps them on the same navigation without each
// page knowing about it. Sign out and settings now live on the Me tab.
export default function Navbar() {
  useEffect(() => {
    document.body.classList.add('has-tabbar')
    return () => document.body.classList.remove('has-tabbar')
  }, [])
  return (
    <>
      <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      <TabBar />
    </>
  )
}
