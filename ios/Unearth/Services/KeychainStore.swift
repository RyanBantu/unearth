import Foundation
import Security

enum KeychainStore {
    private static let service = "com.ryanbantu.unearth"

    enum Keys {
        static let accessToken = "auth.accessToken"
        static let refreshToken = "auth.refreshToken"
        /// Legacy single-token key — migrated on read.
        static let legacyToken = "auth.token"
        static let userJSON = "auth.user"
        static let handle = "auth.handle"
    }

    static func set(_ value: String, forKey key: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        SecItemAdd(add as CFDictionary, nil)
    }

    static func string(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func remove(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Tokens

    static var accessToken: String? {
        get {
            if let token = string(forKey: Keys.accessToken) { return token }
            // Migrate legacy key
            if let legacy = string(forKey: Keys.legacyToken) {
                set(legacy, forKey: Keys.accessToken)
                remove(forKey: Keys.legacyToken)
                return legacy
            }
            return nil
        }
        set {
            if let newValue {
                set(newValue, forKey: Keys.accessToken)
            } else {
                remove(forKey: Keys.accessToken)
                remove(forKey: Keys.legacyToken)
            }
        }
    }

    static var refreshToken: String? {
        get { string(forKey: Keys.refreshToken) }
        set {
            if let newValue {
                set(newValue, forKey: Keys.refreshToken)
            } else {
                remove(forKey: Keys.refreshToken)
            }
        }
    }

    static func clearTokens() {
        accessToken = nil
        refreshToken = nil
    }
}
