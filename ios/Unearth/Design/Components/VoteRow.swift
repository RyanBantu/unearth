import SwiftUI

enum GemVote: Int, Hashable {
    case up = 1
    case down = -1
}

struct VoteRow: View {
    var upvotes: Int
    var downvotes: Int
    var myVote: GemVote?
    var onTapUp: () -> Void
    var onTapDown: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            votePill(
                systemName: "hand.thumbsup",
                count: upvotes,
                selected: myVote == .up,
                selectedTint: UnearthColor.greenTint,
                selectedForeground: UnearthColor.green,
                accessibilityName: "Upvote",
                action: onTapUp
            )
            votePill(
                systemName: "hand.thumbsdown",
                count: downvotes,
                selected: myVote == .down,
                selectedTint: UnearthColor.amberTint,
                selectedForeground: UnearthColor.amber,
                accessibilityName: "Downvote",
                action: onTapDown
            )
        }
    }

    private func votePill(
        systemName: String,
        count: Int,
        selected: Bool,
        selectedTint: Color,
        selectedForeground: Color,
        accessibilityName: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: systemName)
                    .font(.system(size: 16, weight: .semibold))
                Text("\(count)")
                    .font(UnearthFont.button(15))
            }
            .foregroundStyle(selected ? selectedForeground : UnearthColor.ink)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(selected ? selectedTint : UnearthColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay {
                if !selected {
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .strokeBorder(UnearthColor.fieldBorder, lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(accessibilityName), \(count) votes")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

#Preview("VoteRow · no vote") {
    VoteRow(upvotes: 3, downvotes: 1, myVote: nil, onTapUp: {}, onTapDown: {})
        .padding()
        .background(UnearthColor.formBackground)
}

#Preview("VoteRow · upvoted") {
    VoteRow(upvotes: 4, downvotes: 1, myVote: .up, onTapUp: {}, onTapDown: {})
        .padding()
        .background(UnearthColor.formBackground)
}

#Preview("VoteRow · downvoted") {
    VoteRow(upvotes: 3, downvotes: 2, myVote: .down, onTapUp: {}, onTapDown: {})
        .padding()
        .background(UnearthColor.formBackground)
}

#Preview("VoteRow · own gem (hidden)") {
    // Own gem / find: parent hides this row entirely.
    Text("Vote row hidden for own gem")
        .font(UnearthFont.bodySmall())
        .foregroundStyle(UnearthColor.inkSecondary)
        .padding()
        .background(UnearthColor.formBackground)
}
