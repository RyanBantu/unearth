import SwiftUI

enum OnboardingStep: Equatable {
    case signIn
    case handle
    case location
}

struct OnboardingFlowView: View {
    var auth: AuthService
    var locationService: LocationService

    @State private var step: OnboardingStep = .signIn

    var body: some View {
        Group {
            switch step {
            case .signIn:
                SignInView(auth: auth) {
                    if auth.hasCompletedOnboarding, auth.currentUser != nil {
                        // Returning / mock user — RootView will swap to Dig
                    } else if auth.needsHandle || (auth.currentUser?.handle.isEmpty ?? true) {
                        step = .handle
                    } else {
                        step = .location
                    }
                }
            case .handle:
                PickHandleView(auth: auth) {
                    step = .location
                }
            case .location:
                LocationPermissionView(locationService: locationService) {
                    auth.completeOnboarding()
                }
            }
        }
        .animation(.easeInOut(duration: 0.25), value: step)
    }
}

#Preview("OnboardingFlowView") {
    OnboardingFlowView(auth: AuthService(), locationService: LocationService())
}
