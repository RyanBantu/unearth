import Foundation

enum ActivityEventKind: String, Codable, Hashable {
    case polished
    case alsoFound = "also_found"
    case minedOut = "mined_out"
}

struct ActivityEvent: Identifiable, Hashable, Codable {
    let id: UUID
    var kind: ActivityEventKind
    var gemName: String
    var actorHandle: String?
    var createdAt: Date
    var message: String

    enum CodingKeys: String, CodingKey {
        case id, gemName, actorHandle, createdAt, message
        case kind = "type"
    }

    init(
        id: UUID = UUID(),
        kind: ActivityEventKind,
        gemName: String,
        actorHandle: String? = nil,
        createdAt: Date,
        message: String
    ) {
        self.id = id
        self.kind = kind
        self.gemName = gemName
        self.actorHandle = actorHandle
        self.createdAt = createdAt
        self.message = message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        kind = try container.decode(ActivityEventKind.self, forKey: .kind)
        gemName = try container.decode(String.self, forKey: .gemName)
        actorHandle = try container.decodeIfPresent(String.self, forKey: .actorHandle)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        if let message = try container.decodeIfPresent(String.self, forKey: .message) {
            self.message = message
        } else {
            self.message = Self.defaultMessage(kind: kind, gemName: gemName, actorHandle: actorHandle)
        }
        if let decodedId = try container.decodeIfPresent(UUID.self, forKey: .id) {
            id = decodedId
        } else {
            let seed = "\(kind.rawValue)|\(gemName)|\(actorHandle ?? "")|\(createdAt.timeIntervalSince1970)"
            id = Self.stableId(from: seed)
        }
    }

    /// Deterministic UUID so list rows stay stable across refreshes when the API omits `id`.
    static func stableId(from seed: String) -> UUID {
        var hash: UInt64 = 5381
        for byte in seed.utf8 {
            hash = ((hash << 5) &+ hash) &+ UInt64(byte)
        }
        let a = UInt32(truncatingIfNeeded: hash)
        let b = UInt32(truncatingIfNeeded: hash >> 32)
        let string = String(format: "%08x-0000-4000-8000-%012x", a, UInt64(b))
        return UUID(uuidString: string) ?? UUID()
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(kind, forKey: .kind)
        try container.encode(gemName, forKey: .gemName)
        try container.encodeIfPresent(actorHandle, forKey: .actorHandle)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(message, forKey: .message)
    }

    static func defaultMessage(kind: ActivityEventKind, gemName: String, actorHandle: String?) -> String {
        switch kind {
        case .polished:
            return "Your gem \(gemName) was polished"
        case .alsoFound:
            let handle = actorHandle.map { $0.hasPrefix("@") ? $0 : "@\($0)" } ?? "Someone"
            return "\(handle) also found \(gemName)"
        case .minedOut:
            return "\(gemName) is now mined out"
        }
    }
}

extension ActivityEvent {
    static let mocks: [ActivityEvent] = [
        ActivityEvent(
            kind: .polished,
            gemName: "Hidden Ramen Alley",
            createdAt: Date().addingTimeInterval(-2_400),
            message: "Your gem Hidden Ramen Alley was polished"
        ),
        ActivityEvent(
            kind: .alsoFound,
            gemName: "Fog Ridge Lookout",
            actorHandle: "maya",
            createdAt: Date().addingTimeInterval(-8_000),
            message: "@maya also found Fog Ridge Lookout"
        ),
        ActivityEvent(
            kind: .minedOut,
            gemName: "Quiet Cup",
            createdAt: Date().addingTimeInterval(-20_000),
            message: "Quiet Cup is now mined out"
        ),
    ]
}
