import Foundation

struct Find: Identifiable, Hashable, Codable {
    let id: UUID
    var gemId: UUID
    var gemName: String
    var userId: UUID
    var handle: String
    var createdAt: Date
    var note: String?
    var isFirstFind: Bool
    var liked: [String]
    var disliked: [String]
    var tags: [String]
    /// Raw API strings (server stores a single optional string per find).
    var likedText: String?
    var dislikedText: String?

    enum CodingKeys: String, CodingKey {
        case id, gemId, gemName, userId, handle, createdAt
        case note, description
        case isFirstFind, liked, disliked, tags
        case likedText, dislikedText
    }

    init(
        id: UUID,
        gemId: UUID,
        gemName: String,
        userId: UUID,
        handle: String,
        createdAt: Date,
        note: String? = nil,
        isFirstFind: Bool = false,
        liked: [String] = [],
        disliked: [String] = [],
        tags: [String] = [],
        likedText: String? = nil,
        dislikedText: String? = nil
    ) {
        self.id = id
        self.gemId = gemId
        self.gemName = gemName
        self.userId = userId
        self.handle = handle
        self.createdAt = createdAt
        self.note = note
        self.isFirstFind = isFirstFind
        self.liked = liked
        self.disliked = disliked
        self.tags = tags
        self.likedText = likedText
        self.dislikedText = dislikedText
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        gemId = try c.decodeIfPresent(UUID.self, forKey: .gemId) ?? UUID()
        gemName = try c.decodeIfPresent(String.self, forKey: .gemName) ?? ""
        userId = try c.decodeIfPresent(UUID.self, forKey: .userId) ?? UUID()
        handle = try c.decodeIfPresent(String.self, forKey: .handle) ?? ""
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt) ?? .now
        note = try c.decodeIfPresent(String.self, forKey: .note)
            ?? c.decodeIfPresent(String.self, forKey: .description)
        isFirstFind = try c.decodeIfPresent(Bool.self, forKey: .isFirstFind) ?? false
        tags = try c.decodeIfPresent([String].self, forKey: .tags) ?? []

        if let likedArr = try? c.decode([String].self, forKey: .liked) {
            liked = likedArr
            likedText = likedArr.first
        } else if let likedStr = try c.decodeIfPresent(String.self, forKey: .liked) {
            likedText = likedStr
            liked = likedStr.isEmpty ? [] : [likedStr]
        } else {
            liked = []
            likedText = try c.decodeIfPresent(String.self, forKey: .likedText)
        }

        if let dislikedArr = try? c.decode([String].self, forKey: .disliked) {
            disliked = dislikedArr
            dislikedText = dislikedArr.first
        } else if let dislikedStr = try c.decodeIfPresent(String.self, forKey: .disliked) {
            dislikedText = dislikedStr
            disliked = dislikedStr.isEmpty ? [] : [dislikedStr]
        } else {
            disliked = []
            dislikedText = try c.decodeIfPresent(String.self, forKey: .dislikedText)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(gemId, forKey: .gemId)
        try c.encode(gemName, forKey: .gemName)
        try c.encode(userId, forKey: .userId)
        try c.encode(handle, forKey: .handle)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encodeIfPresent(note, forKey: .note)
        try c.encode(isFirstFind, forKey: .isFirstFind)
        try c.encode(liked, forKey: .liked)
        try c.encode(disliked, forKey: .disliked)
        try c.encode(tags, forKey: .tags)
    }
}

extension Find {
    /// Build finds against stable gem IDs (avoids circular static init with `Gem.mockGems`).
    static func makeMocks(gemIDs ids: [UUID]) -> [Find] {
        guard ids.count >= 3 else { return [] }
        let gem0 = ids[0]
        let gem1 = ids[1]
        let gem2 = ids[2]
        let userId = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!
        return [
            Find(
                id: UUID(uuidString: "A1000000-0000-0000-0000-000000000001")!,
                gemId: gem0,
                gemName: "Hidden Ramen Alley",
                userId: userId,
                handle: "maya",
                createdAt: Date().addingTimeInterval(-86_400 * 40),
                note: "Ask for the off-menu miso — the cook still remembers the first regulars.",
                isFirstFind: true,
                liked: ["Broth depth", "Late hours", "Hidden entrance"],
                disliked: ["Can get crowded", "Cash only"],
                tags: ["late-night", "noodles", "cash-only"]
            ),
            Find(
                id: UUID(uuidString: "A1000000-0000-0000-0000-000000000002")!,
                gemId: gem0,
                gemName: "Hidden Ramen Alley",
                userId: UUID(uuidString: "B2000000-0000-0000-0000-000000000002")!,
                handle: "kai",
                createdAt: Date().addingTimeInterval(-86_400 * 12),
                note: "Still incredible on a rainy Tuesday.",
                isFirstFind: false,
                liked: ["Portion size"],
                disliked: [],
                tags: ["rainy-day"]
            ),
            Find(
                id: UUID(uuidString: "A1000000-0000-0000-0000-000000000003")!,
                gemId: gem0,
                gemName: "Hidden Ramen Alley",
                userId: UUID(uuidString: "B2000000-0000-0000-0000-000000000003")!,
                handle: "rui",
                createdAt: Date().addingTimeInterval(-86_400 * 3),
                note: "Brought two friends. Worth the hunt.",
                isFirstFind: false,
                liked: ["Atmosphere"],
                disliked: ["Wait time"],
                tags: []
            ),
            Find(
                id: UUID(uuidString: "A1000000-0000-0000-0000-000000000004")!,
                gemId: gem1,
                gemName: "Fog Ridge Lookout",
                userId: userId,
                handle: "leo",
                createdAt: Date().addingTimeInterval(-3_600),
                note: "Best at golden hour — fog rolls in like theatre curtains.",
                isFirstFind: true,
                liked: ["Sunset light", "Quiet"],
                disliked: ["Wind"],
                tags: ["golden-hour", "fog"]
            ),
            Find(
                id: UUID(uuidString: "A1000000-0000-0000-0000-000000000005")!,
                gemId: gem2,
                gemName: "Coastal Cypress Trail",
                userId: UUID(uuidString: "B2000000-0000-0000-0000-000000000004")!,
                handle: "sam",
                createdAt: Date().addingTimeInterval(-86_400 * 90),
                note: "Cypress tunnel after the second switchback.",
                isFirstFind: true,
                liked: ["Shade", "Birdsong"],
                disliked: ["Steep start"],
                tags: ["hike", "shade"]
            ),
        ]
    }

    static let mocks: [Find] = makeMocks(gemIDs: Gem.mockGemIDs)
}
