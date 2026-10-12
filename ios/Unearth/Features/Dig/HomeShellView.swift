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
                    if let gem {
                        digViewModel.selectNewlyUnearthed(gem)
                        selectedTab = .dig
                    }
                }
            )
        }
        .fullScreenCover(item: $presentedGem) { gem in
            GemDetailHost(
                gem: gem,
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
        .task(id: locationService.currentLocation?.coordinate.latitude) {
            let loc = locationService.currentLocation
            let lat = loc?.coordinate.latitude ?? 12.9716
            let lng = loc?.coordinate.longitude ?? 77.5946
            await digViewModel.loadNearby(lat: lat, lng: lng)
        }
    }

    private func loadStash() async {
        do {
            let response = try await APIClient.shared.stash()
            stashGems = response.gems.map { $0.toGem() }
        } catch {
            // Keep previous / empty
        }
    }

    private func loadActivity() async {
        do {
            let response = try await APIClient.shared.activity()
            activityEvents = response.events
        } catch {
            // Keep previous / empty
        }
    }
}

/// Loads full gem detail from the API, then shows GemDetailView.
private struct GemDetailHost: View {
    let gem: Gem
    var userLocation: CLLocation?
    var onClose: () -> Void
    var onFoundItToo: (Gem) -> Void
    var onStashChanged: () -> Void

    @State private var detail: Gem?

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
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(UnearthColor.formBackground.ignoresSafeArea())
            }
        }
        .task {
            do {
                detail = try await APIClient.shared.gem(id: gem.id)
            } catch {
                detail = gem
            }
        }
    }
}

#Preview("HomeShellView") {
    HomeShellView(auth: AuthService(), locationService: LocationService())
}
