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
    @State private var toastMessage: String?
    @State private var findPendingDelete: Find?
    @State private var showDeleteFindConfirm = false

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
            .toast($toastMessage)
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
            .alert(deleteFindAlertTitle, isPresented: $showDeleteFindConfirm) {
                Button("Delete", role: .destructive) {
                    Task { await confirmDeleteFind() }
                }
                Button("Cancel", role: .cancel) {
                    findPendingDelete = nil
                }
            } message: {
                Text(deleteFindAlertMessage)
            }
        }
    }

    private var deleteFindAlertTitle: String {
        guard let find = findPendingDelete else { return "Delete your find?" }
        let count = find.gemFindCount ?? 1
        return count <= 1 ? "Delete this gem?" : "Delete your find?"
    }

    private var deleteFindAlertMessage: String {
        guard let find = findPendingDelete else {
            return "Your write-up will be removed."
        }
        let count = find.gemFindCount ?? 1
        if count <= 1 {
            return "This removes the gem from Unearth for everyone. This can't be undone."
        }
        let others = count - 1
        let noun = others == 1 ? "other" : "others"
        return "Your write-up will be removed. The gem stays because \(others) \(noun) found it too."
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
                List {
                    ForEach(user.finds) { find in
                        findRow(find)
                            .listRowInsets(EdgeInsets(top: 14, leading: 16, bottom: 14, trailing: 16))
                            .listRowBackground(UnearthColor.surface)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    findPendingDelete = find
                                    showDeleteFindConfirm = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
                .listStyle(.plain)
                .scrollDisabled(true)
                .frame(height: CGFloat(user.finds.count) * 88)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .padding(.horizontal, 16)
            }
        }
    }

    private func findRow(_ find: Find) -> some View {
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

    private func confirmDeleteFind() async {
        guard let find = findPendingDelete else { return }
        findPendingDelete = nil
        do {
            let response = try await APIClient.shared.deleteFind(id: find.id)
            toastMessage = response.gemDeleted ? "Gem deleted" : "Find deleted"
            await reload()
        } catch {
            toastMessage = error.localizedDescription
        }
    }

    private func reload() async {
        #if DEBUG
        if ScreenshotScene.isDemo {
            user = auth.currentUser ?? .mock
            isLoading = false
            hasLoadedOnce = true
            loadError = nil
            return
        }
        #endif
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
