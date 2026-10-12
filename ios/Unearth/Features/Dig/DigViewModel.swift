import CoreLocation
import MapKit
import SwiftUI

@Observable
@MainActor
final class DigViewModel {
    var gems: [Gem] = Gem.mockGems
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

    var filteredGems: [Gem] {
        guard let selectedCategory else { return gems }
        return gems.filter { $0.category == selectedCategory }
    }

    func selectCategoryFilter(_ category: Category?) {
        selectedCategory = category
        if let selectedGem, !filteredGems.contains(where: { $0.id == selectedGem.id }) {
            self.selectedGem = nil
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

    func loadNearby(lat: Double, lng: Double, radiusMeters: Int = 5_000) async {
        isLoadingNearby = true
        loadError = nil
        defer { isLoadingNearby = false }

        do {
            let response = try await APIClient.shared.gemsNearby(
                lat: lat,
                lng: lng,
                radiusM: radiusMeters,
                category: selectedCategory?.rawValue
            )
            let mapped = response.gems.map { $0.toGem() }
            gems = mapped
            if selectedGem == nil, let nearest = nearestGem(
                from: CLLocation(latitude: lat, longitude: lng)
            ) {
                selectedGem = nearest
            } else if let selected = selectedGem,
                      let refreshed = mapped.first(where: { $0.id == selected.id }) {
                selectedGem = refreshed
            }
        } catch {
            loadError = error.localizedDescription
            // Keep existing / mock gems when offline or unauthenticated.
        }
    }
}
