package fr.biovibralyon.baluchon

import android.Manifest
import android.app.DownloadManager
import android.content.ContentValues
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import java.io.File
import org.json.JSONObject

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

  // À l'accueil, la touche retour met l'appli en arrière-plan, comme Android le fait depuis sa version 12,
  // au lieu de la fermer (décision du chef de projet, 2026-10-25) : la page n'en a pas le moyen, l'activité
  // le lui donne (window.BaluchonAndroid, lu par src/stockage/tauri.js). La page appelle depuis un fil
  // à part : l'activité passe sur celui de l'interface.
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    pageWeb = webView
    webView.addJavascriptInterface(Passerelle(), "BaluchonAndroid")
  }

  private var pageWeb: WebView? = null

  inner class Passerelle {
    @JavascriptInterface
    fun mettreEnArrierePlan() {
      runOnUiThread { moveTaskToBack(true) }
    }

    // Dépose un fichier texte dans Téléchargements sans jamais en remplacer un (sauvegarde, phase 12).
    // La page n'attend pas : la réponse revient par window.baluchonDepose(numero, reponse), « depose »,
    // « existe », « refuse » (autorisation d'écrire refusée) ou « erreur:… ».
    @JavascriptInterface
    fun deposer(numero: String, nom: String, texte: String) {
      Thread { deposerOuDemander(Depot(numero, nom, texte)) }.start()
    }
  }

  private class Depot(val numero: String, val nom: String, val texte: String)

  private val depotsEnAttente = mutableListOf<Depot>()
  private val demandeAutorisation = 4242

  // Android 10 et plus : le magasin de fichiers du système, sans autorisation. Android 7 à 9 : écriture
  // directe, qui demande l'autorisation d'écrire à la première sauvegarde ; on enchaîne d'elle-même
  // après l'accord (onRequestPermissionsResult). Recette vérifiée sur cinq appareils le 31 octobre 2026.
  private fun deposerOuDemander(depot: Depot) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        repondre(depot, deposerParLeMagasin(depot))
      } else if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
        repondre(depot, deposerDansLeDossier(depot))
      } else {
        synchronized(depotsEnAttente) { depotsEnAttente.add(depot) }
        runOnUiThread {
          requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), demandeAutorisation)
        }
      }
    } catch (e: Exception) {
      repondre(depot, "erreur:" + (e.message ?: e.javaClass.simpleName))
    }
  }

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode != demandeAutorisation) return
    val accordee = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
    val depots = synchronized(depotsEnAttente) { depotsEnAttente.toList().also { depotsEnAttente.clear() } }
    Thread {
      for (depot in depots) {
        if (!accordee) {
          repondre(depot, "refuse")
          continue
        }
        try {
          repondre(depot, deposerDansLeDossier(depot))
        } catch (e: Exception) {
          repondre(depot, "erreur:" + (e.message ?: e.javaClass.simpleName))
        }
      }
    }.start()
  }

  private fun deposerParLeMagasin(depot: Depot): String {
    val chemin = Environment.DIRECTORY_DOWNLOADS + "/"
    // Le magasin renomme de lui-même un nom pris (« nom (1).json ») au lieu de refuser : on cherche d'abord.
    contentResolver.query(
      MediaStore.Downloads.EXTERNAL_CONTENT_URI,
      arrayOf(MediaStore.Downloads._ID),
      "${MediaStore.Downloads.DISPLAY_NAME} = ? AND ${MediaStore.Downloads.RELATIVE_PATH} = ?",
      arrayOf(depot.nom, chemin),
      null,
    )?.use { if (it.moveToFirst()) return "existe" }
    val valeurs = ContentValues().apply {
      put(MediaStore.Downloads.DISPLAY_NAME, depot.nom)
      put(MediaStore.Downloads.MIME_TYPE, "application/json")
      put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
    }
    val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, valeurs)
      ?: throw Exception("Téléchargements inaccessible")
    // Un fichier d'une autre appli, invisible pour nous, a pu faire renommer le nôtre : on le retire.
    val nomObtenu = contentResolver.query(uri, arrayOf(MediaStore.Downloads.DISPLAY_NAME), null, null, null)
      ?.use { if (it.moveToFirst()) it.getString(0) else null }
    if (nomObtenu != null && nomObtenu != depot.nom) {
      contentResolver.delete(uri, null, null)
      return "existe"
    }
    try {
      val sortie = contentResolver.openOutputStream(uri) ?: throw Exception("Écriture impossible")
      sortie.use { it.write(depot.texte.toByteArray(Charsets.UTF_8)) }
    } catch (e: Exception) {
      contentResolver.delete(uri, null, null)
      throw e
    }
    return "depose"
  }

  // Android 7 à 9. Sans la déclaration comme téléchargement terminé, le raccourci « Téléchargements » du
  // sélecteur de fichiers ne montre pas le fichier (introuvable sur la SM-T550, Android 7.1).
  @Suppress("DEPRECATION")
  private fun deposerDansLeDossier(depot: Depot): String {
    val dossier = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    dossier.mkdirs()
    val fichier = File(dossier, depot.nom)
    // createNewFile refuse net un nom pris : jamais d'écrasement.
    if (!fichier.createNewFile()) return "existe"
    val octets = depot.texte.toByteArray(Charsets.UTF_8)
    try {
      fichier.writeBytes(octets)
    } catch (e: Exception) {
      fichier.delete()
      throw e
    }
    MediaScannerConnection.scanFile(this, arrayOf(fichier.absolutePath), arrayOf("application/json"), null)
    (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).addCompletedDownload(
      depot.nom, depot.nom, true, "application/json", fichier.absolutePath, octets.size.toLong(), false,
    )
    return "depose"
  }

  private fun repondre(depot: Depot, reponse: String) {
    val script = "window.baluchonDepose(${JSONObject.quote(depot.numero)}, ${JSONObject.quote(reponse)})"
    runOnUiThread { pageWeb?.evaluateJavascript(script, null) }
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
