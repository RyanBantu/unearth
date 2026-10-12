import SwiftUI

struct ProfileView: View {
    var auth: AuthService
    var onSignOut: () -> Void = {}
    var onDeleteAccount: (() async -> Void)? = nil

    @State private var user: User?
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var isLoading = false
    @State private var loadError: String?
    @State private var hasLoadedOnce = false

    init(
        auth: AuthService,
        onSignOut: @escaping () -> Void = {},
        onDeleteAccount: (() async -> Void)? = nil
    ) {
        self.auth = auth
        self.onSignOut = onSignOut
        self.onDeleteAccount = onDeleteAccount
        _user = State(initialValue: auth.currentUser)
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading, user == nil {
                    ScreenStates.Loading(message: "Loading profile…")
                } else if let loadError, user == nil, hasLoadedOnce {
                    ScreenStates.Error(message: loadError) {
                        Task { await reload() }
                    }
                } else if let user {
                    profileContent(user)
                } else {
                    ScreenStates.Loading(message: "Loading profile…")
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

    private func profileContent(_ user: User) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                header(user)
                if let loadError {
                    Text(loadError)
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.amber)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }
                stats(user)
                findsSection(user)
                settingsSection
                Spacer(minLength: 40)
            }
        }
    }

    private func header(_ user: User) -> some View {
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
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 24)
    }

    private func stats(_ user: User) -> some View {
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

    private func findsSection(_ user: User) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your finds")
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)
                .padding(.horizontal, 16)

            if user.finds.isEmpty {
                ScreenStates.Empty(
                    systemImage: "diamond",
                    title: "No finds yet",
                    message: "Unearth a gem to get started. Your finds will show up here."
                )
                .frame(minHeight: 160)
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

            settingsLink(
                title: "Privacy policy",
                subtitle: "How Unearth uses your data",
                url: UnearthLinks.privacyPolicy
            )

            settingsLink(
                title: "Posting guidelines",
                subtitle: "Public places only",
                url: UnearthLinks.postingGuidelines
            )

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

    private func settingsLink(title: String, subtitle: String, url: URL) -> some View {
        Link(destination: url) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(UnearthFont.button())
                        .foregroundStyle(UnearthColor.ink)
                    Text(subtitle)
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.inkSecondary)
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(UnearthColor.green)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(UnearthColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(UnearthColor.border, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    private func reload() async {
        isLoading = true
        loadError = nil
        defer {
            isLoading = false
            hasLoadedOnce = true
        }
        do {
            let me = try await APIClient.shared.me()
            user = me
            auth.applyLoadedUser(me)
        } catch {
            loadError = error.localizedDescription
            if user == nil {
                user = auth.currentUser
            }
        }
    }
}

#Preview("ProfileView") {
    ProfileView(auth: AuthService())
}
