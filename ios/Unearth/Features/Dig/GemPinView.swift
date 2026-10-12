import SwiftUI

struct GemPinView: View {
    let category: Category
    var isSelected: Bool = false

    private var size: CGFloat { isSelected ? 52 : 36 }
    private var borderWidth: CGFloat { isSelected ? 4 : 3 }

    var body: some View {
        ZStack {
            Circle()
                .fill(category.pinColor)
                .overlay {
                    Circle()
                        .strokeBorder(UnearthColor.surface, lineWidth: borderWidth)
                }
                .frame(width: size, height: size)

            if isSelected {
                Image(systemName: "diamond.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(UnearthColor.surface)
            }
        }
        .frame(width: size, height: size)
        .pinShadow()
        .animation(.spring(response: 0.32, dampingFraction: 0.78), value: isSelected)
    }
}

/// Green teardrop map pin used on Gem detail header map (40pt, 4pt white border).
struct GemTeardropPin: View {
    var size: CGFloat = 40
    var borderWidth: CGFloat = 4

    var body: some View {
        ZStack {
            TeardropShape()
                .fill(UnearthColor.green)
            TeardropShape()
                .stroke(UnearthColor.surface, lineWidth: borderWidth)
        }
        .frame(width: size, height: size * 1.35)
        .pinShadow()
    }
}

private struct TeardropShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let tip = CGPoint(x: rect.midX, y: rect.maxY)
        let center = CGPoint(x: rect.midX, y: rect.minY + w * 0.42)
        let radius = w * 0.42

        var path = Path()
        path.addArc(
            center: center,
            radius: radius,
            startAngle: .degrees(210),
            endAngle: .degrees(-30),
            clockwise: false
        )
        path.addLine(to: tip)
        path.closeSubpath()
        return path
    }
}

#Preview("GemPinView") {
    HStack(spacing: 24) {
        GemPinView(category: .food)
        GemPinView(category: .viewpoint, isSelected: true)
        GemTeardropPin()
    }
    .padding()
    .background(UnearthColor.formBackground)
}
