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
        validationHints.isEmpty
    }

    /// Human-readable reasons the Unearth button is disabled.
    var validationHints: [String] {
        var hints: [String] = []
        if !isExistingGemMode {
            if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                hints.append("Add a name")
            }
            if category == nil {
                hints.append("Pick a category")
            }
        }
        if !isDescriptionValid {
            let count = description.trimmingCharacters(in: .whitespacesAndNewlines).count
            if count < 10 {
                hints.append("“Why it's a gem” needs at least 10 characters (\(count)/10)")
            } else {
                hints.append("“Why it's a gem” is too long (max 600)")
            }
        }
        if liked.count > 140 {
            hints.append("Liked is too long (max 140)")
        }
        if disliked.count > 140 {
            hints.append("Didn't like is too long (max 140)")
        }
        if selectedTags.count > 5 {
            hints.append("Pick at most 5 tags")
        }
        if !isGoogleMapsURLValid {
            hints.append("Google Maps link isn’t a valid Maps URL")
        }
        return hints
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

    /// Gem produced by the last successful submit (for Dig selection).
    var lastSubmittedGem: Gem?

    private func queryMatch(
        name: String,
        coordinate: CLLocationCoordinate2D,
        category: Category?
    ) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2, let category else {
            matchCandidates = []
            return
        }

        do {
            let response = try await APIClient.shared.gemsMatch(
                lat: coordinate.latitude,
                lng: coordinate.longitude,
                name: trimmed,
                category: category.rawValue,
                applePlaceId: applePlaceId
            )
            matchCandidates = response.candidates.map { $0.toMatchCandidate() }
            dismissedCandidateIds = []
        } catch {
            // Keep current candidates on transient failures.
        }
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
        let desc = description.trimmingCharacters(in: .whitespacesAndNewlines)

        if let gem = linkedGem {
            do {
                _ = try await APIClient.shared.createFind(
                    gemId: gem.id,
                    body: CreateFindBody(
                        description: desc,
                        liked: likedText.isEmpty ? nil : likedText,
                        disliked: dislikedText.isEmpty ? nil : dislikedText,
                        tags: tags
                    )
                )
                lastSubmittedGem = gem
                let message = "Added your find"
                toastMessage = message
                return message
            } catch {
                toastMessage = error.localizedDescription
                return nil
            }
        }

        let body = CreateGemBody(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            category: (category ?? .other).rawValue,
            lat: pinCoordinate.latitude,
            lng: pinCoordinate.longitude,
            description: desc,
            liked: likedText.isEmpty ? nil : likedText,
            disliked: dislikedText.isEmpty ? nil : dislikedText,
            tags: tags,
            applePlaceId: applePlaceId,
            googleMapsUrl: maps.isEmpty ? nil : maps,
            address: nil,
            // After the user dismisses duplicate candidates, assert this is a new place.
            confirmedNew: dismissedCandidateIds.isEmpty ? nil : true
        )

        do {
            let created = try await APIClient.shared.createGem(body)
            lastSubmittedGem = created
            let message = "Gem unearthed"
            toastMessage = message
            return message
        } catch APIError.conflict(let candidates) {
            // Spec: show “Is this the same place?” banner with server candidates.
            matchCandidates = candidates
            dismissedCandidateIds = []
            toastMessage = nil
            return nil
        } catch {
            toastMessage = error.localizedDescription
            return nil
        }
    }

    static func isValidGoogleMapsURL(_ string: String) -> Bool {
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), let host = url.host?.lowercased() else { return false }

        // Short links from the Google Maps app
        if host == "maps.app.goo.gl" || host == "goo.gl" || host.hasSuffix(".app.goo.gl") {
            return true
        }
        // google.com/maps, maps.google.com, regional google.*/maps
        if host == "maps.google.com" || host.hasPrefix("maps.google.") {
            return true
        }
        if host == "google.com" || host.hasSuffix(".google.com") || host.hasPrefix("www.google.") {
            return trimmed.lowercased().contains("/maps") || trimmed.lowercased().contains("maps")
        }
        return host.contains("google") && trimmed.lowercased().contains("maps")
    }
}
