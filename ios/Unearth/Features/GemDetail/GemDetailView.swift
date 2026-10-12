import CoreLocation
import MapKit
import SwiftUI

struct GemDetailView: View {
    let gem: Gem
    var userLocation: CLLocation? = nil
    var onClose: (() -> Void)? = nil
    var onFoundItToo: ((Gem) -> Void)? = nil

    @State private var isStashed: Bool
    @State private var lookAroundScene: MKLookAroundScene?
    @State private var showLookAround = false
    @State private var toastMessage: String?
    @State private var hasLookAround = false
    @State private var didCheckLookAround = false
    @State private var showReportConfirm = false

    private let firstFindBodyColor = Color(hex: 0x2A3530)

    init(
        gem: Gem,
        userLocation: CLLocation? = nil,
        onClose: (() -> Void)? = nil,
        onFoundItToo: ((Gem) -> Void)? = nil
    ) {
        self.gem = gem
        self.userLocation = userLocation
        self.onClose = onClose
        self.onFoundItToo = onFoundItToo
        _isStashed = State(initialValue: gem.isStashed)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    headerMap
                    content
                        .padding(20)
                        .padding(.bottom, 100)
                }
            }
            .ignoresSafeArea(edges: .top)

            bottomBar
        }
        .background(UnearthColor.formBackground.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .toast($toastMessage)
        .sheet(isPresented: $showLookAround) {
            if let lookAroundScene {
                LookAroundPreview(initialScene: lookAroundScene)
                    .ignoresSafeArea()
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
        .task {
            await loadLookAround()
        }
    }

    // MARK: - Header map

    private var headerMap: some View {
        ZStack(alignment: .top) {
            Map(initialPosition: .region(
                MKCoordinateRegion(
                    center: gem.coordinate,
                    span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
                )
            )) {
                Annotation(gem.name, coordinate: gem.coordinate, anchor: .bottom) {
                    GemTeardropPin(size: 40, borderWidth: 4)
                }
            }
            .mapStyle(headerMapStyle)
            .disabled(true)
            .frame(height: 260)
            .frame(maxWidth: .infinity)
            .clipped()

            HStack {
                RoundIconButton(systemName: "chevron.left") {
                    onClose?()
                }
                Spacer()
                RoundIconButton(systemName: isStashed ? "bookmark.fill" : "bookmark") {
                    isStashed.toggle()
                    toastMessage = isStashed ? "Saved to Stash" : "Removed from Stash"
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .safeAreaPadding(.top)

            if didCheckLookAround, hasLookAround {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        lookAroundButton
                            .padding(.trailing, 16)
                            .padding(.bottom, 14)
                    }
                }
                .frame(height: 260)
            }
        }
        .frame(height: 260)
    }

    private var headerMapStyle: MapStyle {
        if #available(iOS 18.0, *) {
            return .standard(emphasis: .muted, pointsOfInterest: .excludingAll)
        } else {
            // iOS 17: closest available muted-like style.
            return .standard(elevation: .flat, pointsOfInterest: .excludingAll)
        }
    }

    private var lookAroundButton: some View {
        Button {
            showLookAround = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "binoculars")
                    .font(.system(size: 14, weight: .semibold))
                Text("Look Around")
                    .font(.custom("DMSans-SemiBold", size: 14, relativeTo: .subheadline))
            }
            .foregroundStyle(UnearthColor.ink)
            .padding(.horizontal, 14)
            .frame(height: 40)
            .background(UnearthColor.surface)
            .clipShape(Capsule())
            .floatingShadow()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Content

    private var content: some View {
        VStack(alignment: .leading, spacing: 16) {
            badgeRow
            Text(gem.name)
                .font(UnearthFont.gemTitle())
                .foregroundStyle(UnearthColor.ink)
                .gemTitleLineHeight()

            Text(gem.addressDistanceLine(from: userLocation))
                .font(UnearthFont.bodySmall())
                .foregroundStyle(UnearthColor.inkSecondary)

            findersStrip

            if let note = gem.firstFind?.note ?? gem.note {
                Text(note)
                    .font(UnearthFont.body())
                    .foregroundStyle(firstFindBodyColor)
                    .bodyLineSpacing()
            }

            likedDislikedRow

            if !gem.tags.isEmpty {
                tagChips
            }

            if gem.otherFinds.count >= 1, gem.finds.count > 1 {
                otherFindsSection
            }
        }
    }

    private var badgeRow: some View {
        HStack(spacing: 8) {
            Badge(text: gem.category.displayName, variant: .neutral)
            ForEach(gem.statusBadges, id: \.self) { status in
                Badge(text: status.shortBadgeText, variant: .from(status: status))
            }
        }
    }

    private var findersStrip: some View {
        HStack(alignment: .center, spacing: 10) {
            avatarStack
            VStack(alignment: .leading, spacing: 2) {
                Text(gem.unearthedSummaryLine())
                    .font(UnearthFont.label())
                    .foregroundStyle(UnearthColor.greenPressed)
                if let handle = gem.firstFinderHandle ?? gem.unearthedByHandle {
                    Text("First find: @\(handle)")
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.greenPressed)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(UnearthColor.greenTint)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var avatarStack: some View {
        let handles = Array(gem.finderHandles.prefix(3))
        return HStack(spacing: -8) {
            ForEach(Array(handles.enumerated()), id: \.offset) { _, handle in
                Avatar(handle: handle, size: 28)
                    .overlay {
                        Circle()
                            .strokeBorder(UnearthColor.greenTint, lineWidth: 2)
                    }
            }
        }
    }

    private var likedDislikedRow: some View {
        HStack(alignment: .top, spacing: 10) {
            opinionCard(title: "Liked", items: gem.liked)
            opinionCard(title: "Didn't like", items: gem.disliked)
        }
    }

    private func opinionCard(title: String, items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)
            if items.isEmpty {
                Text("—")
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.inkSecondary)
            } else {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.inkSecondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(UnearthColor.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(UnearthColor.border, lineWidth: 1)
        }
    }

    private var tagChips: some View {
        FlowLayout(spacing: 6) {
            ForEach(gem.tags, id: \.self) { tag in
                TagChip(title: tag)
            }
        }
    }

    private var otherFindsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Other finds")
                .font(UnearthFont.cardTitle())
                .foregroundStyle(UnearthColor.ink)

            ForEach(gem.otherFinds) { find in
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Avatar(handle: find.handle, size: 28)
                        Text("@\(find.handle)")
                            .font(UnearthFont.label())
                            .foregroundStyle(UnearthColor.ink)
                        Spacer()
                    }
                    if let note = find.note {
                        Text(note)
                            .font(UnearthFont.body())
                            .foregroundStyle(UnearthColor.inkSecondary)
                            .bodyLineSpacing()
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(UnearthColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(UnearthColor.border, lineWidth: 1)
                }
            }
        }
    }

    // MARK: - Bottom bar

    private var bottomBar: some View {
        VStack(spacing: 10) {
            UnearthColor.divider.frame(height: 1)
            HStack(spacing: 10) {
                PrimaryButton(
                    title: "Directions",
                    systemImage: "arrow.triangle.turn.up.right.diamond.fill"
                ) {
                    openDirections()
                }

                if gem.hasFound {
                    Text("You found this")
                        .font(UnearthFont.button())
                        .foregroundStyle(UnearthColor.inkSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .multilineTextAlignment(.center)
                } else {
                    OutlineButton(title: "I found it too") {
                        onFoundItToo?(gem)
                    }
                }
            }

            if let mapsURL = gem.googleMapsUrl {
                Button {
                    UIApplication.shared.open(mapsURL)
                } label: {
                    Text("Open in Google Maps")
                        .font(UnearthFont.medium(14))
                        .foregroundStyle(UnearthColor.green)
                }
                .buttonStyle(.plain)
            }

            Button("Report") {
                showReportConfirm = true
            }
            .font(UnearthFont.bodySmall())
            .foregroundStyle(UnearthColor.inkSecondary)
            .padding(.top, 2)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 16)
        .background(UnearthColor.surface)
        .confirmationDialog("Report this gem?", isPresented: $showReportConfirm, titleVisibility: .visible) {
            Button("Report", role: .destructive) {
                // TODO: POST /reports
                toastMessage = "Thanks — we received your report"
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func openDirections() {
        let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: gem.coordinate))
        mapItem.name = gem.name
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking,
        ])
    }

    private func loadLookAround() async {
        let request = MKLookAroundSceneRequest(coordinate: gem.coordinate)
        let scene = try? await request.scene
        lookAroundScene = scene
        hasLookAround = scene != nil
        didCheckLookAround = true
    }
}

// MARK: - Simple wrapping layout for tag chips

private struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var height: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            height = y + rowHeight
        }
        return CGSize(width: maxWidth, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(
                at: CGPoint(x: x, y: y),
                proposal: ProposedViewSize(size)
            )
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

#Preview("GemDetailView") {
    GemDetailView(
        gem: Gem.mockGems[0],
        userLocation: CLLocation(latitude: 12.9716, longitude: 77.5946),
        onClose: {}
    )
}

#Preview("GemDetailView · Rare + Polished") {
    GemDetailView(gem: Gem.mockGems[2], onClose: {})
}

#Preview("GemDetailView · Mined out") {
    GemDetailView(gem: Gem.mockGems[3], onClose: {})
}
