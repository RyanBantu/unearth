import SwiftUI

struct RootView: View {
    @State private var auth = AuthService()
    @State private var locationService = LocationService()

    var body: some View {
        Group {
            #if DEBUG
            if let scene = ScreenshotScene.current {
                screenshotScene(scene)
            } else {
                mainContent
            }
            #else
            mainContent
            #endif
        }
        .preferredColorScheme(.light)
        .tint(UnearthColor.green)
    }

    @ViewBuilder
    private var mainContent: some View {
        if auth.isAuthenticated, auth.hasCompletedOnboarding, !auth.needsTerms {
            HomeShellView(auth: auth, locationService: locationService)
        } else if auth.isAuthenticated, auth.hasCompletedOnboarding, auth.needsTerms {
            // Existing accounts that signed up before Terms — must agree before Dig.
            TermsAgreeView(auth: auth) {}
        } else {
            OnboardingFlowView(auth: auth, locationService: locationService)
        }
    }

    #if DEBUG
    @ViewBuilder
    private func screenshotScene(_ scene: ScreenshotScene) -> some View {
        switch scene {
        case .signin:
            SignInView(auth: auth, onSignedIn: {})
        case .handle:
            PickHandleView(auth: auth, onContinue: {})
        case .location:
            LocationPermissionView(locationService: locationService, onContinue: {})
        case .dig, .digList, .gem, .unearth, .stash, .activity, .profile, .share:
            HomeShellView(auth: auth, locationService: locationService)
        }
    }
    #endif
}

#Preview("RootView") {
    RootView()
}
