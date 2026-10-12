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
    var likedText: String? = nil
    var dislikedText: String? = nil
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
