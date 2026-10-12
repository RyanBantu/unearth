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
    /// Last auth error to show in the UI (e.g. Render missing APPLE_* keys).
    private(set) var lastError: String?

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
        if currentUser == nil,
           ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1"
            || ProcessInfo.processInfo.arguments.contains("-screenshotDemo") {
            currentUser = .mock
            isAuthenticated = true
            hasCompletedOnboarding = true
        }
        #endif
    }

    /// Returns `true` only when the server accepted Sign in with Apple.
    @discardableResult
    func handleAppleSignIn(credential: ASAuthorizationAppleIDCredential) async -> Bool {
        lastError = nil
        let userId = credential.user
        pendingAppleUserId = userId

        guard
            let identityToken = credential.identityToken.flatMap({ String(data: $0, encoding: .utf8) }),
            let authCode = credential.authorizationCode.flatMap({ String(data: $0, encoding: .utf8) })
        else {
            lastError = "Apple did not return a token. Try again."
            return false
        }

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
            needsHandle = response.needsHandle ?? response.user.handle.isEmpty
            if !needsHandle {
                hasCompletedOnboarding = true
                UserDefaults.standard.set(true, forKey: DefaultsKeys.onboardingComplete)
            }
            return true
        } catch {
            lastError = error.localizedDescription
            print("Sign in with Apple API failed: \(error)")
            return false
        }
    }

    /// Returns `true` when the server saved the handle.
    @discardableResult
    func completeHandle(_ handle: String) async -> Bool {
        lastError = nil
        let cleaned = handle.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !cleaned.isEmpty else { return false }

        do {
            let user = try await APIClient.shared.updateHandle(cleaned)
            KeychainStore.set(cleaned, forKey: KeychainStore.Keys.handle)
            persist(user: user)
            needsHandle = false
            isAuthenticated = true
            hasCompletedOnboarding = true
            UserDefaults.standard.set(true, forKey: DefaultsKeys.onboardingComplete)
            return true
        } catch {
            lastError = error.localizedDescription
            print("Handle update failed: \(error)")
            return false
        }
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
                lastError = error.localizedDescription
                print("Dev auth failed: \(error)")
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

    /// Update in-memory + keychain user after Profile (or another screen) loads `/me`.
    func applyLoadedUser(_ user: User) {
        persist(user: user)
        isAuthenticated = true
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
