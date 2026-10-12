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

    var body: some View {
        VStack(spacing: 0) {
            Group {
                switch selectedTab {
                case .dig:
                    digTab
                case .stash:
                    StashView(onOpenGem: { presentedGem = $0 })
                case .unearth:
                    digTab
                case .activity:
                    ActivityView()
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
                onSuccess: { message in
                    showUnearth = false
                    linkedGemForFind = nil
                    toastMessage = message
                    // TODO: select the new gem on the Dig map
                }
            )
        }
        .fullScreenCover(item: $presentedGem) { gem in
            GemDetailView(
                gem: gem,
                userLocation: locationService.currentLocation,
                onClose: { presentedGem = nil },
                onFoundItToo: { foundGem in
                    presentedGem = nil
                    linkedGemForFind = foundGem
                    showUnearth = true
                }
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
    }
}

#Preview("HomeShellView") {
    HomeShellView(auth: AuthService(), locationService: LocationService())
}
