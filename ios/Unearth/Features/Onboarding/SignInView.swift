import AuthenticationServices
import SwiftUI

struct SignInView: View {
    var auth: AuthService
    var onSignedIn: () -> Void

    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 16) {
                // From Resources/Brand/unearth-logo.svg
                UnearthLogo(size: 96)

                Text("Unearth")
                    .font(UnearthFont.gemTitle(40))
                    .foregroundStyle(UnearthColor.ink)
                    .gemTitleLineHeight()

                Text("Find the places nobody's listed yet.")
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .multilineTextAlignment(.center)
                    .bodyLineSpacing()
                    .padding(.horizontal, 24)
            }

            Spacer()

            VStack(spacing: 12) {
                if let errorMessage {
                    Text(errorMessage)
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.amber)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }

                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    Task {
                        switch result {
                        case .success(let authorization):
                            if let credential = authorization.credential as? ASAuthorizationAppleIDCredential {
                                let ok = await auth.handleAppleSignIn(credential: credential)
                                if ok {
                                    errorMessage = nil
                                    onSignedIn()
                                } else {
                                    errorMessage = auth.lastError
                                        ?? "Sign in failed. Check Render APPLE_* env vars."
                                }
                            }
                        case .failure(let error):
                            errorMessage = error.localizedDescription
                        }
                    }
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                #if DEBUG
                Button("Continue with mock (DEBUG)") {
                    auth.signInWithMockUser()
                    // Give the async mock auth a moment; RootView observes auth state.
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                        if auth.isAuthenticated {
                            onSignedIn()
                        } else {
                            errorMessage = auth.lastError
                                ?? "Mock auth failed. Set ALLOW_DEV_AUTH=true on Render."
                        }
                    }
                }
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.inkSecondary)
                #endif
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [UnearthColor.greenTint, UnearthColor.formBackground, UnearthColor.surface],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        )
    }
}

#Preview("SignInView") {
    SignInView(auth: AuthService(), onSignedIn: {})
}
