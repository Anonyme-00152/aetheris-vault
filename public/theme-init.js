// Applied before first paint to avoid a flash of the wrong theme.
try {
  var t = localStorage.getItem('aetheris:theme')
  if (t === 'dark') {
    document.documentElement.dataset.theme = 'dark'
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0e1215')
  }
} catch (e) {}
