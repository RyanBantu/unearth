import SwiftUI

struct Toast: View {
    let message: String

    var body: some View {
        Text(message)
            .font(UnearthFont.bodySmall())
            .foregroundStyle(UnearthColor.surface)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(UnearthColor.ink)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .floatingShadow()
    }
}

struct ToastModifier: ViewModifier {
    @Binding var message: String?

    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let message {
                Toast(message: message)
                    .padding(.top, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        Task {
                            try? await Task.sleep(nanoseconds: 2_500_000_000)
                            withAnimation { self.message = nil }
                        }
                    }
            }
        }
        .animation(.easeInOut(duration: 0.25), value: message)
    }
}

extension View {
    func toast(_ message: Binding<String?>) -> some View {
        modifier(ToastModifier(message: message))
    }
}

#Preview("Toast") {
    ZStack {
        UnearthColor.formBackground.ignoresSafeArea()
        Toast(message: "Gem added to your Stash")
    }
}
