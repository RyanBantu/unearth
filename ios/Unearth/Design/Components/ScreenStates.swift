import SwiftUI

/// Shared empty / loading / error chrome used across Dig, Stash, Activity, Profile, and Gem detail.
enum ScreenStates {
    struct Loading: View {
        var message: String = "Loading…"

        var body: some View {
            VStack(spacing: 14) {
                ProgressView()
                Text(message)
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(24)
        }
    }

    struct Empty: View {
        var systemImage: String
        var title: String
        var message: String
        var actionTitle: String? = nil
        var action: (() -> Void)? = nil

        var body: some View {
            VStack(spacing: 14) {
                Image(systemName: systemImage)
                    .font(.system(size: 36))
                    .foregroundStyle(UnearthColor.green)
                Text(title)
                    .font(UnearthFont.cardTitle())
                    .foregroundStyle(UnearthColor.ink)
                    .multilineTextAlignment(.center)
                Text(message)
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .multilineTextAlignment(.center)
                    .bodyLineSpacing()
                    .padding(.horizontal, 28)
                if let actionTitle, let action {
                    Button(actionTitle, action: action)
                        .font(UnearthFont.button())
                        .foregroundStyle(UnearthColor.green)
                        .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(24)
        }
    }

    struct Error: View {
        var message: String
        var retryTitle: String = "Try again"
        var retry: (() -> Void)? = nil

        var body: some View {
            VStack(spacing: 14) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 36))
                    .foregroundStyle(UnearthColor.amber)
                Text("Something went wrong")
                    .font(UnearthFont.cardTitle())
                    .foregroundStyle(UnearthColor.ink)
                Text(message)
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .multilineTextAlignment(.center)
                    .bodyLineSpacing()
                    .padding(.horizontal, 28)
                if let retry {
                    Button(retryTitle, action: retry)
                        .font(UnearthFont.button())
                        .foregroundStyle(UnearthColor.green)
                        .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(24)
        }
    }
}

/// Canonical legal / policy URLs (hosted on the API for App Store Connect).
enum UnearthLinks {
    static let privacyPolicy = URL(string: "https://unearth-1o4a.onrender.com/privacy")!
    static let postingGuidelines = URL(string: "https://unearth-1o4a.onrender.com/guidelines")!
}

#Preview("ScreenStates") {
    VStack {
        ScreenStates.Loading()
        ScreenStates.Empty(
            systemImage: "bookmark",
            title: "Nothing stashed",
            message: "Tap the bookmark on any gem to save it."
        )
        ScreenStates.Error(message: "Network unavailable") {}
    }
}
