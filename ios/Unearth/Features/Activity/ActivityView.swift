import SwiftUI

struct ActivityView: View {
    @State private var events: [ActivityEvent] = []
    @State private var isLoading = false
    @State private var loadError: String?
    @State private var hasLoadedOnce = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading, events.isEmpty {
                    ScreenStates.Loading(message: "Loading activity…")
                } else if let loadError, events.isEmpty, hasLoadedOnce {
                    ScreenStates.Error(message: loadError) {
                        Task { await load() }
                    }
                } else if events.isEmpty, hasLoadedOnce {
                    ScreenStates.Empty(
                        systemImage: "bell",
                        title: "No activity yet",
                        message: "Nothing yet. Unearth your first gem and updates will show up here."
                    )
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(events) { event in
                                HStack(alignment: .top, spacing: 12) {
                                    eventIcon(event.kind)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(event.message)
                                            .font(UnearthFont.body())
                                            .foregroundStyle(UnearthColor.ink)
                                            .bodyLineSpacing()
                                        Text(event.createdAt, style: .relative)
                                            .font(UnearthFont.bodySmall())
                                            .foregroundStyle(UnearthColor.inkSecondary)
                                    }
                                    Spacer(minLength: 0)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                Divider().overlay(UnearthColor.divider)
                            }
                        }
                    }
                    .overlay(alignment: .bottom) {
                        if let loadError, !events.isEmpty {
                            Text(loadError)
                                .font(UnearthFont.bodySmall())
                                .foregroundStyle(UnearthColor.amber)
                                .padding(8)
                                .background(UnearthColor.amberTint)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .padding(.bottom, 12)
                        }
                    }
                }
            }
            .background(UnearthColor.formBackground.ignoresSafeArea())
            .navigationTitle("Activity")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func eventIcon(_ kind: ActivityEventKind) -> some View {
        let (symbol, tint): (String, Color) = {
            switch kind {
            case .polished: return ("sparkles", UnearthColor.green)
            case .alsoFound: return ("person.2.fill", UnearthColor.amberPin)
            case .minedOut: return ("xmark.circle.fill", UnearthColor.inkSecondary)
            }
        }()
        return Image(systemName: symbol)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: 40, height: 40)
            .background(UnearthColor.greenTint.opacity(kind == .polished ? 1 : 0.6))
            .clipShape(Circle())
    }

    private func load() async {
        #if DEBUG
        if ScreenshotScene.isDemo {
            events = ActivityEvent.mocks
            isLoading = false
            hasLoadedOnce = true
            loadError = nil
            return
        }
        #endif
        isLoading = true
        loadError = nil
        defer {
            isLoading = false
            hasLoadedOnce = true
        }
        do {
            let response = try await APIClient.shared.activity()
            events = response.events
        } catch {
            loadError = error.localizedDescription
        }
    }
}

#Preview("ActivityView") {
    ActivityView()
}
