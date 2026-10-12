import AuthenticationServices
import SwiftUI

struct SignInView: View {
    var auth: AuthService
    var onSignedIn: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 16) {
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
                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    Task {
                        switch result {
                        case .success(let authorization):
                            if let credential = authorization.credential as? ASAuthorizationAppleIDCredential {
                                await auth.handleAppleSignIn(credential: credential)
                                onSignedIn()
                            }
                        case .failure(let error):
                            // Surface via toast when wired; keep console for now.
                            print("Sign in with Apple failed: \(error.localizedDescription)")
                        }
                    }
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                #if DEBUG
                Button("Continue with mock (DEBUG)") {
                    auth.signInWithMockUser()
                    onSignedIn()
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
