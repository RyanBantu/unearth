import Foundation

/// Nearby place candidate when matching before Unearthing a gem.
struct MatchCandidate: Identifiable, Hashable, Codable {
    let id: UUID
    var name: String
    var category: Category
    var distanceMeters: Double
    var findCount: Int
    var existingGemId: UUID?

    var distanceLabel: String {
        DistanceFormatter.format(distanceMeters)
    }

    var status: GemStatus {
        GemStatus.from(findCount: findCount)
    }

    /// e.g. "Corner dosa stall · 40 m from your pin · Polished, 3 finds"
    var bannerDetail: String {
        let noun = findCount == 1 ? "find" : "finds"
        return "\(name) · \(distanceLabel) from your pin · \(status.displayName), \(findCount) \(noun)"
    }
}

extension MatchCandidate {
    static let mocks: [MatchCandidate] = [
        MatchCandidate(
            id: UUID(),
            name: "Hidden Ramen Alley",
            category: .food,
            distanceMeters: 40,
            findCount: 3,
            existingGemId: Gem.mockGems[0].id
        ),
        MatchCandidate(
            id: UUID(),
            name: "Quiet Cup",
            category: .cafe,
            distanceMeters: 42,
            findCount: 28,
            existingGemId: Gem.mockGems[3].id
        ),
    ]
}
