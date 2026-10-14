package app.unearth.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.unearth.data.api.UnearthApi
import app.unearth.data.model.GemDto
import app.unearth.data.session.SessionRepository
import app.unearth.data.session.SessionStep
import app.unearth.ui.components.MainTab
import app.unearth.ui.components.UnearthTabBar
import app.unearth.ui.dig.DigScreen
import app.unearth.ui.dig.DigViewModel
import app.unearth.ui.gem.GemScreen
import app.unearth.ui.onboarding.LocationExplainerScreen
import app.unearth.ui.onboarding.PickHandleScreen
import app.unearth.ui.onboarding.SignInScreen
import app.unearth.ui.onboarding.TermsScreen
import app.unearth.ui.share.ShareOffer
import app.unearth.ui.share.ShareOfferScreen
import app.unearth.ui.tabs.ActivityScreen
import app.unearth.ui.tabs.ProfileScreen
import app.unearth.ui.tabs.StashScreen
import app.unearth.ui.theme.UnearthColor
import app.unearth.ui.unearth.UnearthScreen

@Composable
fun UnearthRoot(session: SessionRepository, api: UnearthApi, deepLinkSlug: String?) {
    val state by session.state.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { session.bootstrap() }

    when (state.step) {
        SessionStep.Loading -> Box(Modifier.fillMaxSize().background(UnearthColor.FormBackground), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = UnearthColor.Green)
        }
        SessionStep.SignedOut -> SignInScreen(session)
        SessionStep.NeedsTerms -> TermsScreen(session)
        SessionStep.NeedsHandle -> PickHandleScreen(session)
        SessionStep.NeedsLocation -> LocationExplainerScreen(session)
        SessionStep.Ready -> HomeShell(session, api, state.user?.id, state.user, deepLinkSlug)
    }
}

@Composable
private fun HomeShell(
    session: SessionRepository,
    api: UnearthApi,
    currentUserId: String?,
    user: app.unearth.data.model.UserDto?,
    deepLinkSlug: String?,
) {
    var tab by remember { mutableStateOf(MainTab.Dig) }
    var gemId by remember { mutableStateOf<String?>(null) }
    var unearth by remember { mutableStateOf(false) }
    var findForGem by remember { mutableStateOf<GemDto?>(null) }
    var share by remember { mutableStateOf<ShareOffer?>(null) }
    var reopenAfterShare by remember { mutableStateOf<String?>(null) }
    val digVm: DigViewModel = hiltViewModel()

    LaunchedEffect(deepLinkSlug) {
        if (!deepLinkSlug.isNullOrBlank()) gemId = deepLinkSlug
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.weight(1f)) {
                when (tab) {
                    MainTab.Dig, MainTab.Unearth -> DigScreen(onGem = { gemId = it }, viewModel = digVm)
                    MainTab.Stash -> StashScreen(api) { gemId = it }
                    MainTab.Activity -> ActivityScreen(api) { gemId = it }
                    MainTab.Profile -> ProfileScreen(api, session, user) { gemId = it }
                }
            }
            UnearthTabBar(
                selected = if (tab == MainTab.Unearth) MainTab.Dig else tab,
                onSelect = { tab = it },
                onUnearth = { findForGem = null; unearth = true },
                modifier = Modifier.navigationBarsPadding(),
            )
        }

        val openGem = gemId
        if (openGem != null) {
            BackHandler { gemId = null }
            GemScreen(
                id = openGem,
                api = api,
                currentUserId = currentUserId,
                onBack = { gemId = null },
                onFound = { gem ->
                    findForGem = gem
                    gemId = null
                    unearth = true
                },
                onFindDeleted = { gemDeleted, message ->
                    if (gemDeleted) {
                        gemId = null
                        tab = MainTab.Dig
                        digVm.load()
                        digVm.showSnackbar(message)
                    }
                },
                onHidden = {
                    gemId = null
                    digVm.load()
                },
            )
        }

        if (unearth) {
            UnearthScreen(
                api = api,
                existingGemId = findForGem?.id,
                existingGemName = findForGem?.name,
                initialLocation = digVm.ui.value.myLocation ?: digVm.ui.value.center,
                onClose = {
                    val reopen = findForGem?.id
                    unearth = false
                    findForGem = null
                    if (reopen != null) gemId = reopen
                },
                onDone = { message, gem ->
                    val wasFind = findForGem != null
                    val reopen = findForGem?.id
                    unearth = false
                    findForGem = null
                    tab = MainTab.Dig
                    gem?.let(digVm::selectNewlyUnearthed)
                    digVm.showSnackbar(message)
                    digVm.load()
                    reopenAfterShare = if (wasFind) reopen else null
                    share = ShareOffer(
                        message = message,
                        gemName = gem?.name ?: "Gem",
                        category = gem?.category ?: "other",
                        handle = user?.handle ?: "prospector",
                        slug = gem?.slug,
                    )
                },
            )
        }

        share?.let { offer ->
            BackHandler {
                gemId = reopenAfterShare
                reopenAfterShare = null
                share = null
            }
            ShareOfferScreen(offer) {
                gemId = reopenAfterShare
                reopenAfterShare = null
                share = null
            }
        }
    }
}
