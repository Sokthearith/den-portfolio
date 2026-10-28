import { noteDate, notes } from '../lib/notes'

// The notes, newest first. Until one is published the page says so plainly.
export default function Notes() {
  return (
    <>
      <section className="labhead" aria-labelledby="notes-title">
        <div className="container">
          <h1 id="notes-title" data-reveal="head">Notes after midnight.</h1>
          <p className="lead">History and philosophy, written up once the code is done.</p>
        </div>
      </section>
      <section className="notes">
        <div className="container">
          <div className="horizon" aria-hidden="true" />
          {notes.length === 0 ? (
            <p className="notes__empty">The first notes are still being written.</p>
          ) : (
            <ol className="notes__list">
              {notes.map((n) => (
                <li className="notes__item" key={n.slug} data-reveal>
                  <a className="notes__link" href={`/notes/${n.slug}`}>
                    <span className="notes__title">{n.title}</span>
                    {n.summary && <span className="notes__summary">{n.summary}</span>}
                  </a>
                  <p className="notes__meta">
                    <time dateTime={n.date}>{noteDate(n.date)}</time>
                    <span>{n.minutes} min read</span>
                    {n.tags.map((t) => <span key={t}>{t}</span>)}
                    {n.status === 'draft' && <span className="notes__draft">Draft, only on your machine</span>}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  )
}
