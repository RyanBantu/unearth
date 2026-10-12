import MapKit
import SwiftUI

struct UnearthView: View {
    var locationService: LocationService? = nil
    var linkedGem: Gem? = nil
    /// Current user’s handle — shown on the share card as Unearthed by @handle.
    var currentHandle: String = ""
    var onDismiss: (() -> Void)? = nil
    var onSuccess: ((String, Gem?) -> Void)? = nil

    @State private var viewModel: UnearthViewModel
    @State private var pendingShare: ShareOfferPayload?
    @State private var pendingSuccessMessage: String?
    @FocusState private var focusedField: FieldFocus?

    private enum FieldFocus: Hashable {
        case name, description, liked, disliked, maps
    }

    init(
        locationService: LocationService? = nil,
        linkedGem: Gem? = nil,
        currentHandle: String = "",
        onDismiss: (() -> Void)? = nil,
        onSuccess: ((String, Gem?) -> Void)? = nil
    ) {
        self.locationService = locationService
        self.linkedGem = linkedGem
        self.currentHandle = currentHandle
        self.onDismiss = onDismiss
        self.onSuccess = onSuccess
        _viewModel = State(initialValue: UnearthViewModel(linkedGem: linkedGem))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        if viewModel.isExistingGemMode {
                            existingGemHeader
                        } else {
                            locationCard
                            nameField
                            if let match = viewModel.currentMatch {
                                matchBanner(match)
                            }
                        }

                        categorySection
                        whySection
                        likedDislikedRow
                        tagsSection
                        mapsField
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
                    .padding(.bottom, 8)
                }

                bottomBar
            }
            .background(UnearthColor.formBackground.ignoresSafeArea())
            .navigationTitle("Unearth a gem")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { onDismiss?() }
                        .font(UnearthFont.medium(16))
                        .foregroundStyle(UnearthColor.green)
                }
            }
            .toolbarBackground(UnearthColor.formBackground, for: .navigationBar)
            .toast($viewModel.toastMessage)
            .onAppear {
                if !viewModel.didCenterOnUser, !viewModel.isExistingGemMode {
                    viewModel.centerOnUser(locationService?.currentLocation)
                }
            }
            .fullScreenCover(item: $pendingShare) { payload in
                ShareOfferSheet(payload: payload) {
                    finishAfterShare()
                }
            }
        }
    }

    private func finishAfterShare() {
        let message = pendingSuccessMessage ?? "Gem unearthed"
        let gem = viewModel.lastSubmittedGem
        pendingShare = nil
        pendingSuccessMessage = nil
        onSuccess?(message, gem)
        onDismiss?()
    }

    // MARK: - Existing gem

    private var existingGemHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Adding your find")
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.inkSecondary)
            Text(viewModel.linkedGem?.name ?? viewModel.name)
                .font(UnearthFont.cardTitle())
                .foregroundStyle(UnearthColor.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(UnearthColor.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(UnearthColor.border, lineWidth: 1)
        }
    }

    // MARK: - Location

    private var locationCard: some View {
        VStack(spacing: 0) {
            ZStack {
                Map(position: $viewModel.cameraPosition) {
                    // Empty — pin is a fixed overlay; map pans underneath.
                }
                .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
                .mapControlVisibility(.hidden)
                .frame(height: 112)
                .onMapCameraChange(frequency: .continuous) { context in
                    viewModel.updatePinFromCamera(context.camera.centerCoordinate)
                }

                GemTeardropPin(size: 30, borderWidth: 3)
                    .allowsHitTesting(false)
                    .offset(y: -8)
            }
            .clipShape(
                UnevenRoundedRectangle(
                    topLeadingRadius: 18,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 0,
                    topTrailingRadius: 18,
                    style: .continuous
                )
            )

            HStack(spacing: 8) {
                Text("Drag the map to adjust the pin")
                    .font(UnearthFont.bodySmall(13))
                    .foregroundStyle(UnearthColor.inkSecondary)
                Spacer(minLength: 8)
                Button {
                    viewModel.centerOnUser(locationService?.currentLocation)
                } label: {
                    Text("Use my location")
                        .font(UnearthFont.label(13))
                        .foregroundStyle(UnearthColor.green)
                        .padding(.horizontal, 12)
                        .frame(height: 34)
                        .background(UnearthColor.greenTint)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .background(UnearthColor.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(UnearthColor.border, lineWidth: 1)
        }
    }

    // MARK: - Name + suggestions

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 0) {
            Field(label: "Name", placeholder: "Name this gem", text: Binding(
                get: { viewModel.name },
                set: { viewModel.onNameChanged($0) }
            ))
            .focused($focusedField, equals: .name)

            if !viewModel.nameSuggestions.isEmpty, !viewModel.name.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(viewModel.nameSuggestions.enumerated()), id: \.offset) { _, completion in
                        Button {
                            Task {
                                await viewModel.selectSuggestion(completion)
                                focusedField = nil
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(completion.title)
                                    .font(UnearthFont.body())
                                    .foregroundStyle(UnearthColor.ink)
                                if !completion.subtitle.isEmpty {
                                    Text(completion.subtitle)
                                        .font(UnearthFont.bodySmall())
                                        .foregroundStyle(UnearthColor.inkSecondary)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)
                        if completion.title != viewModel.nameSuggestions.last?.title
                            || completion.subtitle != viewModel.nameSuggestions.last?.subtitle {
                            Divider().overlay(UnearthColor.divider)
                        }
                    }
                }
                .background(UnearthColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(UnearthColor.fieldBorder, lineWidth: 1)
                }
                .padding(.top, 6)
            }
        }
    }

    // MARK: - Match banner

    private func matchBanner(_ match: MatchCandidate) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Is this the same place?")
                    .font(UnearthFont.label(14))
                    .foregroundStyle(UnearthColor.amberDeep)
                Text(match.bannerDetail)
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.amberDeep)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 8) {
                Button {
                    viewModel.acceptMatch()
                } label: {
                    Text("Yes, I found it too")
                        .font(UnearthFont.button(14))
                        .foregroundStyle(UnearthColor.surface)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(UnearthColor.amber)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    viewModel.rejectMatch()
                } label: {
                    Text("No, it's different")
                        .font(UnearthFont.button(14))
                        .foregroundStyle(UnearthColor.amber)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(UnearthColor.amberTint)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(UnearthColor.amber, lineWidth: 1.5)
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(UnearthColor.amberTint)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Category

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Category")
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)
            if viewModel.category == nil {
                Text("Required — pick one to enable Unearth")
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.amber)
            }

            FlowChips {
                ForEach(viewModel.visibleCategories) { item in
                    Chip(
                        title: item.displayName,
                        isSelected: viewModel.category == item,
                        style: .form
                    ) {
                        viewModel.category = item
                        viewModel.scheduleMatchQuery()
                    }
                }
                if !viewModel.showMoreCategories {
                    Chip(title: "More", isSelected: false, style: .form) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.showMoreCategories = true
                        }
                    }
                }
            }
        }
    }

    // MARK: - Why

    private var whySection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Why it's a gem")
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)
            Text("Required · at least 10 characters")
                .font(UnearthFont.bodySmall())
                .foregroundStyle(
                    viewModel.isDescriptionValid ? UnearthColor.inkSecondary : UnearthColor.amber
                )

            ZStack(alignment: .topLeading) {
                TextEditor(text: $viewModel.description)
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.ink)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 64)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .focused($focusedField, equals: .description)

                if viewModel.description.isEmpty {
                    Text("What is it, what to try, when to go")
                        .font(UnearthFont.body())
                        .foregroundStyle(UnearthColor.inkSecondary.opacity(0.7))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 16)
                        .allowsHitTesting(false)
                }
            }
            .background(UnearthColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(UnearthColor.fieldBorder, lineWidth: 1)
            }
        }
    }

    // MARK: - Liked / Didn't like

    private var likedDislikedRow: some View {
        HStack(alignment: .top, spacing: 10) {
            sideNoteField(
                label: "Liked",
                labelColor: UnearthColor.green,
                placeholder: "The good bits",
                text: $viewModel.liked,
                focus: .liked
            )
            sideNoteField(
                label: "Didn't like",
                labelColor: UnearthColor.amber,
                placeholder: "Heads-ups",
                text: $viewModel.disliked,
                focus: .disliked
            )
        }
    }

    private func sideNoteField(
        label: String,
        labelColor: Color,
        placeholder: String,
        text: Binding<String>,
        focus: FieldFocus
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(UnearthFont.label())
                .foregroundStyle(labelColor)
            TextField(placeholder, text: text)
                .font(UnearthFont.body())
                .foregroundStyle(UnearthColor.ink)
                .padding(.horizontal, 12)
                .frame(height: 44)
                .background(UnearthColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(UnearthColor.fieldBorder, lineWidth: 1)
                }
                .focused($focusedField, equals: focus)
                .onChange(of: text.wrappedValue) { _, newValue in
                    if newValue.count > 140 {
                        text.wrappedValue = String(newValue.prefix(140))
                    }
                }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Tags

    private var tagsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Tags")
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)
            FlowChips {
                ForEach(QuickTag.allCases) { tag in
                    Chip(
                        title: tag.rawValue,
                        isSelected: viewModel.selectedTags.contains(tag),
                        style: .form
                    ) {
                        viewModel.toggleTag(tag)
                    }
                }
            }
        }
    }

    // MARK: - Maps URL

    private var mapsField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Field(
                label: "Google Maps link (optional)",
                placeholder: "https://maps.google.com/…",
                text: $viewModel.googleMapsURL
            )
            .focused($focusedField, equals: .maps)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.URL)

            if !viewModel.googleMapsURL.isEmpty, !viewModel.isGoogleMapsURLValid {
                Text("Enter a valid Google Maps URL")
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.amber)
            }
        }
    }

    // MARK: - Bottom bar

    private var bottomBar: some View {
        VStack(spacing: 0) {
            UnearthColor.divider.frame(height: 1)
            if !viewModel.isFormValid {
                Text(viewModel.validationHints.joined(separator: " · "))
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.amber)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
            }
            PrimaryButton(
                title: "Unearth",
                isLarge: true,
                isEnabled: viewModel.isFormValid && !viewModel.isSubmitting
            ) {
                Task {
                    if let message = await viewModel.submit() {
                        offerShare(successMessage: message)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 12)
        }
        .background(UnearthColor.formBackground)
    }

    private func offerShare(successMessage: String) {
        guard let gem = viewModel.lastSubmittedGem else {
            onSuccess?(successMessage, nil)
            onDismiss?()
            return
        }

        // Prefer the signed-in prospector — they’re the one sharing the find.
        let handle = currentHandle.isEmpty
            ? (gem.unearthedByHandle ?? gem.firstFinderHandle ?? "you")
            : currentHandle

        pendingSuccessMessage = successMessage
        pendingShare = ShareOfferPayload(
            gemName: gem.name,
            categoryName: gem.category.displayName,
            unearthedByHandle: handle,
            coordinate: gem.coordinate,
            successMessage: successMessage,
            gem: gem
        )
    }
}

// MARK: - Simple wrapping chip layout

private struct FlowChips<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        // Horizontal scroll keeps layout simple and reliable across chip counts.
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                content
            }
        }
    }
}

#Preview("UnearthView") {
    UnearthView(locationService: LocationService())
}

#Preview("UnearthView existing") {
    UnearthView(linkedGem: Gem.mockGems[0])
}
