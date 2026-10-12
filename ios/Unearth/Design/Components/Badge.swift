import SwiftUI

enum BadgeVariant {
    case neutral
    case polished
    case rare
    case uncut
    case minedOut

    var background: Color {
        switch self {
        case .neutral: return UnearthColor.neutralChip
        case .polished: return UnearthColor.greenTint
        case .rare: return UnearthColor.amberTint
        case .uncut: return UnearthColor.neutralChip
        case .minedOut: return UnearthColor.formBackground
        }
    }

    var foreground: Color {
        switch self {
        case .neutral: return UnearthColor.inkSecondary
        case .polished: return UnearthColor.green
        case .rare: return UnearthColor.amberDeep
        case .uncut: return UnearthColor.inkTertiary
        case .minedOut: return UnearthColor.inkSecondary
        }
    }

    static func from(status: GemStatus) -> BadgeVariant {
        switch status {
        case .uncut: return .uncut
        case .polished: return .polished
        case .rare: return .rare
        case .minedOut: return .minedOut
        }
    }

    /// Short status chip text (no find count) for Gem detail badge rows.
    static func shortLabel(for status: GemStatus) -> String {
        status.shortBadgeText
    }
}

struct Badge: View {
    let text: String
    var variant: BadgeVariant = .neutral

    var body: some View {
        Text(text)
            .font(UnearthFont.badge())
            .foregroundStyle(variant.foreground)
            .padding(.vertical, 4)
            .padding(.horizontal, 8)
            .background(variant.background)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

#Preview("Badge") {
    HStack(spacing: 8) {
        Badge(text: "Uncut · 1 find", variant: .uncut)
        Badge(text: "Polished · 3 finds", variant: .polished)
        Badge(text: "Rare · 12 finds", variant: .rare)
        Badge(text: "Mined out · 28 finds", variant: .minedOut)
    }
    .padding()
}
