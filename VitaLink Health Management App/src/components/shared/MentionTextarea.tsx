import { useState, useRef, useEffect } from "react"

export interface Mentionable {
  id: string
  name: string
  role: string
  avatar?: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  placeholder?: string
  rows?: number
  mentionables: Mentionable[]
}

export default function MentionTextarea({
  value,
  onChange,
  ariaLabel,
  placeholder,
  rows = 4,
  mentionables,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState("")
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [focused, setFocused] = useState(false)

  // Filtered list based on what's typed after @
  const filtered = mentionables.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.role.toLowerCase().includes(query.toLowerCase()),
  )

  const isOpen = mentionStart !== null && filtered.length > 0

  // Detect @query while typing
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const cursor = e.target.selectionStart ?? text.length

    // Find if cursor is right after an @word (no space between @ and cursor)
    const before = text.slice(0, cursor)
    const match = before.match(/@(\w*)$/)

    if (match) {
      setMentionStart(cursor - match[0].length)
      setQuery(match[1])
      setActiveIndex(0)
    } else {
      setMentionStart(null)
      setQuery("")
    }

    onChange(text)
  }

  const insertMention = (person: Mentionable) => {
    if (mentionStart === null) return
    const cursor = textareaRef.current?.selectionStart ?? value.length
    const before = value.slice(0, mentionStart)
    const after = value.slice(cursor)
    const inserted = `@${person.name} `
    const newValue = before + inserted + after
    onChange(newValue)
    setMentionStart(null)
    setQuery("")

    // Restore focus and move cursor to after inserted text
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + inserted.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(pos, pos)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      if (filtered[activeIndex]) insertMention(filtered[activeIndex])
    } else if (e.key === "Escape") {
      setMentionStart(null)
      setQuery("")
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionStart(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Parse mentioned names from text for pill display
  const mentionedNames = Array.from(
    new Set(
      Array.from(value.matchAll(/@([\w\s]+?)(?=\s@|\s*$|[^a-zA-Z\s])/g))
        .map((m) => m[1].trim())
        .filter((name) => mentionables.some((p) => p.name === name)),
    ),
  )

  const initials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase()

  return (
    <div className="relative">
      <textarea
        aria-label={ariaLabel}
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none leading-relaxed transition-all"
        style={{
          borderColor: focused ? "var(--primary)" : "var(--border)",
          background: "#FAFAFA",
        }}
      />

      {/* Mention hint */}
      {!value && (
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <span className="text-xs text-gray-300">
            Use @ para mencionar um colega
          </span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 z-50 bg-white rounded-xl border shadow-xl overflow-hidden"
          style={{
            top: "calc(100% + 4px)",
            minWidth: 260,
            maxWidth: 340,
            borderColor: "var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          }}
        >
          <div
            className="px-3 py-2 border-b flex items-center gap-1.5"
            style={{ borderColor: "var(--border)", background: "#FAFAFA" }}
          >
            <span className="text-xs text-gray-400">
              Mencionar profissional
            </span>
            {query && (
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--primary)" }}
              >
                · @{query}
              </span>
            )}
          </div>
          <div className="py-1 max-h-48 overflow-y-auto">
            {filtered.map((person, i) => (
              <button
                key={person.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertMention(person)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                style={
                  i === activeIndex ? { background: "var(--teal-50)" } : {}
                }
                onMouseEnter={() => setActiveIndex(i)}
              >
                {person.avatar ? (
                  <img
                    src={person.avatar}
                    alt={person.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #0E9F8A, #0D9488)",
                    }}
                  >
                    {initials(person.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {person.name}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {person.role}
                  </div>
                </div>
                {i === activeIndex && (
                  <kbd className="ml-auto text-xs text-gray-300 flex-shrink-0">
                    ↵
                  </kbd>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400">
                Nenhum profissional encontrado
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mentioned pills */}
      {mentionedNames.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-xs text-gray-400">Mencionados:</span>
          {mentionedNames.map((name) => {
            const person = mentionables.find((p) => p.name === name)
            return (
              <span
                key={name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "var(--teal-100)",
                  color: "var(--teal-700)",
                }}
              >
                {person?.avatar ? (
                  <img
                    src={person.avatar}
                    alt={name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ fontSize: 8, background: "var(--teal-600)" }}
                  >
                    {initials(name)}
                  </div>
                )}
                @{name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
