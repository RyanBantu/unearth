import SwiftUI

struct TagChip: View {
    let title: String

    var body: some View {
        Text(title)
            .font(UnearthFont.tag())
            .foregroundStyle(UnearthColor.ink)
            .padding(.vertical, 6)
            .padding(.horizontal, 10)
            .background(UnearthColor.neutralChip)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

#Preview("TagChip") {
    HStack {
        TagChip(title: "First find")
        TagChip(title: "Food")
    }
    .padding()
}
