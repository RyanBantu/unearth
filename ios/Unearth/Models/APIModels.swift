import Foundation

/// Server gem status payload nested under `status`.
struct APIGemStatus: Decodable, Hashable {
    var findCount: Int
    var primary: String?
    var rare: Bool?
    var minedOut: Bool?
    var labels: [String]?
}

/// Decodes `/gems/nearby`, `/gems/:id`, create-gem, and stash rows from the API.
struct APIGemDTO: Decodable {
    var id: UUID
    var name: String
    var category: Category
    var lat: Double
    var lng: Double
    var address: String?
    var googleMapsUrl: String?
    var applePlaceId: String?
    var firstFinderId: UUID?
    var createdAt: Date?
    var distanceM: Double?
    var status: APIGemStatus
    var isStashed: Bool?
    var myFindId: UUID?
    var finds: [APIFindDTO]?

    func toGem() -> Gem {
        let mappedFinds = (finds ?? []).map { $0.toFind(gemName: name) }
        let handles = mappedFinds.map(\.handle)
        let firstHandle = mappedFinds.first(where: \.isFirstFind)?.handle ?? handles.first
        let likedNotes = mappedFinds.compactMap(\.likedText).filter { !$0.isEmpty }
        let dislikedNotes = mappedFinds.compactMap(\.dislikedText).filter { !$0.isEmpty }
        var tagCounts: [String: Int] = [:]
        for find in mappedFinds {
            for tag in find.tags {
                tagCounts[tag, default: 0] += 1
            }
        }
        let mergedTags = tagCounts.keys.sorted { (tagCounts[$0] ?? 0) > (tagCounts[$1] ?? 0) }

        return Gem(
            id: id,
            name: name,
            category: category,
            latitude: lat,
            longitude: lng,
            address: address ?? "",
            googleMapsUrl: googleMapsUrl.flatMap(URL.init(string:)),
            findCount: status.findCount,
            isFirstFind: status.findCount <= 1,
            firstFinderHandle: firstHandle,
            finderHandles: handles,
            unearthedByHandle: firstHandle,
            note: mappedFinds.first?.note,
            tags: mergedTags,
            liked: likedNotes,
            disliked: dislikedNotes,
            finds: mappedFinds,
            isStashed: isStashed ?? false,
            myFindId: myFindId
        )
    }
}

struct APIFindDTO: Decodable {
    var id: UUID
    var gemId: UUID?
    var userId: UUID?
    var description: String?
    var liked: String?
    var disliked: String?
    var tags: [String]?
    var createdAt: Date?
    var handle: String?
    var displayName: String?
    var isFirstFind: Bool?

    func toFind(gemName: String) -> Find {
        Find(
            id: id,
            gemId: gemId ?? UUID(),
            gemName: gemName,
            userId: userId ?? UUID(),
            handle: handle ?? "unknown",
            createdAt: createdAt ?? .now,
            note: description,
            isFirstFind: isFirstFind ?? false,
            liked: liked.map { [$0] } ?? [],
            disliked: disliked.map { [$0] } ?? [],
            tags: tags ?? [],
            likedText: liked,
            dislikedText: disliked
        )
    }
}

struct APIMatchCandidateDTO: Decodable {
    var id: UUID
    var name: String
    var category: Category
    var findCount: Int?
    var distanceM: Double
    var nameSim: Double?
    var status: APIGemStatus?
    var lat: Double?
    var lng: Double?
    var address: String?

    func toMatchCandidate() -> MatchCandidate {
        MatchCandidate(
            id: id,
            name: name,
            category: category,
            distanceMeters: distanceM,
            findCount: findCount ?? status?.findCount ?? 0,
            existingGemId: id
        )
    }
}

struct GemsNearbyResponse: Decodable {
    var gems: [APIGemDTO]
}

struct MatchResponse: Decodable {
    var candidates: [APIMatchCandidateDTO]
}

struct StashResponse: Decodable {
    var gems: [APIGemDTO]
}

struct ActivityResponse: Decodable {
    var events: [ActivityEvent]
}

struct CreateGemResponse: Decodable {
    var id: UUID
    var name: String
    var category: Category
    var lat: Double
    var lng: Double
    var address: String?
    var googleMapsUrl: String?
    var status: APIGemStatus
    var myFindId: UUID?

    func toGem() -> Gem {
        APIGemDTO(
            id: id,
            name: name,
            category: category,
            lat: lat,
            lng: lng,
            address: address,
            googleMapsUrl: googleMapsUrl,
            applePlaceId: nil,
            firstFinderId: nil,
            createdAt: nil,
            distanceM: nil,
            status: status,
            isStashed: false,
            myFindId: myFindId,
            finds: nil
        ).toGem()
    }
}

struct CreateFindResponse: Decodable {
    var find: APIFindDTO
    var status: APIGemStatus?
}

struct DuplicateConflictError: Decodable {
    var error: String?
    var candidates: [APIMatchCandidateDTO]?
}

struct DevAuthBody: Encodable {
    var handle: String?
}
