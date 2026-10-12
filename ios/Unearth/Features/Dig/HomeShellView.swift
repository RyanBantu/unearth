import CoreLocation
import SwiftUI

struct HomeShellView: View {
    var auth: AuthService
    var locationService: LocationService

    @State private var selectedTab: MainTab = .dig
    @State private var digViewModel = DigViewModel()
    @State private var placeSearch = PlaceSearchService()
    @State private var showUnearth = false
    @State private var presentedGem: Gem?
    @State private var linkedGemForFind: Gem?
    @State private var toastMessage: String?
    @State private var stashGems: [Gem] = []
    @State private var activityEvents: [ActivityEvent] = []

    var body: some View {
        VStack(spacing: 0) {
            Group {
                switch selectedTab {
                case .dig:
                    digTab
                case .stash:
                    StashView(gems: stashGems, onOpenGem: { presentedGem = $0 })
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
                    linkedGemForFind = nil
                },
                onSuccess: { message, gem in
                    showUnearth = false
                    linkedGemForFind = nil
                    toastMessage = message
                    selectedTab = .dig
                    if let gem {
                        digViewModel.selectNewlyUnearthed(gem)
                    }
                }
            )
        }
        .fullScreenCover(item: $presentedGem) { gem in
            GemDetailHost(
                gemId: gem.id,
                userLocation: locationService.currentLocation,
                onClose: { presentedGem = nil },
                onFoundItToo: { foundGem in
                    presentedGem = nil
                    linkedGemForFind = foundGem
                    showUnearth = true
                },
                onStashChanged: { Task { await loadStash() } }
            )
        }
    }

    private var digTab: some View {
        DigView(
            viewModel: digViewModel,
            locationService: locationService,
            placeSearch: placeSearch,
            onOpenGem: { presentedGem = $0 }
        )
        .task {
            // Initial load; further fetches happen on map camera settle.
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
            stashGems = response.gems.map { $0.toGem() }
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

/// Loads gem detail exclusively from `GET /gems/:id`.
private struct GemDetailHost: View {
    let gemId: UUID
    var userLocation: CLLocation?
    var onClose: () -> Void
    var onFoundItToo: (Gem) -> Void
    var onStashChanged: () -> Void

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
                    onStashChanged: onStashChanged
                )
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
}

#Preview("HomeShellView") {
    HomeShellView(auth: AuthService(), locationService: LocationService())
}
