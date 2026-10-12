import SwiftUI

/// Shareable card layout — rendered via `ImageRenderer` after a map snapshot is ready.
struct ShareCardView: View {
    let gemName: String
    let categoryName: String
    let unearthedByHandle: String
    let mapImage: UIImage?

    /// Story-friendly canvas (9:16 at 1080pt width).
    static let canvasSize = CGSize(width: 1080, height: 1920)

    var body: some View {
        ZStack {
            background

            VStack(spacing: 0) {
                HStack {
                    UnearthLogo(size: 72)
                    Spacer(minLength: 0)
                    Text("Unearth")
                        .font(.custom("BricolageGrotesque-Bold", size: 34))
                        .foregroundStyle(UnearthColor.green)
                }
                .padding(.horizontal, 64)
                .padding(.top, 72)

                Spacer(minLength: 40)

                mapSnippet
                    .padding(.horizontal, 64)

                Spacer(minLength: 48)

                VStack(alignment: .leading, spacing: 20) {
                    Text(categoryName.uppercased())
                        .font(.custom("DMSans-SemiBold", size: 22))
                        .tracking(2)
                        .foregroundStyle(UnearthColor.green)

                    Text(gemName)
                        .font(.custom("BricolageGrotesque-Bold", size: 64))
                        .foregroundStyle(UnearthColor.ink)
                        .lineLimit(3)
                        .minimumScaleFactor(0.7)
                        .fixedSize(horizontal: false, vertical: true)

                    Text("Unearthed by @\(unearthedByHandle)")
                        .font(.custom("DMSans-Medium", size: 28))
                        .foregroundStyle(UnearthColor.inkSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 64)

                Spacer(minLength: 60)

                Text("Find it on Unearth")
                    .font(.custom("DMSans-Regular", size: 24))
                    .foregroundStyle(UnearthColor.inkTertiary)
                    .padding(.bottom, 80)
            }
        }
        .frame(width: Self.canvasSize.width, height: Self.canvasSize.height)
    }

    private var background: some View {
        LinearGradient(
            colors: [
                Color(hex: 0xE8F3EC),
                UnearthColor.formBackground,
                Color(hex: 0xF3F0E8),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var mapSnippet: some View {
        ZStack {
            if let mapImage {
                Image(uiImage: mapImage)
                    .resizable()
                    .scaledToFill()
            } else {
                UnearthColor.greenTint
            }

            // Pin sits on the center of the snapshot (snapshot is centered on the gem).
            GemTeardropPin(size: 56, borderWidth: 5)
                .offset(y: -18)
        }
        .frame(width: 952, height: 720)
        .clipShape(RoundedRectangle(cornerRadius: 40, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 40, style: .continuous)
                .strokeBorder(UnearthColor.surface.opacity(0.9), lineWidth: 4)
        }
        .shadow(color: UnearthColor.ink.opacity(0.12), radius: 28, y: 16)
    }
}

#Preview("ShareCardView") {
    ShareCardView(
        gemName: "Hidden Ramen Alley",
        categoryName: "Food",
        unearthedByHandle: "ryan",
        mapImage: nil
    )
    .scaleEffect(0.2)
    .frame(width: 216, height: 384)
}
