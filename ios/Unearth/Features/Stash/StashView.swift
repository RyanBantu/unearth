import SwiftUI

struct StashView: View {
    var gems: [Gem] = []
    var onOpenGem: (Gem) -> Void = { _ in }

    var body: some View {
        NavigationStack {
            Group {
                if gems.isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(gems) { gem in
                                GemCard(gem: gem) {
                                    onOpenGem(gem)
                                }
                                .padding(14)
                                .background(UnearthColor.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .strokeBorder(UnearthColor.border, lineWidth: 1)
                                }
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(.top, 8)
                        .padding(.bottom, 24)
                    }
                }
            }
            .background(UnearthColor.formBackground.ignoresSafeArea())
            .navigationTitle("Stash")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(UnearthColor.surface, for: .navigationBar)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bookmark")
                .font(.system(size: 36))
                .foregroundStyle(UnearthColor.green)
            Text("Your stash is empty. Tap the bookmark on any gem to save it.")
                .font(UnearthFont.body())
                .foregroundStyle(UnearthColor.inkSecondary)
                .multilineTextAlignment(.center)
                .bodyLineSpacing()
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("StashView") {
    StashView(gems: Gem.mockGems)
}

#Preview("StashView empty") {
    StashView(gems: [])
}
