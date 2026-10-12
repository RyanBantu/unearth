import SwiftUI

struct ProfileView: View {
    var user: User = .mock
    var onSignOut: () -> Void = {}
    var onDeleteAccount: (() async -> Void)? = nil

    @State private var showDeleteConfirm = false
    @State private var isDeleting = false

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
                Text("This permanently deletes your account and finds. This cannot be undone.")
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
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 24)
    }

    private var stats: some View {
        VStack(spacing: 8) {
            Text("\(user.gemsUnearthed) gems unearthed")
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
                Text("No finds yet.")
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
}

#Preview("ProfileView") {
    ProfileView()
}
