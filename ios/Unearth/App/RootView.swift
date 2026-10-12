import SwiftUI

struct RootView: View {
    @State private var auth = AuthService()
    @State private var locationService = LocationService()

    var body: some View {
        Group {
            if auth.isAuthenticated, auth.hasCompletedOnboarding {
                HomeShellView(auth: auth, locationService: locationService)
            } else {
                OnboardingFlowView(auth: auth, locationService: locationService)
            }
        }
        .preferredColorScheme(.light)
        .tint(UnearthColor.green)
    }
}

#Preview("RootView") {
    RootView()
}
