import Foundation

enum GemStatus: String, Codable, Hashable {
    case uncut
    case polished
    case rare
    case minedOut

    var displayName: String {
        switch self {
        case .uncut: return "Uncut"
        case .polished: return "Polished"
        case .rare: return "Rare"
        case .minedOut: return "Mined out"
        }
    }

    /// Primary maturity from find count.
    /// uncut <3, polished >=3, minedOut >=25.
    /// Rare (>=10, <25) is a parallel badge shown alongside Uncut/Polished.
    static func from(findCount: Int) -> GemStatus {
        if findCount >= 25 { return .minedOut }
        if findCount >= 10 { return .rare }
        if findCount >= 3 { return .polished }
        return .uncut
    }

    /// Badges to show: Rare can appear alongside Uncut/Polished;
    /// Mined out replaces Rare when findCount >= 25.
    static func badges(for findCount: Int) -> [GemStatus] {
        if findCount >= 25 {
            return [.minedOut]
        }

        var badges: [GemStatus] = []
        if findCount >= 3 {
            badges.append(.polished)
        } else {
            badges.append(.uncut)
        }
        if findCount >= 10 {
            badges.append(.rare)
        }
        return badges
    }

    func badgeText(findCount: Int) -> String {
        let noun = findCount == 1 ? "find" : "finds"
        return "\(displayName) · \(findCount) \(noun)"
    }

    /// Short badge label without find count (Gem detail status chips).
    var shortBadgeText: String { displayName }
}

enum DistanceFormatter {
    static func format(_ meters: Double) -> String {
        if meters < 1000 {
            return "\(Int(meters.rounded())) m"
        }
        let km = meters / 1000
        return String(format: "%.1f km", km)
    }
}
