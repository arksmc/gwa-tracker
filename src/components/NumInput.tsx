import { useEffect, useState } from 'react'

type Props = {
  value: number
  onChange: (v: number) => void
  className?: string
}

export default function NumInput({ value, onChange, className }: Props) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    if (parseFloat(text) !== value) setText(String(value))
  }, [value])

  return (
    <input
      value={text}
      inputMode="decimal"
      className={className}
      onChange={(e) => {
        setText(e.target.value)
        const n = parseFloat(e.target.value)
        if (!Number.isNaN(n)) onChange(n)
      }}
      onBlur={() => setText(String(value))}
    />
  )
}