import CoreLocation
import MapKit
import SwiftUI

struct GemDetailView: View {
    @State private var gem: Gem
    var userLocation: CLLocation? = nil
    var onClose: (() -> Void)? = nil
    var onFoundItToo: ((Gem) -> Void)? = nil
    var onStashChanged: (() -> Void)? = nil
    var onGemUpdated: ((Gem) -> Void)? = nil

    @State private var lookAroundScene: MKLookAroundScene?
    @State private var showLookAround = false
    @State private var toastMessage: String?
    @State private var hasLookAround = false
    @State private var didCheckLookAround = false
    @State private var reportTarget: ReportTarget?
    @State private var isRefreshing = false

    private let firstFindBodyColor = Color(hex: 0x2A3530)

    private enum ReportTarget: Identifiable, Equatable {
        case gem
        case find(UUID)

        var id: String {
            switch self {
            case .gem: return "gem"
            case .find(let id): return id.uuidString
            }
        }
    }

    init(
        gem: Gem,
        userLocation: CLLocation? = nil,
        onClose: (() -> Void)? = nil,
        onFoundItToo: ((Gem) -> Void)? = nil,
        onStashChanged: (() -> Void)? = nil,
        onGemUpdated: ((Gem) -> Void)? = nil
    ) {
        _gem = State(initialValue: gem)
        self.userLocation = userLocation
        self.onClose = onClose
        self.onFoundItToo = onFoundItToo
        self.onStashChanged = onStashChanged
        self.onGemUpdated = onGemUpdated
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    headerMap
                    content
                        .padding(20)
                        .padding(.bottom, 120)
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
                RoundIconButton(systemName: gem.isStashed ? "bookmark.fill" : "bookmark") {
                    Task { await toggleStash() }
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
            return .standard(elevation: .flat, pointsOfInterest: .excludingAll)
        }
    }

    private var lookAroundButton: some View {
        Button {
            showLookAround = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "binoculars")
                Text("Look Around")
                    .font(UnearthFont.label(14))
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

            if let first = gem.firstFind {
                VStack(alignment: .leading, spacing: 8) {
                    if let note = first.note ?? gem.note {
                        Text(note)
                            .font(UnearthFont.body())
                            .foregroundStyle(firstFindBodyColor)
                            .bodyLineSpacing()
                    }
                    reportFindButton(findId: first.id)
                }
            } else if let note = gem.note {
                Text(note)
                    .font(UnearthFont.body())
                    .foregroundStyle(firstFindBodyColor)
                    .bodyLineSpacing()
            }

            likedDislikedRow

            if !gem.tags.isEmpty {
                tagChips
            }

            if gem.finds.count > 1 {
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
            if isRefreshing {
                ProgressView()
                    .scaleEffect(0.8)
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
            opinionCard(
                title: "Liked",
                icon: "checkmark",
                tint: UnearthColor.green,
                items: gem.liked
            )
            opinionCard(
                title: "Didn't like",
                icon: "xmark",
                tint: UnearthColor.amber,
                items: gem.disliked
            )
        }
    }

    private func opinionCard(title: String, icon: String, tint: Color, items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                Text(title)
                    .font(UnearthFont.label())
            }
            .foregroundStyle(tint)

            if items.isEmpty {
                Text("—")
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.inkSecondary)
            } else {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.inkSecondary)
                        .lineSpacing(1.4)
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
        VStack(alignment: .leading, spacing: 0) {
            Text("Other finds")
                .font(UnearthFont.cardTitle())
                .foregroundStyle(UnearthColor.ink)
                .padding(.bottom, 12)

            ForEach(gem.otherFinds) { find in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("@\(find.handle)")
                            .font(UnearthFont.label())
                            .foregroundStyle(UnearthColor.ink)
                        Spacer()
                        Text(find.createdAt, style: .date)
                            .font(UnearthFont.bodySmall())
                            .foregroundStyle(UnearthColor.inkSecondary)
                    }
                    if let note = find.note {
                        Text(note)
                            .font(UnearthFont.body())
                            .foregroundStyle(UnearthColor.inkSecondary)
                            .bodyLineSpacing()
                    }
                    if let liked = find.likedText, !liked.isEmpty {
                        Text("Liked: \(liked)")
                            .font(UnearthFont.bodySmall())
                            .foregroundStyle(UnearthColor.green)
                    }
                    if let disliked = find.dislikedText, !disliked.isEmpty {
                        Text("Didn't like: \(disliked)")
                            .font(UnearthFont.bodySmall())
                            .foregroundStyle(UnearthColor.amber)
                    }
                    reportFindButton(findId: find.id)
                }
                .padding(.vertical, 12)
                if find.id != gem.otherFinds.last?.id {
                    UnearthColor.divider.frame(height: 1)
                }
            }
        }
    }

    private func reportFindButton(findId: UUID) -> some View {
        Button("Report find") {
            reportTarget = .find(findId)
        }
        .font(UnearthFont.bodySmall())
        .foregroundStyle(UnearthColor.inkTertiary)
        .buttonStyle(.plain)
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

            Button("Report gem") {
                reportTarget = .gem
            }
            .font(UnearthFont.bodySmall())
            .foregroundStyle(UnearthColor.inkSecondary)
            .padding(.top, 2)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 16)
        .background(UnearthColor.surface)
        .confirmationDialog(
            reportDialogTitle,
            isPresented: Binding(
                get: { reportTarget != nil },
                set: { if !$0 { reportTarget = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Spam or scam", role: .destructive) {
                Task { await submitReport(reason: "spam") }
            }
            Button("Inappropriate", role: .destructive) {
                Task { await submitReport(reason: "inappropriate") }
            }
            Button("Inaccurate or misleading", role: .destructive) {
                Task { await submitReport(reason: "inaccurate") }
            }
            Button("Something else", role: .destructive) {
                Task { await submitReport(reason: "other") }
            }
            Button("Cancel", role: .cancel) {
                reportTarget = nil
            }
        }
    }

    private var reportDialogTitle: String {
        switch reportTarget {
        case .find: return "Report this find?"
        case .gem, .none: return "Report this gem?"
        }
    }

    // MARK: - Actions

    /// Reload from `GET /gems/:id` so badges / myFindId stay in sync.
    func refreshFromAPI() async {
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let fresh = try await APIClient.shared.gem(id: gem.id)
            gem = fresh
            onGemUpdated?(fresh)
        } catch {
            toastMessage = error.localizedDescription
        }
    }

    private func toggleStash() async {
        let gemId = gem.id
        do {
            if gem.isStashed {
                try await APIClient.shared.removeFromStash(gemId: gemId)
                gem.isStashed = false
                toastMessage = "Removed from Stash"
            } else {
                try await APIClient.shared.addToStash(gemId: gemId)
                gem.isStashed = true
                toastMessage = "Saved to Stash"
            }
            onGemUpdated?(gem)
            onStashChanged?()
        } catch {
            toastMessage = error.localizedDescription
        }
    }

    private func submitReport(reason: String) async {
        let target = reportTarget
        reportTarget = nil
        do {
            switch target {
            case .gem, .none:
                try await APIClient.shared.report(
                    ReportBody(gemId: gem.id, findId: nil, reason: reason)
                )
            case .find(let findId):
                try await APIClient.shared.report(
                    ReportBody(gemId: gem.id, findId: findId, reason: reason)
                )
            }
            toastMessage = "Thanks — we received your report"
        } catch {
            toastMessage = error.localizedDescription
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

// MARK: - Flow layout

private struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var height: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            height = y + rowHeight
        }
        return CGSize(width: maxWidth.isFinite ? maxWidth : x, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

#Preview("GemDetailView") {
    GemDetailView(gem: Gem.mockGems[0], onClose: {})
}

#Preview("GemDetailView · Rare + Polished") {
    GemDetailView(gem: Gem.mockGems[2], onClose: {})
}

#Preview("GemDetailView · Mined out") {
    GemDetailView(gem: Gem.mockGems[3], onClose: {})
}
