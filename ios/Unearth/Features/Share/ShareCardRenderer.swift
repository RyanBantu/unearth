import MapKit
import SwiftUI
import UIKit

enum ShareCardRenderer {
    /// Builds a share image: map snapshot + SwiftUI `ImageRenderer` of `ShareCardView`.
    @MainActor
    static func render(
        gemName: String,
        categoryName: String,
        unearthedByHandle: String,
        coordinate: CLLocationCoordinate2D
    ) async -> UIImage? {
        let mapImage = await mapSnapshot(coordinate: coordinate, size: CGSize(width: 952, height: 720))

        let card = ShareCardView(
            gemName: gemName,
            categoryName: categoryName,
            unearthedByHandle: unearthedByHandle,
            mapImage: mapImage
        )

        let renderer = ImageRenderer(content: card)
        renderer.scale = 1
        renderer.proposedSize = ProposedViewSize(ShareCardView.canvasSize)
        return renderer.uiImage
    }

    private static func mapSnapshot(
        coordinate: CLLocationCoordinate2D,
        size: CGSize
    ) async -> UIImage? {
        let options = MKMapSnapshotter.Options()
        options.size = size
        options.scale = 2
        options.region = MKCoordinateRegion(
            center: coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.008, longitudeDelta: 0.008)
        )
        options.mapType = .standard
        options.showsBuildings = true
        options.pointOfInterestFilter = .excludingAll
        if #available(iOS 17.0, *) {
            options.preferredConfiguration = MKStandardMapConfiguration(emphasisStyle: .muted)
        }

        let snapshotter = MKMapSnapshotter(options: options)
        do {
            let snapshot = try await snapshotter.start()
            return snapshot.image
        } catch {
            return nil
        }
    }
}
