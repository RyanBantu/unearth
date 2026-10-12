import SwiftUI

struct Field: View {
    let label: String
    var placeholder: String = ""
    @Binding var text: String
    var isSecure: Bool = false

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(UnearthFont.label())
                .foregroundStyle(UnearthColor.ink)

            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .font(UnearthFont.body())
            .foregroundStyle(UnearthColor.ink)
            .padding(.horizontal, 14)
            .frame(height: 48)
            .background(UnearthColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(
                        isFocused ? UnearthColor.green : UnearthColor.fieldBorder,
                        lineWidth: isFocused ? 1.5 : 1
                    )
            }
            .focused($isFocused)
        }
    }
}

#Preview("Field") {
    @Previewable @State var value = ""
    Field(label: "Handle", placeholder: "yourhandle", text: $value)
        .padding()
        .background(UnearthColor.formBackground)
}
