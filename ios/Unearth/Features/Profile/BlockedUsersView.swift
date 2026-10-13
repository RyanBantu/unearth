import SwiftUI

struct BlockedUser: Identifiable, Hashable, Decodable {
    var id: UUID
    var handle: String
    var displayName: String?
    var blockedAt: Date?
}

struct BlockedUsersResponse: Decodable {
    var blocks: [BlockedUser]
}

struct BlockedUsersView: View {
    @State private var blocks: [BlockedUser] = []
    @State private var isLoading = false
    @State private var loadError: String?
    @State private var toastMessage: String?

    var body: some View {
        Group {
            if isLoading, blocks.isEmpty {
                ScreenStates.Loading(message: "Loading blocked users…")
            } else if let loadError, blocks.isEmpty {
                ScreenStates.Error(message: loadError) {
                    Task { await reload() }
                }
            } else if blocks.isEmpty {
                ScreenStates.Empty(
                    systemImage: "hand.raised",
                    title: "No blocked users",
                    message: "When you block someone, they appear here. You can unblock anytime."
                )
            } else {
                List {
                    ForEach(blocks) { user in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("@\(user.handle)")
                                    .font(UnearthFont.cardTitle(16))
                                    .foregroundStyle(UnearthColor.ink)
                                if let blockedAt = user.blockedAt {
                                    Text(blockedAt, style: .date)
                                        .font(UnearthFont.bodySmall())
                                        .foregroundStyle(UnearthColor.inkSecondary)
                                }
                            }
                            Spacer()
                            Button("Unblock") {
                                Task { await unblock(user) }
                            }
                            .font(UnearthFont.button(14))
                            .foregroundStyle(UnearthColor.green)
                        }
                        .listRowBackground(UnearthColor.surface)
                    }
                }
                .listStyle(.plain)
            }
        }
        .background(UnearthColor.formBackground.ignoresSafeArea())
        .navigationTitle("Blocked users")
        .navigationBarTitleDisplayMode(.inline)
        .toast($toastMessage)
        .task { await reload() }
        .refreshable { await reload() }
    }

    private func reload() async {
        isLoading = true
        loadError = nil
        defer { isLoading = false }
        do {
            let response: BlockedUsersResponse = try await APIClient.shared.get("/me/blocks")
            blocks = response.blocks
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func unblock(_ user: BlockedUser) async {
        do {
            try await APIClient.shared.unblockUser(id: user.id)
            blocks.removeAll { $0.id == user.id }
            toastMessage = "Unblocked @\(user.handle)"
        } catch {
            toastMessage = error.localizedDescription
        }
    }
}

#Preview("BlockedUsersView") {
    NavigationStack {
        BlockedUsersView()
    }
}
