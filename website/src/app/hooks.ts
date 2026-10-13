import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

type LatLng = { lat: number; lng: number }

let current: LatLng | null = null
const listeners = new Set<() => void>()

function publish(next: LatLng) {
  current = next
  listeners.forEach((l) => l())
}

function readPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location isn’t available in this browser.'))
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude }
        publish(loc)
        resolve(loc)
      },
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'Location permission was denied.' : 'Couldn’t get your location.')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => current

/** The visitor's location. Never read until `request()` is called from a tap. */
export function useUserLocation() {
  const location = useSyncExternalStore(subscribe, snapshot)
  const request = useCallback(() => readPosition(), [])
  return { location, request }
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

const DEFAULT_TITLE = 'Unearth — the places that aren’t on the top-10 lists'

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ?? DEFAULT_TITLE
  }, [title])
}
