import SwiftUI

struct PickHandleView: View {
    var auth: AuthService
    var onContinue: () -> Void

    @State private var handle = ""
    @State private var availability: Bool?
    @State private var isChecking = false
    @State private var checkTask: Task<Void, Never>?
    @State private var errorMessage: String?

    private var cleaned: String {
        handle.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private var isFormatValid: Bool {
        cleaned.range(of: "^[a-z0-9_]{3,20}$", options: .regularExpression) != nil
    }

    private var isValid: Bool {
        isFormatValid && availability == true
    }

    private var statusText: String? {
        if cleaned.isEmpty { return nil }
        if !isFormatValid {
            return "3–20 lowercase letters, numbers, or underscore"
        }
        if isChecking {
            return "Checking…"
        }
        if let availability {
            return availability ? "Available" : "Taken"
        }
        return nil
    }

    private var statusColor: Color {
        if !isFormatValid { return UnearthColor.amber }
        if availability == true { return UnearthColor.green }
        if availability == false { return UnearthColor.amber }
        return UnearthColor.inkSecondary
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Pick a handle")
                    .font(UnearthFont.sheetTitle())
                    .foregroundStyle(UnearthColor.ink)
                Text("This is how other prospectors will find you when you Unearth gems.")
                    .font(UnearthFont.body())
                    .foregroundStyle(UnearthColor.inkSecondary)
                    .bodyLineSpacing()
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Handle")
                    .font(UnearthFont.label())
                    .foregroundStyle(UnearthColor.ink)

                HStack(spacing: 4) {
                    Text("@")
                        .font(UnearthFont.body())
                        .foregroundStyle(UnearthColor.inkSecondary)
                    TextField("yourhandle", text: $handle)
                        .font(UnearthFont.body())
                        .foregroundStyle(UnearthColor.ink)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: handle) { _, newValue in
                            let filtered = newValue
                                .lowercased()
                                .filter { $0.isLetter || $0.isNumber || $0 == "_" }
                            if filtered != newValue {
                                handle = String(filtered.prefix(20))
                            } else if newValue.count > 20 {
                                handle = String(newValue.prefix(20))
                            }
                            scheduleAvailabilityCheck()
                        }
                }
                .padding(.horizontal, 14)
                .frame(height: 48)
                .background(UnearthColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(UnearthColor.fieldBorder, lineWidth: 1)
                }

                if let statusText {
                    Text(statusText)
                        .font(UnearthFont.bodySmall())
                        .foregroundStyle(statusColor)
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(UnearthFont.bodySmall())
                    .foregroundStyle(UnearthColor.amber)
            }

            Spacer()

            PrimaryButton(title: "Continue", isEnabled: isValid) {
                Task {
                    let ok = await auth.completeHandle(cleaned)
                    if ok {
                        onContinue()
                    } else {
                        errorMessage = auth.lastError ?? "Could not save handle"
                    }
                }
            }
        }
        .padding(24)
        .background(UnearthColor.formBackground.ignoresSafeArea())
    }

    private func scheduleAvailabilityCheck() {
        checkTask?.cancel()
        availability = nil
        guard isFormatValid else {
            isChecking = false
            return
        }
        isChecking = true
        let value = cleaned
        checkTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            guard !Task.isCancelled else { return }
            let result = await auth.isHandleAvailable(value)
            guard !Task.isCancelled else { return }
            availability = result
            isChecking = false
        }
    }
}

#Preview("PickHandleView") {
    PickHandleView(auth: AuthService(), onContinue: {})
}
