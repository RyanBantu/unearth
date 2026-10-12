import CoreLocation
import MapKit
import SwiftUI

@Observable
@MainActor
final class DigViewModel {
    /// Live gems from `GET /gems/nearby`. Empty until the first successful fetch.
    /// Mock data is for SwiftUI previews only — see `previewLoaded`.
    var gems: [Gem] = []
    /// `nil` means "All" is selected.
    var selectedCategory: Category? = nil
    var selectedGem: Gem?
    var searchText: String = ""
    var showSearchSuggestions = false
    var showNearbyList = false
    var isLoadingNearby = false
    var loadError: String?
    var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 12.9716, longitude: 77.5946),
            span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04)
        )
    )

    private var lastFetchCenter: CLLocationCoordinate2D?
    private var lastFetchRadiusM: Int = 5_000
    private var refetchTask: Task<Void, Never>?

    var filteredGems: [Gem] {
        guard let selectedCategory else { return gems }
        return gems.filter { $0.category == selectedCategory }
    }

    func selectCategoryFilter(_ category: Category?) {
        selectedCategory = category
        if let selectedGem, !filteredGems.contains(where: { $0.id == selectedGem.id }) {
            self.selectedGem = nil
        }
        if let center = lastFetchCenter {
            Task {
                await loadNearby(lat: center.latitude, lng: center.longitude, radiusMeters: lastFetchRadiusM)
            }
        }
    }

    func select(_ gem: Gem) {
        withAnimation(.spring(response: 0.32, dampingFraction: 0.78)) {
            selectedGem = gem
        }
        cameraPosition = .region(
            MKCoordinateRegion(
                center: gem.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
            )
        )
    }

    func selectNewlyUnearthed(_ gem: Gem) {
        if !gems.contains(where: { $0.id == gem.id }) {
            gems.insert(gem, at: 0)
        }
        select(gem)
        // Refresh from API so find_count / status are authoritative.
        Task {
            if let fresh = try? await APIClient.shared.gem(id: gem.id) {
                if let idx = gems.firstIndex(where: { $0.id == fresh.id }) {
                    gems[idx] = fresh
                }
                selectedGem = fresh
            }
        }
    }

    func clearSelection() {
        withAnimation(.easeInOut(duration: 0.2)) {
            selectedGem = nil
        }
    }

    func centerOnUser(_ location: CLLocation?) {
        guard let location else { return }
        cameraPosition = .region(
            MKCoordinateRegion(
                center: location.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.03, longitudeDelta: 0.03)
            )
        )
    }

    func moveCamera(to coordinate: CLLocationCoordinate2D) {
        cameraPosition = .region(
            MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            )
        )
    }

    func nearestGem(from location: CLLocation?) -> Gem? {
        let pool = filteredGems
        guard let location else { return pool.first }
        return pool.min { lhs, rhs in
            let left = lhs.distanceMeters(from: location) ?? .greatestFiniteMagnitude
            let right = rhs.distanceMeters(from: location) ?? .greatestFiniteMagnitude
            return left < right
        }
    }

    /// Selected pin, otherwise nearest gem for the bottom sheet.
    func sheetGem(userLocation: CLLocation?) -> Gem? {
        if let selectedGem, filteredGems.contains(where: { $0.id == selectedGem.id }) {
            return selectedGem
        }
        return nearestGem(from: userLocation)
    }

    func nearbyGemsSorted(from location: CLLocation?) -> [Gem] {
        filteredGems.sorted { lhs, rhs in
            let left = lhs.distanceMeters(from: location) ?? .greatestFiniteMagnitude
            let right = rhs.distanceMeters(from: location) ?? .greatestFiniteMagnitude
            return left < right
        }
    }

    /// Called when the Dig map camera settles — refetch nearby gems.
    func onMapCameraSettled(_ region: MKCoordinateRegion) {
        let radius = Self.radiusMeters(for: region)
        let center = region.center

        // Skip tiny pans that don't meaningfully change the query.
        if let last = lastFetchCenter {
            let moved = CLLocation(latitude: last.latitude, longitude: last.longitude)
                .distance(from: CLLocation(latitude: center.latitude, longitude: center.longitude))
            let radiusDelta = abs(radius - lastFetchRadiusM)
            if moved < 80, radiusDelta < 200 { return }
        }

        refetchTask?.cancel()
        refetchTask = Task {
            try? await Task.sleep(nanoseconds: 280_000_000)
            guard !Task.isCancelled else { return }
            await loadNearby(lat: center.latitude, lng: center.longitude, radiusMeters: radius)
        }
    }

    func loadNearby(lat: Double, lng: Double, radiusMeters: Int = 5_000) async {
        isLoadingNearby = true
        loadError = nil
        defer { isLoadingNearby = false }

        let clampedRadius = min(50_000, max(500, radiusMeters))
        lastFetchCenter = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        lastFetchRadiusM = clampedRadius

        do {
            let response = try await APIClient.shared.gemsNearby(
                lat: lat,
                lng: lng,
                radiusM: clampedRadius,
                category: selectedCategory?.rawValue
            )
            let mapped = response.gems.map { $0.toGem() }
            gems = mapped
            if let selected = selectedGem,
               let refreshed = mapped.first(where: { $0.id == selected.id }) {
                selectedGem = refreshed
            } else if selectedGem == nil {
                selectedGem = nearestGem(from: CLLocation(latitude: lat, longitude: lng))
            } else if let selected = selectedGem,
                      !mapped.contains(where: { $0.id == selected.id }) {
                // Selection left the viewport — keep it until user taps elsewhere.
                _ = selected
            }
        } catch {
            loadError = error.localizedDescription
            // Do not reinstate mock gems — keep last live list or empty.
        }
    }

    static func radiusMeters(for region: MKCoordinateRegion) -> Int {
        let center = CLLocation(latitude: region.center.latitude, longitude: region.center.longitude)
        let corner = CLLocation(
            latitude: region.center.latitude + region.span.latitudeDelta / 2,
            longitude: region.center.longitude + region.span.longitudeDelta / 2
        )
        return min(50_000, max(500, Int(center.distance(from: corner))))
    }

    /// Seed for `#Preview` only.
    static func previewLoaded() -> DigViewModel {
        let vm = DigViewModel()
        vm.gems = Gem.mockGems
        vm.selectedGem = Gem.mockGems.first
        return vm
    }
}
