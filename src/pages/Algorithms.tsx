import type { ComponentType, CSSProperties } from 'react'
import GraphMap from '../components/algo/GraphMap'
import LinearYard from '../components/algo/LinearYard'
import PathTown from '../components/algo/PathTown'
import SortSkyline from '../components/algo/SortSkyline'
import TreeGrow from '../components/algo/TreeGrow'
import '../styles/algo.css'

type Bench = { id: string; name: string; line: string; viz: ComponentType }

// The classic data structures and algorithms, each drawn in the site's own
// night town, so they can be watched a step at a time.
const benches: Bench[] = [
  { id: 'sorting', name: 'Sorting the skyline', line: 'Six sorts rearrange the town by height. The pair being compared lights up, and a building in its final place switches on every window.', viz: SortSkyline },
  { id: 'lists', name: 'Stacks, queues and lists', line: 'A stack of records, a queue at the cinema and a string of lamps: the three ideas textbooks draw as boxes and arrows.', viz: LinearYard },
  { id: 'trees', name: 'Growing a tree', line: 'A binary search tree and a heap, growing and shrinking one value at a time, with every comparison on the way lit.', viz: TreeGrow },
  { id: 'graphs', name: 'The night map', line: 'Places joined by roads: walk them breadth or depth first, find the shortest routes, or join them all with the least road.', viz: GraphMap },
  { id: 'paths', name: 'Finding the way home', line: 'Draw walls across the streets, then watch four searches look for the lit window, each in its own way.', viz: PathTown },
]

export default function Algorithms() {
  return (
    <>
      <section className="algotop" aria-labelledby="algo-title">
        <div className="container algotop__grid">
          <h1 id="algo-title" data-reveal="head">Algorithms, by lamplight.</h1>
          <p className="algotop__lead" data-reveal style={{ '--d': 200 } as CSSProperties}>Data structures and algorithms, played a step at a time. Pause anywhere, step back, or race two against each other.</p>
          <ul className="algotop__index" data-reveal style={{ '--d': 300 } as CSSProperties}>
            {benches.map((b) => <li key={b.id}><a href={`#${b.id}`}>{b.name}</a></li>)}
          </ul>
        </div>
      </section>
      {benches.map(({ id, name, line, viz: Viz }) => (
        <section className="algo" id={id} aria-labelledby={`${id}-title`} key={id}>
          <div className="container">
            <div className="algo__head">
              <h2 id={`${id}-title`} data-reveal="head">{name}</h2>
              <p className="algo__line" data-reveal style={{ '--d': 120 } as CSSProperties}>{line}</p>
            </div>
            <Viz />
          </div>
        </section>
      ))}
    </>
  )
}
