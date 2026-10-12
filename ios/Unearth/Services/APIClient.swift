import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case unauthorized
    case server(Int)
    case conflict([MatchCandidate])
    case decoding
    case network(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .unauthorized: return "Unauthorized"
        case .server(let code): return "Server error (\(code))"
        case .conflict: return "Possible duplicate gem"
        case .decoding: return "Failed to decode response"
        case .network(let error): return error.localizedDescription
        }
    }
}

// MARK: - Request / response DTOs (stubs)

struct AppleAuthBody: Encodable {
    var identityToken: String
    var authorizationCode: String
    var fullName: PersonNameComponentsDTO?
}

struct PersonNameComponentsDTO: Encodable {
    var givenName: String?
    var familyName: String?
}

struct AuthTokensResponse: Decodable {
    var accessToken: String
    var refreshToken: String
    var user: User
    var needsHandle: Bool?
}

struct RefreshBody: Encodable {
    var refreshToken: String
}

struct LogoutBody: Encodable {
    var refreshToken: String
}

struct HandleBody: Encodable {
    var handle: String
}

struct HandleAvailabilityResponse: Decodable {
    var available: Bool
}

struct CreateGemBody: Encodable {
    var name: String
    var category: String
    var lat: Double
    var lng: Double
    var description: String
    var liked: String?
    var disliked: String?
    var tags: [String]
    var applePlaceId: String?
    var googleMapsUrl: String?
    var address: String?
    var confirmedNew: Bool?
}

struct CreateFindBody: Encodable {
    var description: String
    var liked: String?
    var disliked: String?
    var tags: [String]
}

struct ReportBody: Encodable {
    var gemId: UUID?
    var findId: UUID?
    var reason: String
}

struct EmptyResponse: Decodable {}

actor APIClient {
    static let shared = APIClient()

    /// RELEASE always uses Render. DEBUG also uses Render unless `USE_LOCAL_API=1`.
    var baseURL: URL {
        #if DEBUG
        if ProcessInfo.processInfo.environment["USE_LOCAL_API"] == "1" {
            return URL(string: "http://localhost:3000")!
        }
        return URL(string: "https://unearth-1o4a.onrender.com")!
        #else
        return URL(string: "https://unearth-1o4a.onrender.com")!
        #endif
    }

    private var accessToken: String?
    private var refreshToken: String?
    private var isRefreshing = false

    private lazy var decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = ISO8601DateFormatter.fractional.date(from: string)
                ?? ISO8601DateFormatter.standard.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid date: \(string)"
            )
        }
        return decoder
    }()

    private lazy var encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    func setTokens(access: String?, refresh: String?) {
        accessToken = access
        refreshToken = refresh
    }

    func setAuthToken(_ token: String?) {
        accessToken = token
    }

    // MARK: - HTTP verbs

    func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try await request(path: path, method: "GET", bodyData: nil, query: query)
    }

    func post<T: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> T {
        let data = try encoder.encode(body)
        return try await request(path: path, method: "POST", bodyData: data)
    }

    func put<T: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> T {
        let data = try encoder.encode(body)
        return try await request(path: path, method: "PUT", bodyData: data)
    }

    func putEmpty(_ path: String) async throws {
        let _: EmptyResponse = try await request(
            path: path,
            method: "PUT",
            bodyData: nil,
            allowEmptyBody: true
        )
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(path: path, method: "DELETE", bodyData: nil)
    }

    func deleteEmpty(_ path: String) async throws {
        let _: EmptyResponse = try await request(
            path: path,
            method: "DELETE",
            bodyData: nil,
            allowEmptyBody: true
        )
    }

    // MARK: - Auth

    func authApple(_ body: AppleAuthBody) async throws -> AuthTokensResponse {
        try await post("/auth/apple", body: body)
    }

    /// DEBUG / staging only — requires `ALLOW_DEV_AUTH=true` on the server.
    func authDev(handle: String? = nil) async throws -> AuthTokensResponse {
        try await post("/auth/dev", body: DevAuthBody(handle: handle))
    }

    func refresh(refreshToken: String) async throws -> AuthTokensResponse {
        try await post("/auth/refresh", body: RefreshBody(refreshToken: refreshToken))
    }

    func logout(refreshToken: String) async throws {
        let data = try encoder.encode(LogoutBody(refreshToken: refreshToken))
        let _: EmptyResponse = try await request(
            path: "/auth/logout",
            method: "POST",
            bodyData: data,
            allowEmptyBody: true
        )
    }

    // MARK: - Me / handles

    func me() async throws -> User {
        try await get("/me")
    }

    func updateHandle(_ handle: String) async throws -> User {
        try await put("/me/handle", body: HandleBody(handle: handle))
    }

    func handleAvailable(_ handle: String) async throws -> HandleAvailabilityResponse {
        try await get("/handles/\(handle)/available")
    }

    func deleteAccount() async throws {
        try await deleteEmpty("/me")
    }

    // MARK: - Gems

    func gemsNearby(
        lat: Double,
        lng: Double,
        radiusM: Int = 5_000,
        category: String? = nil
    ) async throws -> GemsNearbyResponse {
        var query: [URLQueryItem] = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lng", value: String(lng)),
            URLQueryItem(name: "radius_m", value: String(radiusM)),
        ]
        if let category {
            query.append(URLQueryItem(name: "category", value: category))
        }
        return try await get("/gems/nearby", query: query)
    }

    func gemsMatch(
        lat: Double,
        lng: Double,
        name: String,
        category: String?,
        applePlaceId: String?
    ) async throws -> MatchResponse {
        var query: [URLQueryItem] = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lng", value: String(lng)),
            URLQueryItem(name: "name", value: name),
        ]
        if let category {
            query.append(URLQueryItem(name: "category", value: category))
        }
        if let applePlaceId {
            query.append(URLQueryItem(name: "applePlaceId", value: applePlaceId))
        }
        return try await get("/gems/match", query: query)
    }

    func gem(id: UUID) async throws -> Gem {
        let dto: APIGemDTO = try await get("/gems/\(id.uuidString)")
        return dto.toGem()
    }

    func createGem(_ body: CreateGemBody) async throws -> Gem {
        let response: CreateGemResponse = try await post("/gems", body: body)
        return response.toGem()
    }

    func createFind(gemId: UUID, body: CreateFindBody) async throws -> CreateFindResponse {
        try await post("/gems/\(gemId.uuidString)/finds", body: body)
    }

    // MARK: - Stash / activity / reports

    func stash() async throws -> StashResponse {
        try await get("/stash")
    }

    func addToStash(gemId: UUID) async throws {
        try await putEmpty("/stash/\(gemId.uuidString)")
    }

    func removeFromStash(gemId: UUID) async throws {
        try await deleteEmpty("/stash/\(gemId.uuidString)")
    }

    func activity() async throws -> ActivityResponse {
        try await get("/activity")
    }

    func report(_ body: ReportBody) async throws {
        let data = try encoder.encode(body)
        let _: EmptyResponse = try await request(
            path: "/reports",
            method: "POST",
            bodyData: data,
            allowEmptyBody: true
        )
    }

    // MARK: - Core request

    private func request<T: Decodable>(
        path: String,
        method: String,
        bodyData: Data?,
        query: [URLQueryItem] = [],
        allowEmptyBody: Bool = false,
        isRetry: Bool = false
    ) async throws -> T {
        guard var components = URLComponents(url: baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))), resolvingAgainstBaseURL: false) else {
            throw APIError.invalidURL
        }
        // Prefer relative path join that preserves leading slash segments
        if let url = URL(string: path, relativeTo: baseURL) {
            components = URLComponents(url: url, resolvingAgainstBaseURL: true) ?? components
        }
        if !query.isEmpty {
            components.queryItems = query
        }
        guard let url = components.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = bodyData

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.server(-1)
            }

            if http.statusCode == 401 {
                if !isRetry, let refreshed = await attemptRefresh() {
                    accessToken = refreshed.accessToken
                    refreshToken = refreshed.refreshToken
                    KeychainStore.accessToken = refreshed.accessToken
                    KeychainStore.refreshToken = refreshed.refreshToken
                    return try await self.request(
                        path: path,
                        method: method,
                        bodyData: bodyData,
                        query: query,
                        allowEmptyBody: allowEmptyBody,
                        isRetry: true
                    )
                }
                throw APIError.unauthorized
            }

            if http.statusCode == 409 {
                if let conflict = try? decoder.decode(DuplicateConflictError.self, from: data),
                   let candidates = conflict.candidates {
                    throw APIError.conflict(candidates.map { $0.toMatchCandidate() })
                }
                throw APIError.server(409)
            }

            guard (200..<300).contains(http.statusCode) else {
                throw APIError.server(http.statusCode)
            }

            if allowEmptyBody, data.isEmpty {
                if let empty = EmptyResponse() as? T { return empty }
            }

            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                if allowEmptyBody, let empty = EmptyResponse() as? T {
                    return empty
                }
                throw APIError.decoding
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.network(error)
        }
    }

    private func attemptRefresh() async -> AuthTokensResponse? {
        guard let token = refreshToken, !isRefreshing else { return nil }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let data = try encoder.encode(RefreshBody(refreshToken: token))
            let response: AuthTokensResponse = try await request(
                path: "/auth/refresh",
                method: "POST",
                bodyData: data,
                isRetry: true
            )
            return response
        } catch {
            return nil
        }
    }
}

private extension ISO8601DateFormatter {
    static let standard: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
