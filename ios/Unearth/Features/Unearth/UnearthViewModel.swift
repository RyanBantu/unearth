import CoreLocation
import Foundation
import MapKit
import SwiftUI

enum QuickTag: String, CaseIterable, Identifiable, Hashable {
    case cheap = "Cheap"
    case cashOnly = "Cash only"
    case quiet = "Quiet"
    case mornings = "Mornings"
    case lateNight = "Late night"
    case standingOnly = "Standing only"
    case needsVehicle = "Needs a vehicle"
    case familyFriendly = "Family friendly"
    case greatView = "Great view"
    case vegFriendly = "Veg friendly"

    var id: String { rawValue }
}

@Observable
@MainActor
final class UnearthViewModel {
    /// When set, form is in "add a find" mode for an existing gem.
    var linkedGem: Gem?

    var name = ""
    var description = ""
    var liked = ""
    var disliked = ""
    var googleMapsURL = ""
    var category: Category?
    var showMoreCategories = false
    var selectedTags: Set<QuickTag> = []
    var applePlaceId: String?

    var pinCoordinate = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
    var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
    )

    var matchCandidates: [MatchCandidate] = []
    var dismissedCandidateIds: Set<UUID> = []
    var toastMessage: String?
    var isSubmitting = false
    var didCenterOnUser = false

    let placeSearch = PlaceSearchService()

    var isExistingGemMode: Bool { linkedGem != nil }

    var currentMatch: MatchCandidate? {
        matchCandidates.first { !dismissedCandidateIds.contains($0.id) }
    }

    var primaryCategories: [Category] { [.food, .cafe, .viewpoint, .trail] }
    var moreCategories: [Category] { [.shop, .other] }

    var visibleCategories: [Category] {
        showMoreCategories ? primaryCategories + moreCategories : primaryCategories
    }

    var isDescriptionValid: Bool {
        let count = description.trimmingCharacters(in: .whitespacesAndNewlines).count
        return count >= 10 && count <= 600
    }

    var isGoogleMapsURLValid: Bool {
        let trimmed = googleMapsURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return true }
        return Self.isValidGoogleMapsURL(trimmed)
    }

    var isFormValid: Bool {
        if isExistingGemMode {
            return isDescriptionValid && isGoogleMapsURLValid && selectedTags.count <= 5
                && liked.count <= 140 && disliked.count <= 140
        }
        let nameOk = !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return nameOk
            && category != nil
            && isDescriptionValid
            && isGoogleMapsURLValid
            && selectedTags.count <= 5
            && liked.count <= 140
            && disliked.count <= 140
    }

    private var matchTask: Task<Void, Never>?

    init(linkedGem: Gem? = nil) {
        self.linkedGem = linkedGem
        if let gem = linkedGem {
            name = gem.name
            category = gem.category
            pinCoordinate = gem.coordinate
            cameraPosition = .region(
                MKCoordinateRegion(
                    center: gem.coordinate,
                    span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                )
            )
        }
    }

    func centerOnUser(_ location: CLLocation?) {
        guard let location else { return }
        movePin(to: location.coordinate)
        didCenterOnUser = true
    }

    func movePin(to coordinate: CLLocationCoordinate2D) {
        pinCoordinate = coordinate
        cameraPosition = .region(
            MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
        )
        placeSearch.setRegion(
            MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            )
        )
        scheduleMatchQuery()
    }

    func updatePinFromCamera(_ coordinate: CLLocationCoordinate2D) {
        pinCoordinate = coordinate
        placeSearch.setRegion(
            MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            )
        )
        scheduleMatchQuery()
    }

    func onNameChanged(_ value: String) {
        name = value
        placeSearch.queryFragment = value
        placeSearch.setRegion(
            MKCoordinateRegion(
                center: pinCoordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            )
        )
        scheduleMatchQuery()
    }

    func selectSuggestion(_ completion: MKLocalSearchCompletion) async {
        guard let item = await placeSearch.search(completion: completion) else { return }
        name = item.name ?? completion.title
        placeSearch.clear()
        movePin(to: item.placemark.coordinate)
        if #available(iOS 18.0, *) {
            applePlaceId = item.identifier?.rawValue
        }
    }

    var nameSuggestions: [MKLocalSearchCompletion] {
        Array(placeSearch.completions.prefix(4))
    }

    func acceptMatch() {
        guard let match = currentMatch else { return }
        // Switch into existing-gem mode
        linkedGem = Gem(
            id: match.existingGemId ?? match.id,
            name: match.name,
            category: match.category,
            latitude: pinCoordinate.latitude,
            longitude: pinCoordinate.longitude,
            address: "",
            googleMapsUrl: nil,
            findCount: match.findCount,
            isFirstFind: false,
            firstFinderHandle: nil,
            finderHandles: [],
            unearthedByHandle: nil,
            note: nil,
            tags: [],
            liked: [],
            disliked: [],
            finds: [],
            isStashed: false,
            myFindId: nil
        )
        name = match.name
        category = match.category
        matchCandidates = []
        dismissedCandidateIds = []
    }

    func rejectMatch() {
        guard let match = currentMatch else { return }
        dismissedCandidateIds.insert(match.id)
    }

    func toggleTag(_ tag: QuickTag) {
        if selectedTags.contains(tag) {
            selectedTags.remove(tag)
        } else if selectedTags.count < 5 {
            selectedTags.insert(tag)
        }
    }

    func scheduleMatchQuery() {
        matchTask?.cancel()
        guard !isExistingGemMode else { return }
        let nameSnapshot = name
        let coord = pinCoordinate
        let categorySnapshot = category
        matchTask = Task {
            try? await Task.sleep(nanoseconds: 400_000_000)
            guard !Task.isCancelled else { return }
            await queryMatch(name: nameSnapshot, coordinate: coord, category: categorySnapshot)
        }
    }

    private func queryMatch(
        name: String,
        coordinate: CLLocationCoordinate2D,
        category: Category?
    ) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            matchCandidates = []
            return
        }

        // TODO: call GET /gems/match
        // Mock: show candidates when name overlaps a mock gem
        let lower = trimmed.lowercased()
        let mocks = MatchCandidate.mocks.filter { candidate in
            candidate.name.lowercased().contains(lower)
                || lower.contains(candidate.name.lowercased().prefix(5))
        }
        if mocks.isEmpty, lower.count >= 4 {
            // Demo banner for any longer name so the UI can be exercised
            matchCandidates = [MatchCandidate.mocks[0]]
        } else {
            matchCandidates = mocks
        }
        dismissedCandidateIds = []
        _ = coordinate
        _ = category
        _ = applePlaceId
    }

    @discardableResult
    func submit() async -> String? {
        guard isFormValid, !isSubmitting else { return nil }
        isSubmitting = true
        defer { isSubmitting = false }

        let tags = selectedTags.map(\.rawValue)
        let likedText = liked.trimmingCharacters(in: .whitespacesAndNewlines)
        let dislikedText = disliked.trimmingCharacters(in: .whitespacesAndNewlines)
        let maps = googleMapsURL.trimmingCharacters(in: .whitespacesAndNewlines)

        if let gem = linkedGem {
            // TODO: POST /gems/:id/finds
            _ = CreateFindBody(
                description: description.trimmingCharacters(in: .whitespacesAndNewlines),
                liked: likedText.isEmpty ? nil : likedText,
                disliked: dislikedText.isEmpty ? nil : dislikedText,
                tags: tags
            )
            let message = "Added your find"
            toastMessage = message
            return message
        }

        // TODO: POST /gems
        _ = CreateGemBody(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            category: (category ?? .other).rawValue,
            lat: pinCoordinate.latitude,
            lng: pinCoordinate.longitude,
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            liked: likedText.isEmpty ? nil : likedText,
            disliked: dislikedText.isEmpty ? nil : dislikedText,
            tags: tags,
            applePlaceId: applePlaceId,
            googleMapsUrl: maps.isEmpty ? nil : maps
        )
        let message = "Gem unearthed"
        toastMessage = message
        return message
    }

    static func isValidGoogleMapsURL(_ string: String) -> Bool {
        guard let url = URL(string: string), let host = url.host?.lowercased() else { return false }
        let allowed = [
            "maps.google.com",
            "www.google.com",
            "google.com",
            "maps.app.goo.gl",
            "goo.gl",
        ]
        if allowed.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) {
            if host.contains("google") {
                return string.lowercased().contains("maps") || host.contains("maps")
            }
            return true
        }
        return host.contains("google") && string.lowercased().contains("maps")
    }
}
