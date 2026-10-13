import SwiftUI

struct TermsAgreeView: View {
    var auth: AuthService
    var onAgreed: () -> Void

    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                Spacer(minLength: 0)
                UnearthLogo(size: 64)
                Spacer(minLength: 0)
            }
            .padding(.top, 8)

            VStack(alignment: .leading, spacing: 8) {
                Text("Terms of Use")
                    .font(UnearthFont.sheetTitle())
                    .foregroundStyle(UnearthColor.ink)
                Text(
                    "Post public places only. No abusive, hateful or sexual content, spam or private homes. We remove reported content within 24 hours and ban users who break the rules."
                )
                .font(UnearthFont.body())
                .foregroundStyle(UnearthColor.inkSecondary)
                .bodyLineSpacing()
            }

            Link(destination: UnearthLinks.termsOfUse) {
                HStack(spacing: 8) {
                    Text("Read the full Terms of Use")
                        .font(UnearthFont.button())
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(UnearthColor.green)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.amber)
            }

            Spacer(minLength: 0)

            PrimaryButton(title: isSaving ? "Saving…" : "I agree") {
                Task { await agree() }
            }
            .disabled(isSaving)
            .padding(.bottom, 8)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(UnearthColor.formBackground.ignoresSafeArea())
    }

    private func agree() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        let ok = await auth.agreeToTerms()
        if ok {
            onAgreed()
        } else {
            errorMessage = auth.lastError ?? "Couldn’t save your agreement. Try again."
        }
    }
}

#Preview("TermsAgreeView") {
    TermsAgreeView(auth: AuthService(), onAgreed: {})
}
