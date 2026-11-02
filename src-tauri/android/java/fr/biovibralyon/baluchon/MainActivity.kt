package fr.biovibralyon.baluchon

import android.Manifest
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
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
    if (sousLesBarres) laisserLaPlaceAuClavier()
  }

  // Sous les barres, Android ne réduit plus la fenêtre quand le clavier s'ouvre : il recouvrait le bas
  // de la page, dont le bouton « Enregistrer » des fiches et « Suivant » de l'assistant (tablette et
  // téléphone, phase 14). La page s'arrête donc au bord du clavier ; la barre du bas étant alors sous
  // lui, le moteur de pages la compte à 0 (--zone-bas, src/styles/jetons.css) : rien n'est perdu.
  private fun laisserLaPlaceAuClavier() {
    val contenu = findViewById<android.view.View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(contenu) { vue, encarts ->
      vue.setPadding(0, 0, 0, encarts.getInsets(WindowInsetsCompat.Type.ime()).bottom)
      encarts
    }
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

    // Les barres système prennent la couleur du thème réellement affiché par la page (phase 12) : icônes
    // sombres sur fond clair, claires sur fond sombre. Sans effet sous Android 11, où les barres restent
    // noires à icônes claires (sinon l'heure disparaît). Une fois la page à la barre, l'activité ne
    // règle plus rien d'elle-même au changement de thème de l'appareil : la page le suit et renvoie ici.
    @JavascriptInterface
    fun reglerBarres(sombre: Boolean) {
      if (!sousLesBarres) return
      pageReglesLesBarres = true
      runOnUiThread { colorerBarres(sombre) }
    }

    // Dépose un fichier texte dans Téléchargements sans jamais en remplacer un (sauvegarde, phase 12).
    // La page n'attend pas : la réponse revient par window.baluchonDepose(numero, reponse), « depose »,
    // « existe », « refuse » (autorisation d'écrire refusée) ou « erreur:… ».
    @JavascriptInterface
    fun deposer(numero: String, nom: String, texte: String) {
      Thread { deposerOuDemander(Depot(numero, nom, texte)) }.start()
    }

    // Ouvre une adresse du site dans le navigateur du système (écran « À propos », phase 13). Seules les
    // adresses https:// sont suivies : jamais un fichier local ni une adresse non chiffrée. Sans navigateur
    // installé, rien ne s'ouvre et l'appli continue.
    @JavascriptInterface
    fun ouvrirLien(adresse: String) {
      if (!adresse.startsWith("https://")) return
      runOnUiThread {
        try {
          startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(adresse)))
        } catch (e: Exception) {
          Log.w("Baluchon", "Aucun navigateur pour ouvrir le lien", e)
        }
      }
    }
  }

  // Écrit par le pont de la page, lu sur le fil de l'interface.
  @Volatile
  private var pageReglesLesBarres = false

  private fun colorerBarres(sombre: Boolean) {
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !sombre
      isAppearanceLightNavigationBars = !sombre
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
      // Le nom vient de la page : jamais un chemin, qui sortirait de Téléchargements.
      if (depot.nom.isEmpty() || depot.nom.contains('/') || depot.nom.contains("..")) {
        throw Exception("nom de fichier refusé")
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        repondre(depot, deposerParLeMagasin(depot))
      } else if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
        repondre(depot, deposerDansLeDossier(depot))
      } else {
        // Une seule demande à la fois : redemander pendant que la boîte est ouverte ferait répondre Android
        // aussitôt par des tableaux vides, lus comme un refus alors que l'utilisateur n'a pas encore choisi.
        val aucuneDemandeEnCours = synchronized(depotsEnAttente) {
          val vide = depotsEnAttente.isEmpty()
          depotsEnAttente.add(depot)
          vide
        }
        if (aucuneDemandeEnCours) {
          runOnUiThread {
            requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), demandeAutorisation)
          }
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
    // Le fichier est écrit : si seule la déclaration échoue, il se retrouve par le gestionnaire de fichiers.
    try {
      (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).addCompletedDownload(
        depot.nom, depot.nom, true, "application/json", fichier.absolutePath, octets.size.toLong(), false,
      )
    } catch (e: Exception) {
      Log.w("Baluchon", "Déclaration du téléchargement impossible", e)
    }
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
    if (!sousLesBarres || pageReglesLesBarres) return
    val sombre = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    colorerBarres(sombre)
  }
}
