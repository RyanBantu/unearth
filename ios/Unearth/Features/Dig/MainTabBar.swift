import SwiftUI

enum MainTab: Hashable {
    case dig
    case stash
    case unearth
    case activity
    case profile
}

struct MainTabBar: View {
    @Binding var selected: MainTab
    var onUnearth: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            tabButton(.dig, title: "Dig", systemImage: "map")
            tabButton(.stash, title: "Stash", systemImage: "bookmark")

            Button(action: onUnearth) {
                Image(systemName: "plus")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(UnearthColor.surface)
                    .frame(width: 56, height: 44)
                    .background(UnearthColor.green)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)

            tabButton(.activity, title: "Activity", systemImage: "bell")
            tabButton(.profile, title: "Profile", systemImage: "person")
        }
        .padding(.horizontal, 8)
        .padding(.top, 10)
        .frame(maxWidth: .infinity)
        .frame(height: 84)
        .background(UnearthColor.surface.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) {
            UnearthColor.divider.frame(height: 1)
        }
    }

    private func tabButton(_ tab: MainTab, title: String, systemImage: String) -> some View {
        let isActive = selected == tab
        return Button {
            selected = tab
        } label: {
            VStack(spacing: 4) {
                Image(systemName: systemImage)
                    .font(.system(size: 20, weight: isActive ? .semibold : .regular))
                Text(title)
                    .font(UnearthFont.tab(active: isActive))
            }
            .foregroundStyle(isActive ? UnearthColor.green : UnearthColor.inkSecondary)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

#Preview("MainTabBar") {
    @Previewable @State var tab: MainTab = .dig
    VStack {
        Spacer()
        MainTabBar(selected: $tab, onUnearth: {})
    }
    .background(UnearthColor.formBackground)
}
