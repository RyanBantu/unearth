import CoreLocation
import SwiftUI

struct HomeShellView: View {
    var auth: AuthService
    var locationService: LocationService

    @State private var selectedTab: MainTab = .dig
    @State private var digViewModel = DigViewModel()
    @State private var placeSearch = PlaceSearchService()
    @State private var showUnearth = false
    @State private var presentedGem: PresentedGem?
    @State private var linkedGemForFind: Gem?
    @State private var reopenGemAfterFind: UUID?
    @State private var toastMessage: String?
    @State private var stashGems: [Gem] = []
    @State private var activityEvents: [ActivityEvent] = []
    @State private var stashReloadToken = 0

    var body: some View {
        VStack(spacing: 0) {
            Group {
                switch selectedTab {
                case .dig:
                    digTab
                case .stash:
                    StashView(
                        gems: stashGems,
                        onOpenGem: { presentedGem = PresentedGem(id: $0.id) },
                        onRefresh: { await loadStash() }
                    )
                        .id(stashReloadToken)
                        .task { await loadStash() }
                case .unearth:
                    digTab
                case .activity:
                    ActivityView(events: activityEvents)
                        .task { await loadActivity() }
                case .profile:
                    ProfileView(
                        user: auth.currentUser ?? .mock,
                        onSignOut: { auth.signOut() },
                        onDeleteAccount: { await auth.deleteAccount() }
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            MainTabBar(selected: $selectedTab) {
                linkedGemForFind = nil
                showUnearth = true
            }
        }
        .ignoresSafeArea(.keyboard)
        .toast($toastMessage)
        .fullScreenCover(isPresented: $showUnearth) {
            UnearthView(
                locationService: locationService,
                linkedGem: linkedGemForFind,
                onDismiss: {
                    showUnearth = false
                    let wasAddingFind = linkedGemForFind != nil
                    linkedGemForFind = nil
                    // If user cancelled "I found it too", reopen the gem page.
                    if wasAddingFind, let id = reopenGemAfterFind {
                        presentedGem = PresentedGem(id: id)
                    }
                    reopenGemAfterFind = nil
                },
                onSuccess: { message, gem in
                    let reopenId = reopenGemAfterFind
                    showUnearth = false
                    linkedGemForFind = nil
                    reopenGemAfterFind = nil
                    toastMessage = message

                    if let reopenId {
                        // Added a find — reopen gem so “You found this” + badges refresh.
                        selectedTab = .dig
                        presentedGem = PresentedGem(id: reopenId)
                    } else if let gem {
                        selectedTab = .dig
                        digViewModel.selectNewlyUnearthed(gem)
                    }

                    Task {
                        await digViewModel.loadNearby(
                            lat: locationService.currentLocation?.coordinate.latitude ?? gem?.latitude ?? 12.9716,
                            lng: locationService.currentLocation?.coordinate.longitude ?? gem?.longitude ?? 77.5946
                        )
                    }
                }
            )
        }
        .fullScreenCover(item: $presentedGem) { item in
            GemDetailHost(
                gemId: item.id,
                userLocation: locationService.currentLocation,
                onClose: { presentedGem = nil },
                onFoundItToo: { foundGem in
                    reopenGemAfterFind = foundGem.id
                    presentedGem = nil
                    linkedGemForFind = foundGem
                    showUnearth = true
                },
                onStashChanged: {
                    stashReloadToken += 1
                    Task { await loadStash() }
                },
                onGemUpdated: { updated in
                    digViewModel.applyUpdatedGem(updated)
                }
            )
        }
    }

    private var digTab: some View {
        DigView(
            viewModel: digViewModel,
            locationService: locationService,
            placeSearch: placeSearch,
            onOpenGem: { presentedGem = PresentedGem(id: $0.id) }
        )
        .task {
            let loc = locationService.currentLocation
            let lat = loc?.coordinate.latitude ?? 12.9716
            let lng = loc?.coordinate.longitude ?? 77.5946
            if loc != nil {
                digViewModel.centerOnUser(loc)
            }
            await digViewModel.loadNearby(lat: lat, lng: lng)
        }
    }

    private func loadStash() async {
        do {
            let response = try await APIClient.shared.stash()
            stashGems = response.gems.map {
                var gem = $0.toGem()
                gem.isStashed = true
                return gem
            }
        } catch {
            stashGems = []
        }
    }

    private func loadActivity() async {
        do {
            let response = try await APIClient.shared.activity()
            activityEvents = response.events
        } catch {
            activityEvents = []
        }
    }
}

private struct PresentedGem: Identifiable, Hashable {
    let id: UUID
}

/// Loads gem detail exclusively from `GET /gems/:id`.
private struct GemDetailHost: View {
    let gemId: UUID
    var userLocation: CLLocation?
    var onClose: () -> Void
    var onFoundItToo: (Gem) -> Void
    var onStashChanged: () -> Void
    var onGemUpdated: (Gem) -> Void

    @State private var detail: Gem?
    @State private var errorMessage: String?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let detail {
                GemDetailView(
                    gem: detail,
                    userLocation: userLocation,
                    onClose: onClose,
                    onFoundItToo: onFoundItToo,
                    onStashChanged: onStashChanged,
                    onGemUpdated: onGemUpdated
                )
                .task(id: gemId) {
                    // Refresh when reopened after “I found it too”.
                    await reloadQuietly()
                }
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(UnearthColor.formBackground.ignoresSafeArea())
            } else {
                VStack(spacing: 16) {
                    Text(errorMessage ?? "Couldn’t load this gem.")
                        .font(UnearthFont.body())
                        .foregroundStyle(UnearthColor.inkSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                    Button("Try again") {
                        Task { await load() }
                    }
                    .font(UnearthFont.button())
                    .foregroundStyle(UnearthColor.green)
                    Button("Close", action: onClose)
                        .font(UnearthFont.label())
                        .foregroundStyle(UnearthColor.inkSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(UnearthColor.formBackground.ignoresSafeArea())
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            detail = try await APIClient.shared.gem(id: gemId)
        } catch {
            detail = nil
            errorMessage = error.localizedDescription
        }
    }

    private func reloadQuietly() async {
        do {
            let fresh = try await APIClient.shared.gem(id: gemId)
            detail = fresh
            onGemUpdated(fresh)
        } catch {
            // Keep existing detail
        }
    }
}

#Preview("HomeShellView") {
    HomeShellView(auth: AuthService(), locationService: LocationService())
}
