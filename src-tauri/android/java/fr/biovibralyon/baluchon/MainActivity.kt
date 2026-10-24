package fr.biovibralyon.baluchon

import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat

// Notre activité principale, copiée dans le projet Android généré avant chaque construction
// (scripts/projet-android.mjs) : « tauri android init » la recrée sans nos retouches.
class MainActivity : TauriActivity() {
  // Sous Android 11, le moteur de pages ne dit pas à la page où sont les barres système : l'en-tête
  // passait sous l'heure (Asus, Android 7.1, 24 octobre 2026). L'appli ne s'étend dessous qu'au-delà.
  private val sousLesBarres = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R

  override fun onCreate(savedInstanceState: Bundle?) {
    if (sousLesBarres) {
      // Le contenu s'étend sous les barres système ; la page se range entre elles (src/styles/socle.css).
      enableEdgeToEdge()
    } else {
      // Entre les barres : noires, jamais le violet du modèle Tauri ; la fenêtre se réduit quand le
      // clavier s'ouvre, pour que le champ touché reste au-dessus de lui.
      window.statusBarColor = Color.BLACK
      window.navigationBarColor = Color.BLACK
      window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
    }
    super.onCreate(savedInstanceState)
  }

  // Le manifeste garde l'activité ouverte quand le thème de l'appareil change (configChanges « uiMode ») :
  // onCreate ne repasse pas. On redonne donc ici à l'heure, à la batterie et aux boutons du bas une
  // couleur lisible sur le nouveau fond (recette du 6 octobre 2026 : sombres sur fond sombre).
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    // Sur des barres noires, l'heure et les boutons restent clairs, quel que soit le thème.
    if (!sousLesBarres) return
    val sombre = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !sombre
      isAppearanceLightNavigationBars = !sombre
    }
  }
}
