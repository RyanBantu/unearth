import SwiftUI

enum UnearthColor {
    static let ink = Color(hex: 0x15201B)
    static let inkSecondary = Color(hex: 0x56635C)
    static let inkTertiary = Color(hex: 0x3E4A44)
    static let green = Color(hex: 0x1F6B4F)
    static let greenPressed = Color(hex: 0x154D39)
    static let greenTint = Color(hex: 0xE3F0E8)
    static let amber = Color(hex: 0x8A4D06)
    static let amberPin = Color(hex: 0xA85F0A)
    static let amberTint = Color(hex: 0xFDF0DD)
    static let amberDeep = Color(hex: 0x5C3404)
    static let neutralChip = Color(hex: 0xF1F2EF)
    static let border = Color(hex: 0xE1E6E2)
    static let fieldBorder = Color(hex: 0xD5DBD7)
    static let divider = Color(hex: 0xE6EAE7)
    static let formBackground = Color(hex: 0xF6F7F5)
    static let surface = Color(hex: 0xFFFFFF)
    static let grabber = Color(hex: 0xCDD3CF)
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}
