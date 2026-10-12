import SwiftUI

struct StashView: View {
    var gems: [Gem] = []
    var isLoading: Bool = false
    var loadError: String? = nil
    var onOpenGem: (Gem) -> Void = { _ in }
    var onRefresh: (() async -> Void)? = nil

    var body: some View {
        NavigationStack {
            Group {
                if isLoading, gems.isEmpty {
                    ScreenStates.Loading(message: "Loading your stash…")
                } else if let loadError, gems.isEmpty {
                    ScreenStates.Error(message: loadError) {
                        Task { await onRefresh?() }
                    }
                } else if gems.isEmpty {
                    ScreenStates.Empty(
                        systemImage: "bookmark",
                        title: "Nothing stashed yet",
                        message: "Your stash is empty. Tap the bookmark on any gem to save it for later."
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            if let loadError {
                                Text(loadError)
                                    .font(UnearthFont.bodySmall())
                                    .foregroundStyle(UnearthColor.amber)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 16)
                            }
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
            .refreshable {
                await onRefresh?()
            }
        }
    }
}

#Preview("StashView") {
    StashView(gems: Gem.mockGems)
}

#Preview("StashView empty") {
    StashView(gems: [])
}

#Preview("StashView loading") {
    StashView(gems: [], isLoading: true)
}
