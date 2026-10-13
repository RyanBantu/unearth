export type Category = 'food' | 'cafe' | 'viewpoint' | 'trail' | 'shop' | 'other'

export type GemStatus = {
  findCount: number
  primary: 'Uncut' | 'Polished'
  rare: boolean
  minedOut: boolean
  labels: ('Uncut' | 'Polished' | 'Rare' | 'Mined out')[]
}

/** A gem in a list (city pages, search, lists). */
export type GemCardData = {
  id: string
  slug: string
  name: string
  category: Category
  address: string | null
  city: string | null
  area: string | null
  citySlug: string | null
  areaSlug: string | null
  lat: number
  lng: number
  upvotes: number
  downvotes: number
  score: number
  createdAt: string
  status: GemStatus
  loved: string | null
  watchOut: string | null
}

export type Find = {
  id: string
  gemId: string
  userId: string
  description: string
  liked: string | null
  disliked: string | null
  tags: string[]
  createdAt: string
  handle: string | null
  displayName: string | null
  isFirstFind: boolean
}

export type GemDetail = {
  id: string
  slug: string
  name: string
  category: Category
  address: string | null
  city: string | null
  area: string | null
  country: string | null
  citySlug: string | null
  areaSlug: string | null
  lat: number
  lng: number
  applePlaceId: string | null
  googleMapsUrl: string | null
  firstFinderId: string | null
  firstFinderHandle: string | null
  findCount: number
  createdAt: string
  upvotes: number
  downvotes: number
  status: GemStatus
  finds: Find[]
}

export type AreaSummary = { area: string; areaSlug: string; gemCount: number; polishedCount?: number }

export type CitySummary = {
  city: string
  citySlug: string
  country: string | null
  gemCount: number
  polishedCount: number
  areas: AreaSummary[]
}

export type GemSort = 'polished' | 'top' | 'new'

export type PlacePage = {
  place: {
    city: string
    citySlug: string
    country: string | null
    area: string | null
    areaSlug: string | null
    gemCount: number
    polishedCount: number
    cityGemCount: number
  }
  areas: AreaSummary[]
  categories: Partial<Record<Category, number>>
  category: Category | null
  sort: GemSort
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  gems: GemCardData[]
}

export type SearchPlace = {
  city: string
  citySlug: string
  area: string | null
  areaSlug: string | null
  gemCount: number
}

export type SearchResults = { places: SearchPlace[]; gems: GemCardData[] }

export type Level = 'Digger' | 'Prospector' | 'Master Prospector'

export type User = {
  id: string
  email?: string | null
  displayName: string | null
  handle: string | null
  createdAt: string
  agreedTermsAt: string | null
  needsTerms?: boolean
  gemsUnearthed?: number
  firstFinds?: number
  level?: Level
}

export type Me = User & { finds: unknown[] }

export type ProfileFind = {
  id: string
  gemId: string
  description: string
  liked: string | null
  disliked: string | null
  tags: string[]
  createdAt: string
  isFirstFind: boolean
  gem: Pick<
    GemCardData,
    'id' | 'slug' | 'name' | 'category' | 'address' | 'city' | 'area' | 'citySlug' | 'areaSlug' | 'lat' | 'lng' | 'status' | 'upvotes' | 'downvotes'
  >
}

export type Profile = { user: User; finds: ProfileFind[] }

export type AuthResult = { user: User; needsHandle: boolean; needsTerms: boolean }
