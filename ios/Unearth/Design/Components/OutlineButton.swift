import SwiftUI

struct OutlineButton: View {
    let title: String
    var isLarge: Bool = false
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(isLarge ? UnearthFont.buttonLarge() : UnearthFont.button())
                .foregroundStyle(UnearthColor.green)
                .frame(maxWidth: .infinity)
                .frame(height: isLarge ? 52 : 50)
                .background(UnearthColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(UnearthColor.green, lineWidth: 1.5)
                }
        }
        .buttonStyle(.plain)
    }
}

#Preview("OutlineButton") {
    OutlineButton(title: "Skip for now") {}
        .padding()
}
