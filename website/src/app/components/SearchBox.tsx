import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'

type Props = {
  initial?: string
  size?: 'lg' | 'md'
  autoFocus?: boolean
  /** Called on every keystroke (the search page searches as you type). */
  onChange?: (q: string) => void
}

export function SearchBox({ initial = '', size = 'md', autoFocus, onChange }: Props) {
  const [q, setQ] = useState(initial)
  const navigate = useNavigate()
  const id = useId()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form className={`searchbox searchbox--${size}`} role="search" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">
        Search a city or neighbourhood
      </label>
      <Icon name="search" size={size === 'lg' ? 24 : 20} />
      <input
        id={id}
        type="search"
        value={q}
        placeholder="Search a city or neighbourhood"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value)
          onChange?.(e.target.value)
        }}
      />
      <button type="submit" className="searchbox__go">
        Search
      </button>
    </form>
  )
}
