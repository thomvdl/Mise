<?php

namespace Database\Seeders;

use App\Models\NettoyageTache;
use Illuminate\Database\Seeder;

/**
 * Plan de nettoyage de départ pour une cuisine d'hôtel — à lancer une seule fois, à la main :
 *
 *     php artisan db:seed --class=PlanNettoyageHotelSeeder
 *
 * Volontairement absent de DatabaseSeeder (qui tourne à chaque démarrage du conteneur) : une
 * tâche supprimée ou renommée depuis le dashboard ne doit pas revenir. `firstOrCreate` sur
 * (zone, name) évite les doublons si on le relance.
 *
 * Fréquences tirées des fréquences indicatives du GBPH Restaurateur (sols de cuisine chaque jour,
 * ustensiles après chaque utilisation, trancheuse/hachoir après chaque service, chambres froides
 * positives chaque semaine + plafond/évaporateur chaque mois, négatives chaque année, grilles de
 * hotte chaque semaine, poubelles chaque jour…). Méthode en 5 étapes (rangement, raclage,
 * nettoyage/désinfection, rinçage, séchage) d'après la fiche F-006 « Plan de nettoyage » de la
 * Sécurité alimentaire luxembourgeoise. Les dosages et temps de contact ne sont pas inventés ici :
 * ils dépendent du produit réellement utilisé (fiche technique du fournisseur).
 */
class PlanNettoyageHotelSeeder extends Seeder
{
    private const DD = 'Détergent-désinfectant contact alimentaire (EN 1276), dosage selon fiche technique';

    private const SURFACE = "1. Débarrasser et ranger le poste, jeter les déchets.\n"
        ."2. Racler les souillures grossières.\n"
        ."3. Appliquer le détergent-désinfectant, frotter, respecter le temps de contact.\n"
        ."4. Rincer à l'eau potable si la fiche technique le demande.\n"
        ."5. Sécher à l'air ou avec du papier à usage unique.";

    private const DEMONTABLE = "1. Débrancher l'appareil.\n"
        ."2. Démonter les pièces amovibles et les passer au lave-vaisselle (ou au bac de plonge).\n"
        ."3. Nettoyer le bâti avec le détergent-désinfectant, respecter le temps de contact.\n"
        ."4. Rincer, laisser sécher, remonter avec des mains propres.";

    public function run(): void
    {
        foreach ($this->taches() as $tache) {
            NettoyageTache::firstOrCreate(
                ['zone' => $tache['zone'], 'name' => $tache['name']],
                $tache + ['moment' => null, 'responsable' => null, 'produit' => null, 'methode' => null],
            );
        }
    }

    private function taches(): array
    {
        return [
            // --- Cuisine (toutes zones) ----------------------------------------------------------
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Plans de travail', 'frequence' => 'apres_utilisation',
                'moment' => 'Après chaque opération salissante et entre deux denrées (cru / cuit)',
                'responsable' => 'Commis du poste', 'produit' => self::DD, 'methode' => self::SURFACE],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Petits ustensiles (couteaux, fouets, louches, spatules)', 'frequence' => 'apres_utilisation',
                'responsable' => 'Commis du poste', 'produit' => 'Lave-vaisselle (cycle normal)',
                'methode' => "Passer au lave-vaisselle. À défaut : laver au détergent-désinfectant au bac de plonge, rincer, laisser sécher à l'air. Ranger à l'abri des projections."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Planches à découper', 'frequence' => 'apres_utilisation',
                'responsable' => 'Commis du poste', 'produit' => 'Lave-vaisselle (cycle normal)',
                'methode' => "Gratter, passer au lave-vaisselle, sécher à la verticale. Respecter le code couleur (viande, poisson, légumes…). Remplacer les planches trop rayées."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Torchons et lavettes', 'frequence' => 'apres_service',
                'moment' => 'Changer plusieurs fois par jour, dès qu\'ils sont souillés',
                'responsable' => 'Toute la brigade', 'produit' => 'Blanchisserie de l\'hôtel (lavage ≥ 60 °C)',
                'methode' => "Ne jamais utiliser le même torchon pour les mains, les surfaces et la vaisselle. Préférer le papier à usage unique pour essuyer les plans de travail."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Lave-mains et distributeurs (savon, essuie-mains)', 'frequence' => 'quotidien',
                'moment' => 'Fin de service du soir, réapprovisionner au besoin pendant le service',
                'responsable' => 'Plongeur', 'produit' => self::DD,
                'methode' => "Nettoyer la vasque et la commande non manuelle, désinfecter, rincer. Vérifier savon bactéricide et essuie-mains à usage unique."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Poignées de portes, interrupteurs, robinets', 'frequence' => 'quotidien',
                'moment' => 'Fin de service du soir', 'responsable' => 'Plongeur', 'produit' => self::DD,
                'methode' => "Pulvériser le produit sur une lavette (pas directement sur les interrupteurs), essuyer, respecter le temps de contact."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Sols de la cuisine', 'frequence' => 'quotidien',
                'moment' => 'Fin de service du soir, après le rangement des denrées', 'responsable' => 'Plongeur',
                'produit' => 'Détergent-désinfectant sols, dosage selon fiche technique',
                'methode' => "1. Ranger toutes les denrées, ramasser les déchets.\n2. Balayer humide (pas de balai sec).\n3. Laver au détergent-désinfectant, frotter sous les meubles et dans les angles.\n4. Respecter le temps de contact, racler vers les siphons.\n5. Rincer si demandé, laisser sécher. Pas de jet haute pression à proximité des denrées."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Siphons et caniveaux', 'frequence' => 'quotidien',
                'moment' => 'Fin de service du soir, avec les sols', 'responsable' => 'Plongeur', 'produit' => self::DD,
                'methode' => "Retirer la grille et le panier, vider les déchets, brosser, désinfecter, rincer, remettre en place."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Poubelles de cuisine', 'frequence' => 'quotidien',
                'moment' => 'À chaque vidage, au moins en fin de journée', 'responsable' => 'Plongeur', 'produit' => self::DD,
                'methode' => "Vider, laver l'intérieur, l'extérieur et la pédale, désinfecter, rincer, sécher, remettre un sac neuf. Couvercle à commande non manuelle."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Matériel de nettoyage (brosses, raclettes, seaux, balais)', 'frequence' => 'quotidien',
                'moment' => 'Rincer après chaque utilisation, désinfecter en fin de journée', 'responsable' => 'Plongeur',
                'produit' => 'Eau javellisée ou désinfectant, dosage selon fiche technique',
                'methode' => "Rincer à l'eau claire, faire tremper dans la solution désinfectante, rincer, laisser sécher tête en haut, à l'écart des denrées. Matériel sols ≠ matériel surfaces."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Murs (zones de projection, carrelage, inox)', 'frequence' => 'hebdomadaire',
                'moment' => 'Jour de moindre activité, après le service', 'responsable' => 'Chef de partie (répartit le travail)',
                'produit' => self::DD, 'methode' => self::SURFACE],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Étagères, tiroirs et dessous des tables inox', 'frequence' => 'hebdomadaire',
                'responsable' => 'Commis du poste', 'produit' => self::DD,
                'methode' => "Vider, nettoyer au détergent-désinfectant, rincer, sécher, remettre en place en vérifiant les dates (DLC)."],
            ['zone' => 'Cuisine — toutes zones', 'name' => 'Plafonds et luminaires', 'frequence' => 'annuel',
                'moment' => 'Grand nettoyage annuel (fermeture ou période creuse)', 'responsable' => 'Entreprise de nettoyage / service technique',
                'produit' => 'Détergent dégraissant',
                'methode' => "Protéger ou retirer tout le matériel et les denrées. Dépoussiérer, dégraisser, rincer. Vérifier l'état des peintures et des protections de luminaires."],

            // --- Viande (poste chaud) ------------------------------------------------------------
            ['zone' => 'Viande', 'name' => 'Trancheuse', 'frequence' => 'apres_service',
                'moment' => 'Après chaque service et entre deux produits différents', 'responsable' => 'Commis du poste',
                'produit' => self::DD,
                'methode' => "1. Débrancher, lame à zéro, gants anti-coupure.\n2. Démonter chariot, protège-lame et presse.\n3. Nettoyer et désinfecter chaque pièce et la lame (du centre vers l'extérieur).\n4. Rincer, laisser sécher, remonter."],
            ['zone' => 'Viande', 'name' => 'Hachoir', 'frequence' => 'apres_service',
                'responsable' => 'Commis du poste', 'produit' => self::DD, 'methode' => self::DEMONTABLE],
            ['zone' => 'Viande', 'name' => 'Fourneaux, plaques et salamandre', 'frequence' => 'apres_service',
                'moment' => 'Fin de chaque service, appareils tièdes', 'responsable' => 'Commis du poste',
                'produit' => 'Dégraissant pour surfaces chaudes, selon fiche technique',
                'methode' => "Gratter les résidus, appliquer le dégraissant, frotter, rincer, sécher. Vider et laver les bacs récupérateurs."],
            ['zone' => 'Viande', 'name' => 'Fours mixtes', 'frequence' => 'quotidien',
                'moment' => 'Fin de journée', 'responsable' => 'Chef de partie',
                'produit' => 'Pastilles ou produit du constructeur',
                'methode' => "Lancer le programme de nettoyage automatique. Retirer et laver grilles et joint de porte. Laisser la porte entrouverte pour sécher."],
            ['zone' => 'Viande', 'name' => 'Friteuses (cuve)', 'frequence' => 'hebdomadaire',
                'moment' => 'À chaque changement d\'huile (voir la page Huile)', 'responsable' => 'Chef de partie',
                'produit' => 'Produit de dégraissage pour friteuse, selon fiche technique',
                'methode' => "Vidanger l'huile refroidie, faire bouillir la solution de dégraissage dans la cuve, brosser, vidanger, rincer abondamment, sécher complètement avant de remettre l'huile."],

            // --- Poisson -------------------------------------------------------------------------
            ['zone' => 'Poisson', 'name' => 'Écailleurs, pinces à arêtes, ciseaux', 'frequence' => 'apres_utilisation',
                'responsable' => 'Commis du poste', 'produit' => 'Lave-vaisselle (cycle normal)',
                'methode' => "Rincer à l'eau froide puis passer au lave-vaisselle. Ne jamais les poser sur un plan destiné aux produits cuits."],
            ['zone' => 'Poisson', 'name' => 'Bacs à glace et présentoirs à poisson', 'frequence' => 'quotidien',
                'moment' => 'Fin de journée', 'responsable' => 'Commis du poste', 'produit' => self::DD,
                'methode' => "Vider la glace, nettoyer, désinfecter, rincer, sécher. Glace refaite chaque jour, jamais réutilisée."],

            // --- Froid (garde-manger) ------------------------------------------------------------
            ['zone' => 'Froid', 'name' => 'Robot-coupe, mixeurs, mandoline', 'frequence' => 'apres_utilisation',
                'responsable' => 'Commis du poste', 'produit' => self::DD, 'methode' => self::DEMONTABLE],
            ['zone' => 'Froid', 'name' => 'Machine sous vide (cuve et barre de soudure)', 'frequence' => 'apres_utilisation',
                'moment' => 'Après chaque série de mise sous vide', 'responsable' => 'Commis du poste', 'produit' => self::DD,
                'methode' => "Essuyer la cuve et le couvercle, nettoyer la barre de soudure et le joint, désinfecter, sécher."],
            ['zone' => 'Froid', 'name' => 'Machine sous vide (désinfection complète)', 'frequence' => 'hebdomadaire',
                'responsable' => 'Chef de partie', 'produit' => self::DD,
                'methode' => "Retirer les plaques de remplissage, nettoyer et désinfecter toute la cuve, le joint et les plaques. Rincer, sécher couvercle ouvert."],
            ['zone' => 'Froid', 'name' => 'Saladette et vitrine réfrigérée', 'frequence' => 'quotidien',
                'moment' => 'Avant la mise en place des denrées', 'responsable' => 'Commis du poste', 'produit' => self::DD,
                'methode' => "Retirer les bacs gastronormes (plonge), nettoyer et désinfecter les rails, les parois et le joint, rincer, sécher."],

            // --- Pâtisserie ----------------------------------------------------------------------
            ['zone' => 'Pâtisserie', 'name' => 'Batteur, pétrin (cuve, fouet, crochet, feuille)', 'frequence' => 'apres_utilisation',
                'responsable' => 'Commis pâtissier', 'produit' => self::DD, 'methode' => self::DEMONTABLE],
            ['zone' => 'Pâtisserie', 'name' => 'Poches à douille réutilisables et douilles', 'frequence' => 'apres_utilisation',
                'responsable' => 'Commis pâtissier', 'produit' => self::DD,
                'methode' => "Retourner la poche, laver à l'eau chaude au détergent-désinfectant, rincer, sécher retournée. Douilles au lave-vaisselle. Préférer les poches jetables pour les crèmes."],
            ['zone' => 'Pâtisserie', 'name' => 'Moules, cercles et plaques', 'frequence' => 'apres_utilisation',
                'responsable' => 'Commis pâtissier', 'produit' => 'Lave-vaisselle ou bac de plonge',
                'methode' => "Retirer les résidus sans gratter les revêtements, laver, rincer, sécher complètement avant rangement (pas de rouille)."],
            ['zone' => 'Pâtisserie', 'name' => 'Marbre et plans de travail pâtisserie', 'frequence' => 'apres_service',
                'responsable' => 'Commis pâtissier', 'produit' => self::DD, 'methode' => self::SURFACE],

            // --- Brunch (buffet petit-déjeuner) --------------------------------------------------
            ['zone' => 'Brunch', 'name' => 'Buffet chaud (bains-marie, chafing dishes)', 'frequence' => 'apres_service',
                'moment' => 'Après chaque service petit-déjeuner / brunch', 'responsable' => 'Commis du poste',
                'produit' => self::DD,
                'methode' => "Jeter tous les restes exposés. Vider l'eau des bains-marie, détartrer au besoin, nettoyer et désinfecter cuves et couvercles, sécher."],
            ['zone' => 'Brunch', 'name' => 'Buffet froid et présentoirs', 'frequence' => 'apres_service',
                'responsable' => 'Commis du poste', 'produit' => self::DD,
                'methode' => "Jeter les produits exposés, débarrasser, nettoyer et désinfecter plateaux, cloches et surfaces, sécher."],
            ['zone' => 'Brunch', 'name' => 'Toasters, gaufriers, crêpières, machine à œufs', 'frequence' => 'apres_service',
                'responsable' => 'Commis du poste', 'produit' => 'Détergent dégraissant, selon fiche technique',
                'methode' => "Débrancher, laisser tiédir, vider le tiroir à miettes, nettoyer les plaques et l'extérieur, sécher."],
            ['zone' => 'Brunch', 'name' => 'Distributeurs de jus et céréales', 'frequence' => 'quotidien',
                'moment' => 'Fin du service petit-déjeuner', 'responsable' => 'Commis du poste', 'produit' => self::DD,
                'methode' => "Vider, démonter becs et robinets, laver, désinfecter, rincer, sécher, remonter."],

            // --- Chambres froides et frigos ------------------------------------------------------
            ['zone' => 'Chambres froides et frigos', 'name' => 'Chambres froides positives (étagères, parois, sol, joints)', 'frequence' => 'hebdomadaire',
                'moment' => 'Avant une livraison, quand le stock est bas', 'responsable' => 'Chef de partie (répartit le travail)',
                'produit' => self::DD,
                'methode' => "1. Sortir les denrées par étagère et les garder au froid.\n2. Jeter les produits périmés ou douteux.\n3. Nettoyer et désinfecter étagères, parois, poignées, joints et sol.\n4. Rincer, sécher, remettre les denrées (premier entré, premier sorti)."],
            ['zone' => 'Chambres froides et frigos', 'name' => 'Plafond et évaporateur des chambres froides positives', 'frequence' => 'mensuel',
                'responsable' => 'Chef de partie / service technique', 'produit' => self::DD,
                'methode' => "Protéger les denrées. Nettoyer le plafond et le carter de l'évaporateur, vérifier l'écoulement des condensats."],
            ['zone' => 'Chambres froides et frigos', 'name' => 'Armoires réfrigérées de poste', 'frequence' => 'hebdomadaire',
                'responsable' => 'Commis du poste', 'produit' => self::DD,
                'methode' => "Même méthode que les chambres froides positives : vider, trier, nettoyer, désinfecter, rincer, sécher, remplir."],
            ['zone' => 'Chambres froides et frigos', 'name' => 'Cellule de refroidissement rapide', 'frequence' => 'quotidien',
                'moment' => 'Fin de journée si elle a servi', 'responsable' => 'Chef de partie', 'produit' => self::DD,
                'methode' => "Retirer grilles et sonde, nettoyer et désinfecter l'intérieur, la sonde et le joint, sécher porte ouverte."],
            ['zone' => 'Chambres froides et frigos', 'name' => 'Chambres froides négatives et congélateurs', 'frequence' => 'annuel',
                'moment' => 'Dégivrage annuel, stock au plus bas', 'responsable' => 'Chef de partie / service technique',
                'produit' => self::DD,
                'methode' => "Transférer les denrées dans un autre congélateur, couper, dégivrer, nettoyer, désinfecter, sécher, remettre en froid avant de recharger."],

            // --- Plonge --------------------------------------------------------------------------
            ['zone' => 'Plonge', 'name' => 'Lave-vaisselle (filtres, bras de lavage, cuve)', 'frequence' => 'quotidien',
                'moment' => 'Fin de journée', 'responsable' => 'Plongeur', 'produit' => 'Produits du fournisseur de la machine',
                'methode' => "Vidanger, retirer et rincer filtres et bras de lavage (déboucher les buses), nettoyer la cuve, laisser la porte ouverte pour sécher. Vérifier les niveaux de produit lavage et rinçage."],
            ['zone' => 'Plonge', 'name' => 'Lave-vaisselle (détartrage)', 'frequence' => 'mensuel',
                'responsable' => 'Plongeur', 'produit' => 'Détartrant du fournisseur',
                'methode' => "Lancer un cycle de détartrage selon la notice. Fréquence à adapter à la dureté de l'eau."],
            ['zone' => 'Plonge', 'name' => 'Bacs de plonge, égouttoirs et tables de tri', 'frequence' => 'quotidien',
                'moment' => 'Fin de service du soir', 'responsable' => 'Plongeur', 'produit' => self::DD,
                'methode' => self::SURFACE],

            // --- Hotte et ventilation ------------------------------------------------------------
            ['zone' => 'Hotte et ventilation', 'name' => 'Filtres de hotte', 'frequence' => 'hebdomadaire',
                'moment' => 'Nettoyage chaque semaine, désinfection une fois par mois', 'responsable' => 'Plongeur',
                'produit' => 'Bain dégraissant ou lave-vaisselle',
                'methode' => "Démonter les filtres, les faire tremper dans le bain dégraissant (ou lave-vaisselle), rincer, sécher, remonter. Nettoyer la goulotte de récupération des graisses."],
            ['zone' => 'Hotte et ventilation', 'name' => 'Caisson de hotte et bouches d\'aspiration', 'frequence' => 'mensuel',
                'responsable' => 'Chef de partie (répartit le travail)', 'produit' => 'Détergent dégraissant',
                'methode' => "Filtres retirés, dégraisser l'intérieur du caisson et les bouches, rincer, sécher."],
            ['zone' => 'Hotte et ventilation', 'name' => 'Conduits d\'extraction', 'frequence' => 'annuel',
                'moment' => 'Par une entreprise spécialisée (attestation à conserver)', 'responsable' => 'Service technique de l\'hôtel',
                'methode' => "Ramonage/dégraissage des conduits par un prestataire. Classer l'attestation avec le plan de maîtrise sanitaire."],

            // --- Réception et stockage -----------------------------------------------------------
            ['zone' => 'Réception et stockage', 'name' => 'Zone de réception et chariots', 'frequence' => 'quotidien',
                'moment' => 'Après les livraisons', 'responsable' => 'Commis de réception / plongeur', 'produit' => self::DD,
                'methode' => "Évacuer les cartons et emballages (décartonnage), balayer humide, laver et désinfecter le sol, les chariots et le plan de contrôle."],
            ['zone' => 'Réception et stockage', 'name' => 'Économat (réserve sèche)', 'frequence' => 'mensuel',
                'responsable' => 'Chef de partie (répartit le travail)', 'produit' => self::DD,
                'methode' => "Vider étagère par étagère, vérifier les dates et l'absence de nuisibles, nettoyer, sécher, ranger (premier entré, premier sorti, rien au sol)."],
            ['zone' => 'Réception et stockage', 'name' => 'Bacs gastronormes et boîtes de stockage', 'frequence' => 'apres_utilisation',
                'responsable' => 'Plongeur', 'produit' => 'Lave-vaisselle (cycle normal)',
                'methode' => "Passer au lave-vaisselle, sécher complètement, stocker retournés ou couverts."],

            // --- Déchets -------------------------------------------------------------------------
            ['zone' => 'Local déchets', 'name' => 'Conteneurs extérieurs', 'frequence' => 'hebdomadaire',
                'moment' => 'Après la collecte (plus souvent en été)', 'responsable' => 'Plongeur', 'produit' => self::DD,
                'methode' => "Laver l'intérieur et l'extérieur au jet, désinfecter, laisser égoutter couvercle ouvert."],
            ['zone' => 'Local déchets', 'name' => 'Sol et murs du local déchets', 'frequence' => 'hebdomadaire',
                'responsable' => 'Plongeur', 'produit' => self::DD,
                'methode' => "Ramasser les déchets au sol, laver, désinfecter, rincer, racler vers l'évacuation."],

            // --- Personnel -----------------------------------------------------------------------
            ['zone' => 'Vestiaires et sanitaires du personnel', 'name' => 'Toilettes, lavabos, vestiaires', 'frequence' => 'quotidien',
                'responsable' => 'Équipe de nettoyage de l\'hôtel', 'produit' => 'Produits sanitaires (matériel dédié, jamais utilisé en cuisine)',
                'methode' => "Nettoyer et désinfecter cuvettes, lavabos et poignées, vider les poubelles, réapprovisionner savon et papier. Matériel de couleur différente de celui de la cuisine."],
        ];
    }
}
