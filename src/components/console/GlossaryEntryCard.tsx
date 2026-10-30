import { useState } from 'react'
import { MapPin, StickyNote, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getValidContext } from '@/lib/utils/glossaryContext'
import { MAX_NOTE_LENGTH } from '@/lib/utils/glossaryStore'
import type { GlossaryEntry } from '@/types/glossary.types'

interface GlossaryEntryCardProps {
  entry: GlossaryEntry
  /** Set when the word was met in the video that is playing now: jumps back to that line */
  onJump?: (seconds: number) => void
  onRemove: (entry: GlossaryEntry) => void
  onSaveNote: (id: string, note: string) => void
}

const ICON_BUTTON =
  'rounded-sm text-text-muted transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console'

/** One saved word in the vocabulary list, with its note and its jump-to-scene and remove buttons */
export function GlossaryEntryCard({ entry, onJump, onRemove, onSaveNote }: GlossaryEntryCardProps) {
  const context = getValidContext(entry)
  const note = typeof entry.note === 'string' ? entry.note : ''
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [draft, setDraft] = useState(note)

  function startEditing() {
    setDraft(note)
    setIsEditingNote(true)
  }

  function saveNote() {
    onSaveNote(entry.id, draft)
    setIsEditingNote(false)
  }

  return (
    <li className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-text-primary" dir="auto" data-testid="entry-word">
          {entry.word}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {context && onJump && (
            <button
              type="button"
              onClick={() => onJump(context.time)}
              aria-label={`الانتقال إلى مشهد "${entry.word}" في الفيديو`}
              className={`${ICON_BUTTON} hover:text-console`}
            >
              <MapPin size={14} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={startEditing}
            aria-label={note ? `تعديل ملاحظة "${entry.word}"` : `إضافة ملاحظة لـ "${entry.word}"`}
            className={`${ICON_BUTTON} hover:text-console`}
          >
            <StickyNote size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(entry)}
            aria-label={`حذف "${entry.word}" من المفردات`}
            className={`${ICON_BUTTON} hover:text-red-500`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      {entry.partOfSpeech && (
        <span className="w-fit rounded-sm bg-console/10 px-1.5 py-0.5 font-mono text-xs leading-5 text-text-secondary">
          {entry.partOfSpeech}
        </span>
      )}
      {(entry.article || (entry.lemma && entry.lemma.toLowerCase() !== entry.word.toLowerCase())) && (
        <p className="text-xs text-text-secondary" dir="ltr" lang={entry.languageCode}>
          <span className="font-medium text-text-primary">
            {[entry.article, entry.lemma ?? entry.word].filter(Boolean).join(' ')}
          </span>
          {entry.plural && ` · Pl. ${entry.plural}`}
        </p>
      )}
      {entry.translation && (
        <p className="font-semibold text-console" dir="auto">
          {entry.translation}
        </p>
      )}
      {entry.definition && (
        <p className="text-text-secondary" dir="auto">
          {entry.definition}
        </p>
      )}
      {context && (
        <p className="text-xs text-text-muted" dir="auto">
          «{context.sentence}»
        </p>
      )}

      {isEditingNote ? (
        <div className="mt-1 flex flex-col gap-2">
          <textarea
            aria-label="ملاحظتك عن الكلمة"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            rows={3}
            dir="auto"
            className="w-full resize-y rounded-md border border-border bg-surface-elevated p-2 text-sm text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveNote}>
              حفظ الملاحظة
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsEditingNote(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        note && (
          <p
            data-testid="entry-note"
            dir="auto"
            className="mt-1 whitespace-pre-line border-s-2 border-console/50 ps-2 text-xs text-text-secondary"
          >
            ملاحظتي: {note}
          </p>
        )
      )}
    </li>
  )
}
