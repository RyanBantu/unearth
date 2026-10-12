import SwiftUI

struct LocationPermissionView: View {
    var locationService: LocationService
    var onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Enable location for Dig")
                    .font(UnearthFont.sheetTitle())
                    .foregroundStyle(UnearthColor.ink)
                Text("Unearth uses your location while you Dig so nearby gems show on the map and distance stays accurate. We never track you in the background.")
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .bodyLineSpacing()
            }

            HStack(spacing: 12) {
                Image(systemName: "map.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(UnearthColor.green)
                    .frame(width: 56, height: 56)
                    .background(UnearthColor.greenTint)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Dig map")
                        .font(UnearthFont.cardTitle())
                        .foregroundStyle(UnearthColor.ink)
                    Text("See gems around you and center on your spot.")
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(UnearthColor.inkSecondary)
                }
            }

            Spacer()

            VStack(spacing: 12) {
                PrimaryButton(title: "Allow location") {
                    locationService.requestWhenInUse()
                    onContinue()
                }
                OutlineButton(title: "Not now") {
                    onContinue()
                }
            }
        }
        .padding(24)
        .background(UnearthColor.formBackground.ignoresSafeArea())
    }
}

#Preview("LocationPermissionView") {
    LocationPermissionView(locationService: LocationService(), onContinue: {})
}
