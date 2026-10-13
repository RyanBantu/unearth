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
    @State private var stashIsLoading = false
    @State private var stashError: String?
    @State private var stashReloadToken = 0
    #if DEBUG
    @State private var screenshotGem: Gem?
    @State private var screenshotShare: ShareOfferPayload?
    #endif

    var body: some View {
        VStack(spacing: 0) {
            Group {
                switch selectedTab {
                case .dig:
                    digTab
                case .stash:
                    StashView(
                        gems: stashGems,
                        isLoading: stashIsLoading,
                        loadError: stashError,
                        onOpenGem: { presentedGem = PresentedGem(id: $0.id) },
                        onRefresh: { await loadStash() }
                    )
                        .id(stashReloadToken)
                        .task { await loadStash() }
                case .unearth:
                    digTab
                case .activity:
                    ActivityView()
                case .profile:
                    ProfileView(
                        auth: auth,
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
        #if DEBUG
        .task { applyScreenshotScene() }
        .fullScreenCover(item: $screenshotGem) { gem in
            GemDetailView(gem: gem, userLocation: locationService.currentLocation, onClose: {})
        }
        .fullScreenCover(item: $screenshotShare) { payload in
            ShareOfferSheet(payload: payload, onFinished: {})
        }
        #endif
        .fullScreenCover(isPresented: $showUnearth) {
            UnearthView(
                locationService: locationService,
                linkedGem: linkedGemForFind,
                currentHandle: auth.currentUser?.handle ?? "",
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
                },
                onFindDeleted: { gemId, gemDeleted, message in
                    if gemDeleted {
                        presentedGem = nil
                        digViewModel.removeGem(id: gemId)
                        selectedTab = .dig
                        toastMessage = message
                    } else {
                        Task {
                            await digViewModel.reloadNearby(
                                fallback: locationService.currentLocation?.coordinate
                            )
                        }
                    }
                    stashReloadToken += 1
                    Task { await loadStash() }
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
        #if DEBUG
        if ScreenshotScene.isDemo {
            stashGems = Gem.mockGems.map {
                var gem = $0
                gem.isStashed = true
                return gem
            }
            stashIsLoading = false
            stashError = nil
            return
        }
        #endif
        stashIsLoading = true
        stashError = nil
        defer { stashIsLoading = false }
        do {
            let response = try await APIClient.shared.stash()
            stashGems = response.gems.map {
                var gem = $0.toGem()
                gem.isStashed = true
                return gem
            }
        } catch {
            stashError = error.localizedDescription
            if stashGems.isEmpty {
                stashGems = []
            }
        }
    }

    #if DEBUG
    private func applyScreenshotScene() {
        guard let scene = ScreenshotScene.current else { return }
        stashGems = Gem.mockGems.map {
            var gem = $0
            gem.isStashed = true
            return gem
        }
        switch scene {
        case .signin, .handle, .location:
            break
        case .dig:
            selectedTab = .dig
        case .digList:
            selectedTab = .dig
            digViewModel.showNearbyList = true
        case .gem:
            selectedTab = .dig
            screenshotGem = Gem.mockGems[0]
        case .unearth:
            selectedTab = .dig
            showUnearth = true
        case .stash:
            selectedTab = .stash
        case .activity:
            selectedTab = .activity
        case .profile:
            selectedTab = .profile
        case .share:
            selectedTab = .dig
            let gem = Gem.mockGems[0]
            screenshotShare = ShareOfferPayload(
                gemName: gem.name,
                categoryName: gem.category.displayName,
                unearthedByHandle: auth.currentUser?.handle ?? "ryan",
                coordinate: gem.coordinate,
                successMessage: "You unearthed \(gem.name)",
                gem: gem
            )
        }
    }
    #endif
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
    var onFindDeleted: (_ gemId: UUID, _ gemDeleted: Bool, _ message: String) -> Void

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
                    onGemUpdated: onGemUpdated,
                    onFindDeleted: { result in
                        onFindDeleted(gemId, result.gemDeleted, result.message)
                    }
                )
                .task(id: gemId) {
                    // Refresh when reopened after “I found it too”.
                    await reloadQuietly()
                }
            } else if isLoading {
                ScreenStates.Loading(message: "Loading gem…")
                    .background(UnearthColor.formBackground.ignoresSafeArea())
            } else {
                VStack(spacing: 16) {
                    ScreenStates.Error(
                        message: errorMessage ?? "Couldn’t load this gem."
                    ) {
                        Task { await load() }
                    }
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
