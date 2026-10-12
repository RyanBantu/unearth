import SwiftUI

/// Vector logo matching `Resources/Brand/unearth-logo.svg`.
struct UnearthLogo: View {
    var size: CGFloat = 96

    var body: some View {
        Canvas { context, canvasSize in
            let scale = min(canvasSize.width, canvasSize.height) / 100
            context.scaleBy(x: scale, y: scale)

            // Background rounded rect — #E3F0E8 (greenTint)
            let bg = Path(roundedRect: CGRect(x: 0, y: 0, width: 100, height: 100), cornerRadius: 22.5)
            context.fill(bg, with: .color(UnearthColor.greenTint))

            // U stroke — #1F6B4F, width 15, round caps
            // path: M28 28v24a22 22 0 0 0 44 0V28
            var u = Path()
            u.move(to: CGPoint(x: 28, y: 28))
            u.addLine(to: CGPoint(x: 28, y: 52))
            u.addArc(
                center: CGPoint(x: 50, y: 52),
                radius: 22,
                startAngle: .degrees(180),
                endAngle: .degrees(0),
                clockwise: true
            )
            u.addLine(to: CGPoint(x: 72, y: 28))
            context.stroke(
                u,
                with: .color(UnearthColor.green),
                style: StrokeStyle(lineWidth: 15, lineCap: .round, lineJoin: .round)
            )

            // Gem — #A85F0A (amberPin)
            // path: M39 44l5-7h12l5 7-11 13z
            var gem = Path()
            gem.move(to: CGPoint(x: 39, y: 44))
            gem.addLine(to: CGPoint(x: 44, y: 37))
            gem.addLine(to: CGPoint(x: 56, y: 37))
            gem.addLine(to: CGPoint(x: 61, y: 44))
            gem.addLine(to: CGPoint(x: 50, y: 57))
            gem.closeSubpath()
            context.fill(gem, with: .color(UnearthColor.amberPin))
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Unearth")
    }
}

#Preview("UnearthLogo") {
    UnearthLogo(size: 120)
        .padding()
        .background(UnearthColor.formBackground)
}
