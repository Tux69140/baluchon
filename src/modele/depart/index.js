// La bibliothèque de départ complète : 4 groupes d’étiquettes et 16 catégories, une par fichier de ce
// dossier. Au premier lancement, construireBibliotheque (src/modele/bibliotheque.js) la combine aux
// textes de la langue pour en faire les lignes de la bibliothèque de l’utilisateur. Les clés sont
// uniques dans tout l’ensemble : elles servent aussi de clés de traduction.
import { GROUPES } from './groupes.js';
import { papiersEtArgent } from './papiers-et-argent.js';
import { vetements } from './vetements.js';
import { chaussures } from './chaussures.js';
import { toilette } from './toilette.js';
import { pharmacie } from './pharmacie.js';
import { electronique } from './electronique.js';
import { bagagesEtRangement } from './bagages-et-rangement.js';
import { alimentation } from './alimentation.js';
import { confortEnRoute } from './confort-en-route.js';
import { pleinAir } from './plein-air.js';
import { plageCategorie } from './plage-categorie.js';
import { sportsDHiver } from './sports-d-hiver.js';
import { sportCategorie } from './sport-categorie.js';
import { loisirs } from './loisirs.js';
import { travailCategorie } from './travail-categorie.js';
import { photoEtVideo } from './photo-et-video.js';

export const DEPART = {
  groupes: GROUPES,
  categories: [
    papiersEtArgent,
    vetements,
    chaussures,
    toilette,
    pharmacie,
    electronique,
    bagagesEtRangement,
    alimentation,
    confortEnRoute,
    pleinAir,
    plageCategorie,
    sportsDHiver,
    sportCategorie,
    loisirs,
    travailCategorie,
    photoEtVideo,
  ],
};
