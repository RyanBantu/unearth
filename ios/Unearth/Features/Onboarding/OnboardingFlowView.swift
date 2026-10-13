import SwiftUI

enum OnboardingStep: Equatable {
    case signIn
    case terms
    case handle
    case location
}

struct OnboardingFlowView: View {
    var auth: AuthService
    var locationService: LocationService

    @State private var step: OnboardingStep

    init(auth: AuthService, locationService: LocationService) {
        self.auth = auth
        self.locationService = locationService
        // Resume mid-flow after process death / return to app.
        if auth.isAuthenticated {
            if auth.needsTerms || !(auth.currentUser?.hasAgreedToTerms ?? false) {
                _step = State(initialValue: .terms)
            } else if auth.needsHandle || (auth.currentUser?.handle.isEmpty ?? true) {
                _step = State(initialValue: .handle)
            } else {
                _step = State(initialValue: .location)
            }
        } else {
            _step = State(initialValue: .signIn)
        }
    }

    var body: some View {
        Group {
            switch step {
            case .signIn:
                SignInView(auth: auth) {
                    advanceAfterSignIn()
                }
            case .terms:
                TermsAgreeView(auth: auth) {
                    if auth.needsHandle || (auth.currentUser?.handle.isEmpty ?? true) {
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

    private func advanceAfterSignIn() {
        if auth.hasCompletedOnboarding, !(auth.needsTerms), auth.currentUser != nil {
            return
        }
        if auth.needsTerms || !(auth.currentUser?.hasAgreedToTerms ?? false) {
            step = .terms
        } else if auth.needsHandle || (auth.currentUser?.handle.isEmpty ?? true) {
            step = .handle
        } else {
            step = .location
        }
    }
}

#Preview("OnboardingFlowView") {
    OnboardingFlowView(auth: AuthService(), locationService: LocationService())
}
