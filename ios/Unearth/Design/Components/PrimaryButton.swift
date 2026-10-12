import SwiftUI

struct PrimaryButton: View {
    let title: String
    var systemImage: String? = nil
    var isLarge: Bool = false
    var isEnabled: Bool = true
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 16, weight: .semibold))
                }
                Text(title)
                    .font(isLarge ? UnearthFont.buttonLarge() : UnearthFont.button())
            }
            .foregroundStyle(UnearthColor.surface)
            .frame(maxWidth: .infinity)
            .frame(height: isLarge ? 52 : 50)
            .background(isEnabled ? UnearthColor.green : UnearthColor.green.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(PrimaryPressStyle())
        .disabled(!isEnabled)
    }
}

private struct PrimaryPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.92 : 1)
            .overlay {
                if configuration.isPressed {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(UnearthColor.greenPressed.opacity(0.35))
                }
            }
    }
}

#Preview("PrimaryButton") {
    VStack(spacing: 12) {
        PrimaryButton(title: "I found it too") {}
        PrimaryButton(title: "Unearth", isLarge: true) {}
    }
    .padding()
}
