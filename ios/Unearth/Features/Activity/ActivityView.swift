import SwiftUI

struct ActivityView: View {
    var events: [ActivityEvent] = ActivityEvent.mocks

    var body: some View {
        NavigationStack {
            Group {
                if events.isEmpty {
                    emptyState
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
                }
            }
            .background(UnearthColor.formBackground.ignoresSafeArea())
            .navigationTitle("Activity")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bell")
                .font(.system(size: 36))
                .foregroundStyle(UnearthColor.green)
            Text("Nothing yet. Unearth your first gem.")
                .font(UnearthFont.body())
                .foregroundStyle(UnearthColor.inkSecondary)
                .multilineTextAlignment(.center)
                .bodyLineSpacing()
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
}

#Preview("ActivityView") {
    ActivityView()
}

#Preview("ActivityView empty") {
    ActivityView(events: [])
}
