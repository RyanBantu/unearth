import Foundation

enum ProspectorLevel: String, Codable, Hashable {
    case digger = "Digger"
    case prospector = "Prospector"
    case masterProspector = "Master Prospector"

    /// Digger: <10 finds, Prospector: 10–49, Master Prospector: ≥50
    static func from(findCount: Int) -> ProspectorLevel {
        if findCount >= 50 { return .masterProspector }
        if findCount >= 10 { return .prospector }
        return .digger
    }
}

struct User: Identifiable, Hashable, Codable {
    let id: UUID
    var handle: String
    var appleUserId: String?
    var gemsUnearthed: Int
    var firstFindsCount: Int
    var prospectorLevel: ProspectorLevel
    var finds: [Find]

    var prospectorLevelLabel: String {
        prospectorLevel.rawValue
    }

    var gemsUnearthedLabel: String {
        let noun = gemsUnearthed == 1 ? "gem" : "gems"
        return "\(gemsUnearthed) \(noun) unearthed"
    }

    enum CodingKeys: String, CodingKey {
        case id, handle, appleUserId, gemsUnearthed, finds
        case firstFindsCount
        case firstFinds
        case prospectorLevel = "level"
    }

    init(
        id: UUID,
        handle: String,
        appleUserId: String? = nil,
        gemsUnearthed: Int = 0,
        firstFindsCount: Int = 0,
        prospectorLevel: ProspectorLevel = .digger,
        finds: [Find] = []
    ) {
        self.id = id
        self.handle = handle
        self.appleUserId = appleUserId
        self.gemsUnearthed = gemsUnearthed
        self.firstFindsCount = firstFindsCount
        self.prospectorLevel = prospectorLevel
        self.finds = finds
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        handle = try container.decodeIfPresent(String.self, forKey: .handle) ?? ""
        appleUserId = try container.decodeIfPresent(String.self, forKey: .appleUserId)
        gemsUnearthed = try container.decodeIfPresent(Int.self, forKey: .gemsUnearthed) ?? 0
        if let count = try container.decodeIfPresent(Int.self, forKey: .firstFindsCount) {
            firstFindsCount = count
        } else {
            firstFindsCount = try container.decodeIfPresent(Int.self, forKey: .firstFinds) ?? 0
        }
        prospectorLevel = try container.decodeIfPresent(ProspectorLevel.self, forKey: .prospectorLevel) ?? .digger
        finds = try container.decodeIfPresent([Find].self, forKey: .finds) ?? []
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(handle, forKey: .handle)
        try container.encodeIfPresent(appleUserId, forKey: .appleUserId)
        try container.encode(gemsUnearthed, forKey: .gemsUnearthed)
        try container.encode(firstFindsCount, forKey: .firstFindsCount)
        try container.encode(prospectorLevel, forKey: .prospectorLevel)
        try container.encode(finds, forKey: .finds)
    }
}

extension User {
    static let mock = User(
        id: UUID(),
        handle: "ryan",
        appleUserId: "mock.apple.id",
        gemsUnearthed: 7,
        firstFindsCount: 3,
        prospectorLevel: .prospector,
        finds: Find.mocks
    )
}
