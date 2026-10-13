import { Link } from 'react-router-dom'
import { SearchBox } from '../../app/components/SearchBox'
import { Skeleton } from '../../app/components/bits'
import { usePlaces } from '../../app/queries'

export function Explore() {
  const places = usePlaces()
  const popular = places.data?.slice(0, 6) ?? []

  return (
    <section className="explore" aria-labelledby="explore-title">
      <h2 id="explore-title" className="explore__title">
        Find gems near you
      </h2>
      <SearchBox size="lg" />
      {(places.isPending || popular.length > 0) && (
        <div className="explore__popular">
          <h3>Popular places</h3>
          <ul className="place-chips">
            {places.isPending
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i}>
                    <Skeleton className="sk--chip" />
                  </li>
                ))
              : popular.map((p) => (
                  <li key={p.citySlug}>
                    <Link to={`/${p.citySlug}`} className="place-chip">
                      {p.city}
                      <span>{p.gemCount}</span>
                    </Link>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </section>
  )
}
