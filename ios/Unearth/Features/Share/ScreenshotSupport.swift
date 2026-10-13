import CoreLocation
import Foundation

#if DEBUG
enum ScreenshotScene: String {
    case signin
    case handle
    case location
    case dig
    case digList
    case gem
    case unearth
    case stash
    case activity
    case profile
    case share

    static var current: ScreenshotScene? {
        guard ProcessInfo.processInfo.arguments.contains("-screenshotDemo") else { return nil }
        guard let raw = ProcessInfo.processInfo.arguments
            .first(where: { $0.hasPrefix("-screenshotScene=") })?
            .split(separator: "=").last
            .map(String.init)
        else {
            return .dig
        }
        return ScreenshotScene(rawValue: raw)
    }

    static var isDemo: Bool {
        ProcessInfo.processInfo.arguments.contains("-screenshotDemo")
    }
}
#endif
