import MapKit
import SwiftUI

struct DigView: View {
    @Bindable var viewModel: DigViewModel
    var locationService: LocationService
    var placeSearch: PlaceSearchService
    var onOpenGem: (Gem) -> Void

    @FocusState private var isSearchFocused: Bool

    var body: some View {
        ZStack(alignment: .top) {
            map
                .ignoresSafeArea()

            VStack(spacing: 12) {
                topControls
                categoryChips
                if shouldShowSuggestions {
                    searchSuggestions
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            VStack {
                Spacer()
                bottomSheet
            }
        }
        .onAppear {
            locationService.startUpdating()
            if let location = locationService.currentLocation {
                viewModel.centerOnUser(location)
            }
        }
        .sheet(isPresented: $viewModel.showNearbyList) {
            nearbyListSheet
        }
    }

    // MARK: - Map

    private var map: some View {
        Map(position: $viewModel.cameraPosition) {
            UserAnnotation()

            ForEach(viewModel.filteredGems) { gem in
                Annotation(gem.name, coordinate: gem.coordinate, anchor: .center) {
                    Button {
                        viewModel.select(gem)
                    } label: {
                        GemPinView(
                            category: gem.category,
                            isSelected: viewModel.selectedGem?.id == gem.id
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        // Dig map: muted emphasis when available (iOS 18+). On iOS 17 SDK,
        // `emphasis:` is unavailable — fall back to flat standard + no POIs.
        .modifier(DigMapStyleModifier())
        .mapControlVisibility(.hidden)
        .onMapCameraChange(frequency: .onEnd) { context in
            viewModel.onMapCameraSettled(context.region)
        }
    }

    // MARK: - Top overlay

    private var topControls: some View {
        HStack(spacing: 10) {
            searchField
            filterButton
        }
        .padding(.top, 12)
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 18, weight: .regular))
                .foregroundStyle(UnearthColor.inkSecondary)

            TextField("Dig around a town or area", text: $viewModel.searchText)
                .font(.custom("DMSans-Regular", size: 16, relativeTo: .body))
                .foregroundStyle(UnearthColor.ink)
                .focused($isSearchFocused)
                .submitLabel(.search)
                .onChange(of: viewModel.searchText) { _, newValue in
                    placeSearch.queryFragment = newValue
                    viewModel.showSearchSuggestions = !newValue.isEmpty
                }

            if !viewModel.searchText.isEmpty {
                Button {
                    viewModel.searchText = ""
                    placeSearch.clear()
                    viewModel.showSearchSuggestions = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(UnearthColor.inkSecondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 48)
        .background(UnearthColor.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .floatingShadow()
    }

    private var filterButton: some View {
        Button {
            // Chips are always visible; button resets filter to All.
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.selectCategoryFilter(nil)
            }
        } label: {
            Image(systemName: "line.3.horizontal.decrease")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(UnearthColor.ink)
                .frame(width: 48, height: 48)
                .background(UnearthColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .floatingShadow()
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Reset filters")
    }

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Chip(
                    title: "All",
                    isSelected: viewModel.selectedCategory == nil,
                    style: .map
                ) {
                    viewModel.selectCategoryFilter(nil)
                }

                ForEach(Category.digFilters) { category in
                    Chip(
                        title: category.digChipTitle,
                        isSelected: viewModel.selectedCategory == category,
                        style: .map
                    ) {
                        viewModel.selectCategoryFilter(category)
                    }
                }
            }
        }
    }

    private var shouldShowSuggestions: Bool {
        viewModel.showSearchSuggestions && !placeSearch.completions.isEmpty
    }

    private var searchSuggestions: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(placeSearch.completions.prefix(5).enumerated()), id: \.offset) { _, item in
                Button {
                    Task {
                        if let mapItem = await placeSearch.search(completion: item) {
                            let coordinate = mapItem.placemark.coordinate
                            viewModel.moveCamera(to: coordinate)
                            viewModel.searchText = item.title
                            viewModel.showSearchSuggestions = false
                            isSearchFocused = false
                            placeSearch.clear()
                        }
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.title)
                            .font(UnearthFont.body())
                            .foregroundStyle(UnearthColor.ink)
                        if !item.subtitle.isEmpty {
                            Text(item.subtitle)
                                .font(UnearthFont.bodySmall())
                                .foregroundStyle(UnearthColor.inkSecondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.plain)

                if item.title != placeSearch.completions.prefix(5).last?.title {
                    Divider().overlay(UnearthColor.divider)
                }
            }
        }
        .background(UnearthColor.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .floatingShadow()
    }

    // MARK: - Bottom sheet

    private var bottomSheet: some View {
        VStack(alignment: .leading, spacing: 14) {
            Capsule()
                .fill(Color(hex: 0xCDD3CF))
                .frame(width: 40, height: 5)
                .clipShape(RoundedRectangle(cornerRadius: 3, style: .continuous))
                .frame(maxWidth: .infinity)

            HStack(alignment: .firstTextBaseline) {
                Text("Gems near you")
                    .font(UnearthFont.sheetTitle())
                    .foregroundStyle(UnearthColor.ink)

                Spacer(minLength: 8)

                Button {
                    viewModel.showNearbyList = true
                } label: {
                    Text("See list")
                        .font(.custom("DMSans-SemiBold", size: 14, relativeTo: .subheadline))
                        .foregroundStyle(UnearthColor.green)
                }
                .buttonStyle(.plain)
            }

            if viewModel.isLoadingNearby, viewModel.gems.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            } else if let gem = viewModel.sheetGem(userLocation: locationService.currentLocation) {
                GemCard(
                    gem: gem,
                    userLocation: locationService.currentLocation
                ) {
                    onOpenGem(gem)
                }
            } else {
                Text(viewModel.loadError == nil
                     ? "No gems near here yet. Unearth the first one."
                     : (viewModel.loadError ?? "Couldn’t load gems."))
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
            }
        }
        .padding(.top, 10)
        .padding(.horizontal, 16)
        .padding(.bottom, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(UnearthColor.surface)
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: 28,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: 0,
                topTrailingRadius: 28,
                style: .continuous
            )
        )
        .sheetShadow()
    }

    private var nearbyListSheet: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.nearbyGemsSorted(from: locationService.currentLocation)) { gem in
                        GemCard(
                            gem: gem,
                            userLocation: locationService.currentLocation
                        ) {
                            viewModel.showNearbyList = false
                            onOpenGem(gem)
                        }
                        .padding(.horizontal, 16)
                        Divider().overlay(UnearthColor.divider)
                    }
                }
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .background(UnearthColor.formBackground.ignoresSafeArea())
            .navigationTitle("Gems near you")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        viewModel.showNearbyList = false
                    }
                    .font(UnearthFont.label())
                    .foregroundStyle(UnearthColor.green)
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
}

/// Applies the Dig map style with the closest available API for the deployment SDK.
private struct DigMapStyleModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.mapStyle(.standard(emphasis: .muted, pointsOfInterest: .excludingAll))
        } else {
            // iOS 17: `emphasis: .muted` is unavailable — flat standard + no POIs.
            content.mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
        }
    }
}

#Preview("DigView") {
    DigView(
        viewModel: DigViewModel.previewLoaded(),
        locationService: LocationService(),
        placeSearch: PlaceSearchService(),
        onOpenGem: { _ in }
    )
}
