import SwiftUI

enum ChipStyle {
    case map
    case form
}

struct Chip: View {
    let title: String
    var isSelected: Bool = false
    var style: ChipStyle = .map
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(UnearthFont.chip(selected: isSelected))
                .foregroundStyle(foreground)
                .padding(.horizontal, 14)
                .frame(height: 36)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay {
                    if !isSelected && style == .form {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(UnearthColor.fieldBorder, lineWidth: 1)
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private var foreground: Color {
        isSelected ? UnearthColor.surface : UnearthColor.ink
    }

    private var background: Color {
        isSelected ? UnearthColor.ink : UnearthColor.surface
    }
}

#Preview("Chip") {
    VStack(alignment: .leading, spacing: 12) {
        HStack {
            Chip(title: "Food", isSelected: true, style: .map)
            Chip(title: "Café", isSelected: false, style: .map)
        }
        HStack {
            Chip(title: "Trail", isSelected: true, style: .form)
            Chip(title: "Shop", isSelected: false, style: .form)
        }
    }
    .padding()
    .background(UnearthColor.formBackground)
}
