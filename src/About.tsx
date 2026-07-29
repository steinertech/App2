import { useState } from 'react'

function About() {
  const [downloadUrl, setDownloadUrl] = useState('')

  const handleClick = async () => {
    try {
      const response = await fetch('/api/download', { method: 'PUT' })
      const data = await response.json()
      setDownloadUrl(data.url)
    } catch {
      setDownloadUrl('')
    }
  }

  return (
    <section id="center">
      <h1>About</h1>
      <div>
        <button type="button" className="counter" onClick={handleClick}>
          Click
        </button>{' '}
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            Debug.txt
          </a>
        )}
      </div>
    </section>
  )
}

export default About
