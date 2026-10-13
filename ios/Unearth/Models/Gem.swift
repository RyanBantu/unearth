import CoreLocation
import Foundation

struct Gem: Identifiable, Hashable, Codable {
    let id: UUID
    var name: String
    var category: Category
    var latitude: Double
    var longitude: Double
    var address: String
    var googleMapsUrl: URL?
    var findCount: Int
    var isFirstFind: Bool
    var firstFinderHandle: String?
    var finderHandles: [String]
    var unearthedByHandle: String?
    var note: String?
    var tags: [String]
    var liked: [String]
    var disliked: [String]
    var finds: [Find]
    var isStashed: Bool
    var myFindId: UUID?
    var upvotes: Int
    var downvotes: Int
    var myVote: Int?

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var netScore: Int { upvotes - downvotes }

    var showsVoteScore: Bool { upvotes > 0 || downvotes > 0 }

    /// Finders already endorsed the gem — voting UI is hidden.
    var canVote: Bool { myFindId == nil }

    var status: GemStatus {
        GemStatus.from(findCount: findCount)
    }

    var statusBadges: [GemStatus] {
        GemStatus.badges(for: findCount)
    }

    var statusBadgeText: String {
        status.badgeText(findCount: findCount)
    }

    var hasFound: Bool {
        myFindId != nil
    }

    var firstFind: Find? {
        finds.first(where: \.isFirstFind) ?? finds.sorted(by: { $0.createdAt < $1.createdAt }).first
    }

    var otherFinds: [Find] {
        finds.filter { find in
            guard let first = firstFind else { return true }
            return find.id != first.id
        }
        .sorted { $0.createdAt > $1.createdAt }
    }

    func distanceMeters(from location: CLLocation?) -> Double? {
        guard let location else { return nil }
        return location.distance(from: CLLocation(latitude: latitude, longitude: longitude))
    }

    func distanceLabel(from location: CLLocation?) -> String? {
        guard let meters = distanceMeters(from: location) else { return nil }
        return DistanceFormatter.format(meters)
    }

    func subtitle(from location: CLLocation?) -> String {
        if let distance = distanceLabel(from: location) {
            return "\(category.displayName) · \(distance) away"
        }
        return category.displayName
    }

    /// "MG Road, Bengaluru · 350 m away"
    func addressDistanceLine(from location: CLLocation?) -> String {
        if let distance = distanceLabel(from: location) {
            return "\(address) · \(distance) away"
        }
        return address
    }

    func unearthedSummaryLine() -> String {
        let count = max(findCount, finderHandles.count)
        if count <= 1, let handle = firstFinderHandle ?? finderHandles.first ?? unearthedByHandle {
            return "Unearthed by @\(handle)"
        }
        return "Unearthed independently by \(count) people"
    }
}

extension Gem {
    /// Stable IDs shared with Find mocks.
    static let mockGemIDs: [UUID] = [
        UUID(uuidString: "C3000000-0000-0000-0000-000000000001")!,
        UUID(uuidString: "C3000000-0000-0000-0000-000000000002")!,
        UUID(uuidString: "C3000000-0000-0000-0000-000000000003")!,
        UUID(uuidString: "C3000000-0000-0000-0000-000000000004")!,
    ]

    static let mockGems: [Gem] = {
        let finds = Find.makeMocks(gemIDs: mockGemIDs)
        func findsFor(_ id: UUID) -> [Find] {
            finds.filter { $0.gemId == id }
        }

        return [
            Gem(
                id: mockGemIDs[0],
                name: "Hidden Ramen Alley",
                category: .food,
                latitude: 12.9716,
                longitude: 77.5946,
                address: "MG Road, Bengaluru",
                googleMapsUrl: URL(string: "https://maps.google.com/?q=12.9716,77.5946"),
                findCount: 3,
                isFirstFind: false,
                firstFinderHandle: "maya",
                finderHandles: ["maya", "kai", "rui"],
                unearthedByHandle: "maya",
                note: "Ask for the off-menu miso — the cook still remembers the first regulars.",
                tags: ["late-night", "noodles", "cash-only"],
                liked: ["Broth depth", "Late hours", "Hidden entrance"],
                disliked: ["Can get crowded", "Cash only"],
                finds: findsFor(mockGemIDs[0]),
                isStashed: true,
                myFindId: nil,
                upvotes: 4,
                downvotes: 1,
                myVote: nil
            ),
            Gem(
                id: mockGemIDs[1],
                name: "Fog Ridge Lookout",
                category: .viewpoint,
                latitude: 12.9760,
                longitude: 77.6010,
                address: "Nandi Hills Road",
                googleMapsUrl: URL(string: "https://maps.google.com/?q=12.9760,77.6010"),
                findCount: 1,
                isFirstFind: true,
                firstFinderHandle: "leo",
                finderHandles: ["leo"],
                unearthedByHandle: "leo",
                note: "Best at golden hour — fog rolls in like theatre curtains.",
                tags: ["golden-hour", "fog"],
                liked: ["Sunset light", "Quiet"],
                disliked: ["Wind"],
                finds: findsFor(mockGemIDs[1]),
                isStashed: false,
                myFindId: findsFor(mockGemIDs[1]).first?.id,
                upvotes: 0,
                downvotes: 0,
                myVote: nil
            ),
            Gem(
                id: mockGemIDs[2],
                name: "Coastal Cypress Trail",
                category: .trail,
                latitude: 12.9680,
                longitude: 77.5880,
                address: "Cubbon Park Loop",
                googleMapsUrl: nil,
                findCount: 12,
                isFirstFind: false,
                firstFinderHandle: "sam",
                finderHandles: ["sam", "ada", "maya", "kai"],
                unearthedByHandle: "sam",
                note: "Cypress tunnel after the second switchback.",
                tags: ["hike", "shade", "weekend"],
                liked: ["Shade", "Birdsong"],
                disliked: ["Steep start"],
                finds: findsFor(mockGemIDs[2]),
                isStashed: false,
                myFindId: nil,
                upvotes: 8,
                downvotes: 2,
                myVote: 1
            ),
            Gem(
                id: mockGemIDs[3],
                name: "Quiet Cup",
                category: .cafe,
                latitude: 12.9800,
                longitude: 77.6050,
                address: "Church Street",
                googleMapsUrl: URL(string: "https://maps.google.com/?q=12.9800,77.6050"),
                findCount: 28,
                isFirstFind: false,
                firstFinderHandle: "ada",
                finderHandles: ["ada", "sam", "leo", "maya", "kai"],
                unearthedByHandle: "ada",
                note: "Single-origin only. Ask for the pour-over flight.",
                tags: ["coffee", "quiet", "wifi"],
                liked: ["Beans", "Playlist"],
                disliked: ["Limited seating"],
                finds: [],
                isStashed: true,
                myFindId: UUID(uuidString: "A1000000-0000-0000-0000-000000000099"),
                upvotes: 1,
                downvotes: 0,
                myVote: nil
            ),
        ]
    }()
}
