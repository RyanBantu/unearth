import SwiftUI

enum UnearthFont {
    static func gemTitle(_ size: CGFloat = 28) -> Font {
        .custom("BricolageGrotesque-Bold", size: size, relativeTo: .largeTitle)
    }

    static func sheetTitle(_ size: CGFloat = 22) -> Font {
        .custom("BricolageGrotesque-Bold", size: size, relativeTo: .title2)
    }

    static func cardTitle(_ size: CGFloat = 18) -> Font {
        .custom("BricolageGrotesque-Bold", size: size, relativeTo: .headline)
    }

    static func navTitle(_ size: CGFloat = 18) -> Font {
        .custom("BricolageGrotesque-Bold", size: size, relativeTo: .headline)
    }

    static func body(_ size: CGFloat = 15) -> Font {
        .custom("DMSans-Regular", size: size, relativeTo: .body)
    }

    static func bodySmall(_ size: CGFloat = 14) -> Font {
        .custom("DMSans-Regular", size: size, relativeTo: .subheadline)
    }

    static func medium(_ size: CGFloat = 16) -> Font {
        .custom("DMSans-Medium", size: size, relativeTo: .body)
    }

    static func button(_ size: CGFloat = 16) -> Font {
        .custom("DMSans-SemiBold", size: size, relativeTo: .body)
    }

    static func buttonLarge(_ size: CGFloat = 17) -> Font {
        .custom("DMSans-SemiBold", size: size, relativeTo: .body)
    }

    static func label(_ size: CGFloat = 13) -> Font {
        .custom("DMSans-SemiBold", size: size, relativeTo: .caption)
    }

    static func badge(_ size: CGFloat = 12) -> Font {
        .custom("DMSans-SemiBold", size: size, relativeTo: .caption2)
    }

    static func tab(active: Bool, size: CGFloat = 11) -> Font {
        .custom(active ? "DMSans-SemiBold" : "DMSans-Medium", size: size, relativeTo: .caption2)
    }

    static func chip(selected: Bool, size: CGFloat = 14) -> Font {
        .custom(selected ? "DMSans-SemiBold" : "DMSans-Medium", size: size, relativeTo: .subheadline)
    }

    static func tag(_ size: CGFloat = 13) -> Font {
        .custom("DMSans-Regular", size: size, relativeTo: .caption)
    }
}

extension View {
    /// Gem titles use 1.1 line height relative to font size.
    func gemTitleLineHeight() -> some View {
        self.lineSpacing(28 * 0.1)
    }

    /// Body uses ~1.5 line spacing relative to 15pt.
    func bodyLineSpacing() -> some View {
        self.lineSpacing(15 * 0.5)
    }
}
