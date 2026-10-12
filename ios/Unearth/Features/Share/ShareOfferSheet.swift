import CoreLocation
import SwiftUI
import UIKit

struct ShareOfferPayload: Identifiable {
    let id = UUID()
    var gemName: String
    var categoryName: String
    var unearthedByHandle: String
    var coordinate: CLLocationCoordinate2D
    var successMessage: String
    var gem: Gem?
}

struct ShareOfferSheet: View {
    let payload: ShareOfferPayload
    var onFinished: () -> Void

    @State private var renderedImage: UIImage?
    @State private var isRendering = true
    @State private var showShareSheet = false
    @State private var toastMessage: String?
    @State private var instagramAvailable = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text(payload.successMessage)
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                    .padding(.top, 8)

                preview

                VStack(spacing: 12) {
                    PrimaryButton(
                        title: "Share",
                        systemImage: "square.and.arrow.up",
                        isLarge: true,
                        isEnabled: renderedImage != nil
                    ) {
                        showShareSheet = true
                    }

                    if instagramAvailable {
                        OutlineButton(title: "Instagram Stories") {
                            shareToInstagramStories()
                        }
                        .disabled(renderedImage == nil)
                    }

                    Button("Not now") {
                        onFinished()
                    }
                    .font(UnearthFont.button())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .padding(.top, 4)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .background(UnearthColor.formBackground.ignoresSafeArea())
            .navigationTitle("Share your find")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { onFinished() }
                        .font(UnearthFont.medium(16))
                        .foregroundStyle(UnearthColor.green)
                }
            }
            .toast($toastMessage)
            .sheet(isPresented: $showShareSheet) {
                if let renderedImage {
                    ActivityShareSheet(items: [renderedImage])
                }
            }
            .task {
                instagramAvailable = InstagramStoriesSharer.isAvailable
                await renderCard()
            }
        }
    }

    @ViewBuilder
    private var preview: some View {
        ZStack {
            if let renderedImage {
                Image(uiImage: renderedImage)
                    .resizable()
                    .scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .shadow(color: UnearthColor.ink.opacity(0.14), radius: 20, y: 10)
            } else if isRendering {
                ProgressView("Building share card…")
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
            } else {
                ShareCardView(
                    gemName: payload.gemName,
                    categoryName: payload.categoryName,
                    unearthedByHandle: payload.unearthedByHandle,
                    mapImage: nil
                )
                .scaleEffect(0.28)
                .frame(width: 302, height: 538)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 420)
        .padding(.horizontal, 36)
    }

    private func renderCard() async {
        isRendering = true
        defer { isRendering = false }
        renderedImage = await ShareCardRenderer.render(
            gemName: payload.gemName,
            categoryName: payload.categoryName,
            unearthedByHandle: payload.unearthedByHandle,
            coordinate: payload.coordinate
        )
    }

    private func shareToInstagramStories() {
        guard let renderedImage else { return }
        let ok = InstagramStoriesSharer.share(image: renderedImage)
        if !ok {
            toastMessage = "Couldn’t open Instagram Stories"
            showShareSheet = true
        }
    }
}

// MARK: - UIKit share sheet

private struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Instagram Stories

enum InstagramStoriesSharer {
    private static let storiesURL = URL(string: "instagram-stories://share")!

    static var isAvailable: Bool {
        UIApplication.shared.canOpenURL(storiesURL)
    }

    /// Pastes the image as a Stories background sticker and opens Instagram.
    @discardableResult
    static func share(image: UIImage) -> Bool {
        guard isAvailable, let png = image.pngData() else { return false }

        let pasteboardItems: [[String: Any]] = [[
            "com.instagram.sharedSticker.backgroundImage": png,
        ]]
        UIPasteboard.general.setItems(
            pasteboardItems,
            options: [.expirationDate: Date().addingTimeInterval(60 * 5)]
        )
        UIApplication.shared.open(storiesURL)
        return true
    }
}

#Preview("ShareOfferSheet") {
    ShareOfferSheet(
        payload: ShareOfferPayload(
            gemName: "Hidden Ramen Alley",
            categoryName: "Food",
            unearthedByHandle: "ryan",
            coordinate: CLLocationCoordinate2D(latitude: 12.97, longitude: 77.59),
            successMessage: "You unearthed Hidden Ramen Alley",
            gem: nil
        ),
        onFinished: {}
    )
}
