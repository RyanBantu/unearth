import Foundation
import MapKit

@Observable
@MainActor
final class PlaceSearchService: NSObject, MKLocalSearchCompleterDelegate {
    private let completer = MKLocalSearchCompleter()

    private(set) var completions: [MKLocalSearchCompletion] = []
    private(set) var isSearching = false
    var queryFragment: String = "" {
        didSet {
            completer.queryFragment = queryFragment
            isSearching = !queryFragment.isEmpty
        }
    }

    override init() {
        super.init()
        completer.delegate = self
        // Dig search targets towns / areas rather than POIs.
        completer.resultTypes = [.address, .query]
    }

    func setRegion(_ region: MKCoordinateRegion) {
        completer.region = region
    }

    func clear() {
        queryFragment = ""
        completions = []
        isSearching = false
    }

    func search(completion: MKLocalSearchCompletion) async -> MKMapItem? {
        let request = MKLocalSearch.Request(completion: completion)
        let search = MKLocalSearch(request: request)
        do {
            let response = try await search.start()
            return response.mapItems.first
        } catch {
            // TODO: surface search errors in UI
            return nil
        }
    }

    nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        let results = completer.results
        Task { @MainActor in
            self.completions = results
            self.isSearching = false
        }
    }

    nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            self.completions = []
            self.isSearching = false
        }
    }
}
