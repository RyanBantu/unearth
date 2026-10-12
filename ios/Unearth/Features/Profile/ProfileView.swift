import SwiftUI

struct ProfileView: View {
    var auth: AuthService
    var onSignOut: () -> Void = {}
    var onDeleteAccount: (() async -> Void)? = nil

    @State private var user: User
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var isLoading = false
    @State private var loadError: String?

    init(
        auth: AuthService,
        onSignOut: @escaping () -> Void = {},
        onDeleteAccount: (() async -> Void)? = nil
    ) {
        self.auth = auth
        self.onSignOut = onSignOut
        self.onDeleteAccount = onDeleteAccount
        _user = State(initialValue: auth.currentUser ?? .mock)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    header
                    stats
                    findsSection
                    settingsSection
                    Spacer(minLength: 40)
                }
            }
            .background(UnearthColor.formBackground.ignoresSafeArea())
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await reload() }
            .task { await reload() }
            .alert("Delete account?", isPresented: $showDeleteConfirm) {
                Button("Delete account", role: .destructive) {
                    Task {
                        isDeleting = true
                        await onDeleteAccount?()
                        isDeleting = false
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes your account, finds, and stash, and revokes Sign in with Apple. This cannot be undone.")
            }
        }
    }

    private var header: some View {
        VStack(spacing: 12) {
            Avatar(handle: user.handle, size: 72)
            Text("@\(user.handle)")
                .font(UnearthFont.sheetTitle())
                .foregroundStyle(UnearthColor.ink)
            Badge(text: user.prospectorLevelLabel, variant: .polished)
            if isLoading {
                ProgressView()
                    .scaleEffect(0.8)
            }
            if let loadError {
                Text(loadError)
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.amber)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 24)
    }

    private var stats: some View {
        VStack(spacing: 8) {
            Text(user.gemsUnearthedLabel)
                .font(UnearthFont.gemTitle(28))
                .foregroundStyle(UnearthColor.ink)
                .multilineTextAlignment(.center)
            Text("\(user.firstFindsCount) First finds")
                .font(UnearthFont.body())
                .foregroundStyle(UnearthColor.inkSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 16)
    }

    private var findsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your finds")
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)
                .padding(.horizontal, 16)

            if user.finds.isEmpty {
                Text("No finds yet. Unearth a gem to get started.")
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .padding(.horizontal, 16)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(user.finds) { find in
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(find.gemName)
                                    .font(UnearthFont.cardTitle(16))
                                    .foregroundStyle(UnearthColor.ink)
                                if let note = find.note, !note.isEmpty {
                                    Text(note)
                                        .font(UnearthFont.bodySmall())
                                        .foregroundStyle(UnearthColor.inkSecondary)
                                        .lineLimit(2)
                                }
                                HStack(spacing: 6) {
                                    if find.isFirstFind {
                                        Badge(text: "First find", variant: .rare)
                                    }
                                    Text(find.createdAt, style: .date)
                                        .font(UnearthFont.bodySmall())
                                        .foregroundStyle(UnearthColor.inkTertiary)
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        Divider().overlay(UnearthColor.divider)
                    }
                }
                .background(UnearthColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .padding(.horizontal, 16)
            }
        }
    }

    private var settingsSection: some View {
        VStack(spacing: 12) {
            Text("Settings")
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)
                .frame(maxWidth: .infinity, alignment: .leading)

            OutlineButton(title: "Sign out") {
                onSignOut()
            }

            Button {
                showDeleteConfirm = true
            } label: {
                Text(isDeleting ? "Deleting…" : "Delete account")
                    .font(UnearthFont.button())
                    .foregroundStyle(UnearthColor.amber)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
            }
            .buttonStyle(.plain)
            .disabled(isDeleting)
        }
        .padding(.horizontal, 16)
    }

    private func reload() async {
        isLoading = true
        loadError = nil
        defer { isLoading = false }
        do {
            let me = try await APIClient.shared.me()
            user = me
            auth.applyLoadedUser(me)
        } catch {
            loadError = error.localizedDescription
            if let cached = auth.currentUser {
                user = cached
            }
        }
    }
}

#Preview("ProfileView") {
    ProfileView(auth: AuthService())
}
