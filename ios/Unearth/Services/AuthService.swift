import AuthenticationServices
import Foundation

@Observable
@MainActor
final class AuthService {
    private enum DefaultsKeys {
        static let onboardingComplete = "auth.onboardingComplete"
    }

    private(set) var currentUser: User?
    private(set) var isAuthenticated = false
    private(set) var hasCompletedOnboarding = false
    private(set) var pendingAppleUserId: String?
    private(set) var needsHandle = false

    init() {
        restoreSession()
    }

    func restoreSession() {
        hasCompletedOnboarding = UserDefaults.standard.bool(forKey: DefaultsKeys.onboardingComplete)
        let access = KeychainStore.accessToken
        let refresh = KeychainStore.refreshToken
        if let access {
            Task {
                await APIClient.shared.setTokens(access: access, refresh: refresh)
            }
            if let data = KeychainStore.string(forKey: KeychainStore.Keys.userJSON)?.data(using: .utf8),
               let user = try? JSONDecoder().decode(User.self, from: data) {
                currentUser = user
                isAuthenticated = true
            }
            // Refresh profile from API when possible
            Task { await refreshMe() }
        }
        #if DEBUG
        if currentUser == nil, ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1" {
            currentUser = .mock
            isAuthenticated = true
            hasCompletedOnboarding = true
        }
        #endif
    }

    func handleAppleSignIn(credential: ASAuthorizationAppleIDCredential) async {
        let userId = credential.user
        pendingAppleUserId = userId

        let identityToken = credential.identityToken.flatMap { String(data: $0, encoding: .utf8) }
        let authCode = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }

        if let identityToken, let authCode {
            do {
                let fullName: PersonNameComponentsDTO? = {
                    guard let name = credential.fullName else { return nil }
                    return PersonNameComponentsDTO(
                        givenName: name.givenName,
                        familyName: name.familyName
                    )
                }()
                let response = try await APIClient.shared.authApple(
                    AppleAuthBody(
                        identityToken: identityToken,
                        authorizationCode: authCode,
                        fullName: fullName
                    )
                )
                storeTokens(access: response.accessToken, refresh: response.refreshToken)
                await APIClient.shared.setTokens(access: response.accessToken, refresh: response.refreshToken)
                persist(user: response.user)
                isAuthenticated = true
                needsHandle = response.needsHandle ?? (response.user.handle.isEmpty)
                if !needsHandle {
                    hasCompletedOnboarding = true
                    UserDefaults.standard.set(true, forKey: DefaultsKeys.onboardingComplete)
                }
                return
            } catch {
                // Fall through to local session when API unreachable
            }
        }

        // Local fallback when backend is unavailable
        let token = "debug.\(userId)"
        storeTokens(access: token, refresh: nil)
        await APIClient.shared.setAuthToken(token)
        isAuthenticated = true

        if let existingHandle = KeychainStore.string(forKey: KeychainStore.Keys.handle), !existingHandle.isEmpty {
            let user = User(
                id: UUID(),
                handle: existingHandle,
                appleUserId: userId,
                gemsUnearthed: 0,
                firstFindsCount: 0,
                prospectorLevel: .digger
            )
            persist(user: user)
            needsHandle = false
            hasCompletedOnboarding = true
            UserDefaults.standard.set(true, forKey: DefaultsKeys.onboardingComplete)
        } else {
            needsHandle = true
        }
    }

    func completeHandle(_ handle: String) async {
        let cleaned = handle.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !cleaned.isEmpty else { return }

        do {
            let user = try await APIClient.shared.updateHandle(cleaned)
            KeychainStore.set(cleaned, forKey: KeychainStore.Keys.handle)
            persist(user: user)
            needsHandle = false
            isAuthenticated = true
            return
        } catch {
            // Local fallback
        }

        KeychainStore.set(cleaned, forKey: KeychainStore.Keys.handle)
        let user = User(
            id: currentUser?.id ?? UUID(),
            handle: cleaned,
            appleUserId: pendingAppleUserId ?? currentUser?.appleUserId,
            gemsUnearthed: currentUser?.gemsUnearthed ?? 0,
            firstFindsCount: currentUser?.firstFindsCount ?? 0,
            prospectorLevel: currentUser?.prospectorLevel ?? .digger,
            finds: currentUser?.finds ?? []
        )
        persist(user: user)
        needsHandle = false
        isAuthenticated = true
    }

    /// Sync availability check; falls back to local regex-only when API fails.
    func isHandleAvailable(_ handle: String) async -> Bool? {
        let cleaned = handle.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard cleaned.range(of: "^[a-z0-9_]{3,20}$", options: .regularExpression) != nil else {
            return nil
        }
        do {
            let response = try await APIClient.shared.handleAvailable(cleaned)
            return response.available
        } catch {
            return true // optimistic when offline
        }
    }

    func completeOnboarding() {
        hasCompletedOnboarding = true
        UserDefaults.standard.set(true, forKey: DefaultsKeys.onboardingComplete)
    }

    /// DEBUG helper — prefers live `/auth/dev` (when ALLOW_DEV_AUTH=true), else local mock.
    func signInWithMockUser() {
        Task {
            do {
                let response = try await APIClient.shared.authDev(handle: "devuser")
                storeTokens(access: response.accessToken, refresh: response.refreshToken)
                await APIClient.shared.setTokens(
                    access: response.accessToken,
                    refresh: response.refreshToken
                )
                persist(user: response.user)
                isAuthenticated = true
                needsHandle = response.needsHandle ?? response.user.handle.isEmpty
                if !needsHandle {
                    hasCompletedOnboarding = true
                    UserDefaults.standard.set(true, forKey: DefaultsKeys.onboardingComplete)
                }
            } catch {
                let user = User.mock
                storeTokens(access: "debug.mock", refresh: "debug.refresh")
                KeychainStore.set(user.handle, forKey: KeychainStore.Keys.handle)
                persist(user: user)
                isAuthenticated = true
                needsHandle = false
                hasCompletedOnboarding = true
                UserDefaults.standard.set(true, forKey: DefaultsKeys.onboardingComplete)
                await APIClient.shared.setTokens(access: "debug.mock", refresh: "debug.refresh")
            }
        }
    }

    func signOut() {
        let refresh = KeychainStore.refreshToken
        if let refresh {
            Task {
                try? await APIClient.shared.logout(refreshToken: refresh)
            }
        }
        clearSession()
    }

    func deleteAccount() async {
        do {
            try await APIClient.shared.deleteAccount()
        } catch {
            // Still clear local session
        }
        clearSession()
    }

    func refreshMe() async {
        do {
            let user = try await APIClient.shared.me()
            persist(user: user)
            isAuthenticated = true
        } catch {
            // Keep cached user
        }
    }

    // MARK: - Private

    private func storeTokens(access: String, refresh: String?) {
        KeychainStore.accessToken = access
        KeychainStore.refreshToken = refresh
    }

    private func clearSession() {
        KeychainStore.clearTokens()
        KeychainStore.remove(forKey: KeychainStore.Keys.userJSON)
        KeychainStore.remove(forKey: KeychainStore.Keys.handle)
        UserDefaults.standard.set(false, forKey: DefaultsKeys.onboardingComplete)
        currentUser = nil
        isAuthenticated = false
        hasCompletedOnboarding = false
        pendingAppleUserId = nil
        needsHandle = false
        Task { await APIClient.shared.setTokens(access: nil, refresh: nil) }
    }

    private func persist(user: User) {
        currentUser = user
        if let data = try? JSONEncoder().encode(user),
           let json = String(data: data, encoding: .utf8) {
            KeychainStore.set(json, forKey: KeychainStore.Keys.userJSON)
        }
        if !user.handle.isEmpty {
            KeychainStore.set(user.handle, forKey: KeychainStore.Keys.handle)
        }
    }
}
