import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkToc from 'remark-toc'

// Import markdown css
import 'github-markdown-css/github-markdown.css'

const DocPage = ({ fileName }: { fileName?: string }) => {
  const { docId } = useParams()
  const [content, setContent] = useState('')

  useEffect(() => {
    const fileToLoad = fileName || `${docId}.md`
    fetch(`/docs/${fileToLoad}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('File not found (non-OK response)')
        }
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('text/html')) {
          throw new Error('Did not get a Markdown file (got HTML fallback)')
        }
        return res.text()
      })
      .then((text) => setContent(text))
      .catch(() => setContent('# Error loading the file'))
  }, [fileName, docId])

  return (
    <div className='markdown-body p-4 pt-0'>
      <Markdown remarkPlugins={[remarkGfm, remarkToc]}>{content}</Markdown>
    </div>
  )
}

export default DocPage
