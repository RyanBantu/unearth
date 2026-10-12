import SwiftUI

struct Avatar: View {
    let handle: String
    var size: CGFloat = 40

    private var initial: String {
        String(handle.prefix(1)).uppercased()
    }

    var body: some View {
        Text(initial)
            .font(UnearthFont.button(size * 0.4))
            .foregroundStyle(UnearthColor.green)
            .frame(width: size, height: size)
            .background(UnearthColor.greenTint)
            .clipShape(Circle())
    }
}

#Preview("Avatar") {
    HStack(spacing: 12) {
        Avatar(handle: "ryan")
        Avatar(handle: "maya", size: 56)
    }
    .padding()
}
