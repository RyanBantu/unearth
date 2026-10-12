import SwiftUI

struct RoundIconButton: View {
    let systemName: String
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(UnearthColor.ink)
                .frame(width: 44, height: 44)
                .background(UnearthColor.surface)
                .clipShape(Circle())
                .floatingShadow()
        }
        .buttonStyle(.plain)
    }
}

#Preview("RoundIconButton") {
    HStack(spacing: 16) {
        RoundIconButton(systemName: "magnifyingglass") {}
        RoundIconButton(systemName: "line.3.horizontal.decrease") {}
        RoundIconButton(systemName: "location") {}
    }
    .padding()
    .background(UnearthColor.formBackground)
}
