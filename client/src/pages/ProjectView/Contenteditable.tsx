import { useEffect, useRef } from 'react'

type ContenteditableProps = {
  className?: string
  value: string
  onChange: (value: string) => void
}

const Contenteditable = ({ className, value, onChange }: ContenteditableProps) => {
  const contentEditableRef = useRef(null)

  useEffect(() => {
    if ((contentEditableRef.current as unknown as HTMLElement)?.textContent !== value) {
      ;(contentEditableRef.current as unknown as HTMLElement).textContent = value
    }
  }, [value])

  return (
    <div
      className={className}
      contentEditable='true'
      ref={contentEditableRef}
      onInput={(event) => {
        const target = event.target as HTMLElement
        onChange(target.textContent || '')
      }}
    />
  )
}

export default Contenteditable
