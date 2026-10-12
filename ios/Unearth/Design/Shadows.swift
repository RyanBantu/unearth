import SwiftUI

enum UnearthShadow {
    static func floating(_ color: Color = UnearthColor.ink) -> some View {
        EmptyView()
    }
}

extension View {
    func floatingShadow() -> some View {
        self.shadow(color: UnearthColor.ink.opacity(0.12), radius: 10, x: 0, y: 2)
    }

    func sheetShadow() -> some View {
        self.shadow(color: UnearthColor.ink.opacity(0.12), radius: 24, x: 0, y: -6)
    }

    func pinShadow() -> some View {
        self.shadow(color: UnearthColor.ink.opacity(0.30), radius: 14, x: 0, y: 4)
    }
}
