// Toolbar popup — reflect whether the active tab is a Meet call.
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || ''
  const el = document.getElementById('status')
  if (!el) return
  if (/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(url)) {
    el.textContent = 'On a Meet call. Look for the San4 coach in the bottom-right corner.'
  } else if (url.startsWith('https://meet.google.com/')) {
    el.textContent = 'Google Meet open. Join a call and San4 will appear.'
  } else {
    el.textContent = 'Ready. Join a Google Meet call and San4 will offer to coach you.'
  }
})
