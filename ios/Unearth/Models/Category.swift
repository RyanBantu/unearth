import SwiftUI

enum Category: String, Codable, CaseIterable, Identifiable, Hashable {
    case food
    case cafe
    case viewpoint
    case trail
    case shop
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .food: return "Food"
        case .cafe: return "Café"
        case .viewpoint: return "Viewpoint"
        case .trail: return "Trail"
        case .shop: return "Shop"
        case .other: return "Other"
        }
    }

    /// Dig filter chip labels (4.1).
    var digChipTitle: String {
        switch self {
        case .food: return "Food"
        case .cafe: return "Cafés"
        case .viewpoint: return "Viewpoints"
        case .trail: return "Trails"
        case .shop: return "Shops"
        case .other: return "Other"
        }
    }

    /// Categories shown as Dig filter chips (excludes `.other`).
    static var digFilters: [Category] {
        [.food, .cafe, .viewpoint, .trail, .shop]
    }

    var systemImage: String {
        switch self {
        case .food: return "fork.knife"
        case .cafe: return "cup.and.saucer"
        case .viewpoint: return "mountain.2"
        case .trail: return "figure.hiking"
        case .shop: return "bag"
        case .other: return "sparkles"
        }
    }

    var pinColor: Color {
        switch self {
        case .food, .cafe: return UnearthColor.green
        default: return UnearthColor.amberPin
        }
    }
}
