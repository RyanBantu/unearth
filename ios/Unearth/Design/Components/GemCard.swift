import CoreLocation
import SwiftUI

struct GemCard: View {
    let gem: Gem
    var userLocation: CLLocation? = nil
    var showsBadges: Bool = true
    var action: (() -> Void)? = nil

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(UnearthColor.greenTint)
                        .frame(width: 72, height: 72)
                    Image(systemName: gem.category.systemImage)
                        .font(.system(size: 30))
                        .foregroundStyle(UnearthColor.green)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(gem.name)
                        .font(UnearthFont.cardTitle())
                        .foregroundStyle(UnearthColor.ink)
                        .multilineTextAlignment(.leading)

                    Text(gem.subtitle(from: userLocation))
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.inkSecondary)

                    if showsBadges {
                        HStack(spacing: 6) {
                            ForEach(gem.statusBadges, id: \.self) { status in
                                Badge(
                                    text: status.shortBadgeText,
                                    variant: .from(status: status)
                                )
                            }
                            if gem.showsVoteScore {
                                HStack(spacing: 3) {
                                    Image(systemName: "hand.thumbsup")
                                        .font(.system(size: 11, weight: .semibold))
                                    Text("\(gem.netScore)")
                                        .font(UnearthFont.badge(12))
                                }
                                .foregroundStyle(UnearthColor.inkSecondary)
                            }
                        }
                    }
                }

                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}

#Preview("GemCard") {
    GemCard(
        gem: Gem.mockGems[0],
        userLocation: CLLocation(latitude: 37.7749, longitude: -122.4194)
    )
    .padding()
}
