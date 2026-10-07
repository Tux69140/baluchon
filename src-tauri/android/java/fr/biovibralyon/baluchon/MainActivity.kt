package fr.biovibralyon.baluchon

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat

// Notre activité principale, copiée dans le projet Android généré avant chaque construction
// (scripts/projet-android.mjs) : « tauri android init » la recrée sans nos retouches.
class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Le contenu s'étend sous les barres système ; la page se range entre elles (src/styles/socle.css).
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // Le manifeste garde l'activité ouverte quand le thème de l'appareil change (configChanges « uiMode ») :
  // onCreate ne repasse pas. On redonne donc ici à l'heure, à la batterie et aux boutons du bas une
  // couleur lisible sur le nouveau fond (recette du 6 octobre 2026 : sombres sur fond sombre).
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    val sombre = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !sombre
      isAppearanceLightNavigationBars = !sombre
    }
  }
}
