// La bibliothèque de départ de la phase 13, telle que validée sur la page de relecture (5e version,
// https://baluchon.biovibralyon.fr/, qui fait foi) : 4 groupes d’étiquettes, 16 catégories, 171 objets.
// Recopiée ici au format de la page de relecture, une ligne par objet :
//   nom | règle | pour qui | étiquettes | a | note
// règle : f (une fois), j (par jour), n (par nuit), s (par semaine), puis la valeur, « /N » pour un plafond ;
// pour qui : tous, adultes, femmes, hommes, enfants, « ~ » devant = partagé ; a = à acheter (consommable).
// Brouillon de maquette : dans l’appli, la structure et les textes vivront dans des fichiers séparés.

export const GROUPES = [
  ['Activités', [['rando', 'Randonnée'], ['itin', 'Itinérance sac au dos'], ['plage', 'Plage'], ['ville', 'Ville'], ['ski', 'Sports d’hiver'], ['sport', 'Sport'], ['festival', 'Festival'], ['soirees', 'Soirées'], ['detente', 'Détente'], ['thalasso', 'Thalasso ou thermalisme'], ['travail', 'Travail'], ['photo', 'Photo et vidéo']]],
  ['Destination', [['chaud', 'Chaud'], ['froid', 'Froid'], ['pluie', 'Pluie'], ['etranger', 'À l’étranger']]],
  ['Transport', [['avion', 'Avion'], ['train', 'Train ou car'], ['voiture', 'Voiture']]],
  ['Hébergement', [['hotel', 'Hôtel'], ['location', 'Location ou gîte'], ['habitant', 'Chez l’habitant'], ['camping', 'Camping']]],
];

// [nom, picto, couleur, étiquettes de la catégorie (vide : toujours incluse), objets]
export const CATEGORIES = [
  ['Papiers et argent', 'identification-card', 'tournesol', '', `
Carte d’identité | f1 | tous |  |  | Vérifiez sa date de validité quelques semaines avant le départ : un renouvellement prend du temps.
Clés de la maison | f1 | ~tous
Passeport | f1 | tous | etranger
Carte Vitale | f1 | tous
Carte européenne d’assurance maladie | f1 | tous | etranger |  | Gratuite, elle se demande en ligne à l’Assurance maladie au moins deux semaines avant ; elle vaut dans toute l’Union européenne.
Carnet de santé | f1 | enfants
Carnet de vaccination | f1 | tous | etranger |  | Certains pays exigent un vaccin : renseignez-vous un à deux mois avant.
Autorisation de sortie du territoire | f1 | enfants | etranger |  | Obligatoire pour un mineur qui part à l’étranger sans ses parents.
Permis de conduire | f1 | adultes
Papiers de la voiture | f1 | ~tous | voiture |  | Carte grise et attestation d’assurance.
Clés de la voiture | f1 | ~tous | voiture
Carte bancaire | f1 | adultes
Espèces | f1 | tous |  |  | Prévoir de partir avec environ 50 € par personne.
Billets et réservations | f1 | ~tous | itin festival thalasso avion train hotel location camping |  | Gardez-en une copie lisible sans réseau sur le téléphone.
Copies des papiers importants | f1 | ~tous | etranger |  | Une photo de chaque papier, rangée à part des originaux, accélère les démarches en cas de perte.
Attestation d’assurance voyage | f1 | ~tous |  |  | Notez le numéro d’assistance ; votre carte bancaire en comprend parfois une.
Titre de transport en commun | f1 | tous | ville
`],
  ['Vêtements', 't-shirt', 'ciel', '', `
T-shirts | j1/5 | tous
Culottes | j1/5 | femmes
Slips ou caleçons | j1/4 | hommes
Culottes ou slips | j1/7 | enfants
Chaussettes | j1/7 | tous
Soutiens-gorge | j1/3 | femmes
Pyjama | n1/1 | tous
Pantalons | j1/2 | tous
Shorts ou jupes | j1/2 | tous | chaud plage
Pull ou polaire | s1/2 | tous
Veste chaude | f1 | tous | froid
Veste de pluie | f1 | tous | pluie rando itin
Poncho de pluie | f1 | tous | rando itin festival
Parapluie pliant | f1 | ~tous | pluie
Sous-vêtements thermiques | j1/2 | tous | froid ski rando itin |  | Un haut et un bas : ils se portent sous les vêtements et sèchent en une nuit.
Bonnet | f1 | tous | ski froid
Gants | f1 | tous | rando itin ski froid
Écharpe, tour de cou ou Buff | f1 | tous | rando itin plage ski sport chaud froid
Chapeau ou casquette | f1 | tous | rando itin plage ville sport festival detente travail chaud
Lunettes de soleil | f1 | tous
Maillot de bain | f1 | tous | plage detente thalasso camping
Bonnet de bain | f1 | tous | detente thalasso |  | Souvent obligatoire dans les piscines.
Tenue confortable pour le soir | f1 | tous | detente thalasso hotel location habitant
Tenue habillée | f1 | adultes | soirees
Bijoux | f1 | adultes | soirees
`],
  ['Chaussures', 'sneaker', 'corail', '', `
Chaussures confortables | f1 | tous
Sandales ou tongs | f1 | tous | chaud plage camping thalasso
Chaussures de randonnée | f1 | tous | rando itin |  | Jamais neuves pour une longue marche : portez-les quelques fois avant de partir.
Chaussures chaudes et imperméables | f1 | tous | froid ski pluie
Chaussures de sport | f1 | tous | sport
Chaussures habillées | f1 | adultes | soirees travail
Chaussons | f1 | tous
`],
  ['Toilette', 'tooth', 'lagon', '', `
Trousse de toilette | f1 | adultes
Brosse à dents | f1 | tous
Dentifrice | f1 | ~tous
Fil dentaire | f1 | ~adultes
Gel douche | f1 | ~tous |  |  | En avion, les flacons de 100 mL au plus passent en cabine, dans un sac transparent.
Shampoing | f1 | ~tous
Déodorant | f1 | adultes
Brosse ou peigne | f1 | tous
Lunettes de vue ou lentilles et leur produit | f1 | tous
Crème hydratante | f1 | ~tous
Baume à lèvres | f1 | tous
Crème solaire | f1 | ~tous |  |  | À la montagne aussi : la neige renvoie presque tout le soleil.
Après-soleil | f1 | ~tous | rando itin plage chaud
Rasoir | f1 | hommes
Mousse à raser | f1 | ~hommes
Protections périodiques | f1 | femmes |  |  | Prévoyez-en même hors des dates attendues : le voyage dérègle parfois le cycle.
Coupe-ongles et pince à épiler | f1 | ~tous
Paquets de mouchoirs | s1 | tous
Paquets de mouchoirs en plus | s1 | tous | froid
Serviette de bain | f1 | tous | thalasso location habitant camping |  | Pour la sortie de douche.
Lingettes | f1 | ~tous
Serviette de toilette | f1 | tous | location habitant camping |  | Pour les mains et le visage.
`],
  ['Pharmacie', 'first-aid-kit', 'framboise', '', `
Trousse de secours | f1 | ~tous |  |  | Pansements, désinfectant, compresses, bande : vérifiez les dates une fois par an.
Médicaments habituels | f1 | tous |  |  | Avec l’ordonnance, et de quoi tenir quelques jours de plus que prévu.
Comprimés antidouleur | f4 | ~adultes
Comprimés antidouleur pour enfant | f4 | ~enfants |  |  | Dosé selon le poids : vérifiez qu’il convient encore.
Thermomètre | f1 | ~enfants
Préservatifs | s5 | ~adultes
Anti-moustiques | f1 | ~tous
Pince à tiques | f1 | ~tous |  |  | Retirez une tique au plus vite, en tournant, sans l’écraser.
Comprimés contre le mal des transports | f2 | tous |  |  | À prendre une demi-heure avant le départ.
Sels de réhydratation | f1 | ~tous | rando itin ski sport chaud etranger
Comprimés de charbon contre les maux de ventre | f2 | ~tous | etranger
Gel hydroalcoolique | f1 | ~tous
`],
  ['Électronique', 'device-mobile', 'lilas', '', `
Téléphone | f1 | adultes
Chargeurs et câbles | f1 | ~tous
Batterie externe | f1 | adultes |  |  | En avion, elle voyage en cabine, jamais en soute.
Écouteurs | f1 | tous
Adaptateur de prise | f1 | ~tous | etranger |  | Vérifiez le type de prise du pays : il en existe une quinzaine dans le monde.
Multiprise | f1 | ~tous |  |  | Elle dépanne dans les chambres à prise unique.
Ordinateur portable et son chargeur | f1 | adultes | travail photo
`],
  ['Bagages et rangement', 'suitcase-rolling', 'abricot', '', `
Valise ou sac de voyage | f1 | adultes
Sac à dos de journée | f1 | adultes | plage ville ski sport festival detente thalasso travail photo
Sacs de rangement | f1 | ~tous |  |  | Un sac par personne ou par type de vêtements : on fouille moins la valise.
Sac à linge sale | f1 | ~tous
Lessive de voyage | s5 | ~tous |  |  | Laver un peu chaque soir permet de partir avec moitié moins de vêtements.
Cadenas | f1 | ~tous |  |  | De préférence aux normes des douanes (TSA) : ouvrable au contrôle sans être cassé, surtout en avion et à l’étranger.
Sac de courses pliable | f1 | ~tous
Pochette étanche | f1 | ~tous | rando itin plage ville ski sport festival detente thalasso travail photo
Sac banane | f1 | adultes | ville festival detente travail photo
`],
  ['Alimentation', 'fork-knife', 'pomme', '', `
Gourde | f1 | tous |  |  | Comptez un litre et demi par jour et par personne, davantage par forte chaleur.
En-cas | j1 | tous |  | a | Fruits secs et barres de céréales supportent bien le sac.
Petits-déjeuners | n1 | tous | camping itin location | a
Pique-niques | j1 | tous | rando itin plage ville ski sport detente travail photo camping | a
Dîners | n1 | tous | camping itin location | a | Prévoyez un repas de secours par personne en plus.
Café ou thé | f1 | ~adultes | rando itin ski sport photo hotel location camping | a
Sel, poivre et huile | f1 | ~tous | camping location rando itin
Glacière | f1 | ~tous | voiture
Bouteille isotherme | f1 | ~tous | rando itin ski travail photo froid
Gobelet réutilisable | f1 | tous | rando itin festival camping
`],
  ['Confort en route', 'airplane', 'ciel', '', `
Oreiller de voyage | f1 | tous | avion train voiture
Masque de nuit | f1 | adultes
Bouchons d’oreilles | f1 | adultes
Siège auto | f1 | enfants | voiture |  | Obligatoire en voiture pour les moins de 10 ans, adapté à la taille de l’enfant.
Jeux pour la route | f1 | ~enfants | voiture train avion
`],
  ['Plein air', 'mountains', 'pomme', '', `
Sac à dos de randonnée | f1 | adultes | rando itin |  | Réglez-le sur les hanches : ce sont elles qui portent, pas les épaules.
Carte de randonnée | f1 | ~tous | rando itin |  | Le réseau manque souvent en montagne : gardez une carte papier ou téléchargée.
Boussole | f1 | ~tous | rando itin
Bâtons de marche | f1 | adultes | rando itin
Chaussettes de randonnée | j1/3 | tous | rando itin
Pantalon de randonnée | f1 | tous | rando itin
Couverture de survie | f1 | tous | rando itin plage ski sport festival travail photo |  | Quelques grammes qui peuvent sauver une nuit imprévue dehors.
Jumelles | f1 | ~tous | rando plage detente photo
Lampe frontale | f1 | tous | rando itin festival soirees photo camping
Couteau de poche | f1 | ~adultes | rando itin plage ville ski sport soirees detente travail photo camping |  | Interdit en cabine d’avion, et parfois dans les lieux publics : en avion, il voyage dans la valise en soute.
Tente | f1 | ~tous | itin festival camping |  | Montez-la une fois chez vous avant le départ : il ne manquera ni piquet ni arceau.
Sac de couchage | f1 | tous | itin festival camping |  | Choisissez-le d’après sa température de confort, pas sa température extrême.
Matelas de sol | f1 | tous | itin festival camping
Oreiller gonflable | f1 | tous | itin camping
Drap de sac | f1 | tous | itin festival camping |  | Exigé dans la plupart des refuges et des gîtes d’étape.
Réchaud et cartouche de gaz | f1 | ~tous | itin camping |  | Les cartouches de gaz sont interdites en avion : achetez-les sur place.
Popote | f1 | ~tous | itin festival camping
Couverts | f1 | tous | rando itin plage festival camping
Briquet | f1 | ~adultes | rando itin travail photo camping
Liquide vaisselle et éponge | f1 | ~tous | itin camping
Papier toilette | f1 | ~tous | camping
Sacs poubelle | f1 | ~tous | camping
Lanterne | f1 | ~tous | camping
Corde à linge et pinces | f1 | ~tous | camping itin
Gourde filtrante | f1 | ~adultes | itin |  | Elle permet de boire l’eau des sources et des fontaines.
`],
  ['Plage', 'waves', 'lagon', 'plage', `
Serviette de plage | f1 | tous
Sac de plage | f1 | ~tous
Parasol | f1 | ~tous | voiture
Masque et tuba | f1 | tous
Jeux de plage | f1 | ~tous
`],
  ['Sports d’hiver', 'person-simple-ski', 'ciel', 'ski', `
Pantalon de ski | f1 | tous
Veste de ski | f1 | tous
Masque de ski | f1 | tous
Casque | f1 | tous
Chaussettes de ski | j1/3 | tous
Chaufferettes | f2 | tous
Après-ski | f1 | tous
`],
  ['Sport', 'soccer-ball', 'corail', 'sport', `
Tenues de sport | j1/3 | tous
Brassière de sport | j1/2 | femmes
Serviette de sport | f1 | tous
`],
  ['Loisirs', 'book-open', 'tournesol', '', `
Livre ou liseuse | f1 | tous
Carnet et stylo | f1 | ~tous |  |  | Le stylo sert aussi aux formulaires des frontières.
Guide de voyage | f1 | ~tous
Jeu de cartes | f1 | ~tous
Cadeau pour vos hôtes | f1 | ~tous | habitant |  | Une spécialité de votre région fait toujours plaisir.
Doudou | f1 | enfants |  |  | Et son remplaçant s’il en a un : un doudou perdu gâche un voyage.
Veilleuse | f1 | ~enfants
`],
  ['Travail', 'laptop', 'lilas', 'travail', `
Tenues de travail | j1/3 | adultes
Documents de travail | f1 | ~adultes
Badge ou cartes de visite | f1 | adultes
`],
  ['Photo et vidéo', 'camera', 'framboise', 'photo', `
Appareil photo | f1 | ~tous
Chargeur de l’appareil | f1 | ~tous
Batteries de rechange | f1 | ~tous |  |  | Le froid les vide vite : gardez-les dans une poche intérieure.
Cartes mémoire | f1 | ~tous |  |  | Videz-les avant de partir.
Disque dur externe | f1 | ~tous |  |  | Copiez les photos chaque soir : une carte perdue ne coûte plus qu’une journée.
Trépied de voyage | f1 | ~tous
Micro externe | f1 | ~tous
`],
];
