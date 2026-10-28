import { noteDate, type Note as NoteData } from '../lib/notes'

// One note, set for reading: a single column of prose at a comfortable measure.
export default function Note({ note }: { note: NoteData }) {
  return (
    <article className="note" aria-labelledby="note-title">
      <div className="container note__inner">
        <a className="note__back" href="/notes">All notes</a>
        {note.status === 'draft' && (
          <p className="note__draft" role="note">Draft. Only you can see this, on your machine. Set “status: published” in its file to put it on the site.</p>
        )}
        <h1 id="note-title" className="note__title">{note.title}</h1>
        <p className="note__meta">
          <time dateTime={note.date}>{noteDate(note.date)}</time>
          <span>{note.minutes} min read</span>
          {note.tags.map((t) => <span key={t}>{t}</span>)}
        </p>
        {note.summary && <p className="lead note__summary">{note.summary}</p>}
        <div className="prose" dangerouslySetInnerHTML={{ __html: note.html }} />
      </div>
    </article>
  )
}
