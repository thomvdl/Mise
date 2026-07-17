<?php

namespace Database\Seeders;

use App\Models\Appareil;
use App\Models\Category;
use App\Models\ChangementHuile;
use App\Models\Event;
use App\Models\FicheTechnique;
use App\Models\Friteuse;
use App\Models\Ingredient;
use App\Models\Menu;
use App\Models\ShoppingItem;
use App\Models\Station;
use App\Models\TemperatureReleve;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Données de démonstration (un exemple par fonctionnalité) pour explorer l'app sur une base
 * fraîche sans tout créer à la main. Comme les autres seeders de référence, celui-ci tourne à
 * chaque démarrage du conteneur — idempotent via firstOrCreate/clés naturelles, donc sans danger
 * une fois déjà semé. Contrairement à UserSeeder (qui ne recrée jamais l'admin), supprimer une
 * de ces données d'exemple la fait réapparaître au prochain redémarrage : c'est un jeu de
 * données de démo, pas un bootstrap à protéger.
 */
class ExampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->orderBy('id')->first();

        $appareil = $this->seedAppareil();
        $friteuse = $this->seedFriteuse();
        $ficheTechnique = $this->seedFicheTechnique();
        $menu = $this->seedMenu($ficheTechnique);

        $this->seedEvents($menu);
        $this->seedShoppingItems($admin);
        $this->seedTemperatureReleves($appareil);
        $this->seedChangementsHuile($friteuse);
    }

    private function seedAppareil(): Appareil
    {
        return Appareil::firstOrCreate(
            ['name' => 'Frigo (exemple)'],
            [
                'abbreviation' => 'FR-EX',
                'fonction' => 'Chambre froide légumes (exemple)',
                'temperature_min' => 2,
                'temperature_max' => 5,
            ],
        );
    }

    private function seedFriteuse(): Friteuse
    {
        return Friteuse::firstOrCreate(
            ['name' => 'Friteuse (exemple)'],
            ['duree_vie_jours' => 21],
        );
    }

    private function seedFicheTechnique(): FicheTechnique
    {
        $categoryId = Category::where('slug', 'brunch')->value('id');
        $stationId = Station::where('slug', 'brunch')->value('id');

        $fiche = FicheTechnique::firstOrCreate(
            ['slug' => 'crepes-sucrees-exemple'],
            [
                'name' => 'Crêpes sucrées (exemple)',
                'category_id' => $categoryId,
                'station_id' => $stationId,
                'servings' => 4,
                'difficulty' => 1,
                'description' => "Crêpes fines classiques, à garnir selon l'envie (sucre, confiture, chocolat...). Fiche exemple générée pour montrer le format attendu.",
                'equipment' => ['Fouet', 'Poêle à crêpes', 'Louche', 'Cul-de-poule'],
                'mise_en_place' => 'Sortir le beurre et les œufs à température ambiante. Tamiser la farine.',
                'plating' => 'Plier ou rouler la crêpe, saupoudrer de sucre ou garnir selon la commande.',
                'chef_tip' => 'Laisser reposer la pâte au moins 30 minutes au frais pour une texture plus fine.',
                'haccp' => 'Conserver la pâte crue au frais (0-4°C), à utiliser sous 24h.',
                'conservation' => 'Pâte crue : 24h au réfrigérateur. Crêpes cuites : à consommer le jour même.',
            ],
        );

        if ($fiche->ingredients()->doesntExist()) {
            $ingredientIds = Ingredient::whereIn('slug', [
                Str::slug('Farine de blé'),
                Str::slug('Oeufs'),
                Str::slug('Lait entier'),
                Str::slug('Beurre'),
                Str::slug('Sucre blanc'),
            ])->pluck('id', 'slug');

            $fiche->ingredients()->syncWithoutDetaching([
                $ingredientIds[Str::slug('Farine de blé')] => ['quantity' => 0.3, 'group_label' => 'Pâte'],
                $ingredientIds[Str::slug('Oeufs')] => ['quantity' => 4, 'group_label' => 'Pâte'],
                $ingredientIds[Str::slug('Lait entier')] => ['quantity' => 0.5, 'group_label' => 'Pâte'],
                $ingredientIds[Str::slug('Beurre')] => ['quantity' => 0.05, 'group_label' => 'Pâte'],
                $ingredientIds[Str::slug('Sucre blanc')] => ['quantity' => 0.03, 'group_label' => 'Pâte'],
            ]);
        }

        if ($fiche->steps()->doesntExist()) {
            $fiche->steps()->createMany([
                ['position' => 1, 'instruction' => 'Mélanger la farine et le sucre dans un cul-de-poule.', 'timer_minutes' => null],
                ['position' => 2, 'instruction' => 'Ajouter les œufs puis délayer progressivement avec le lait, en fouettant pour éviter les grumeaux.', 'timer_minutes' => null],
                ['position' => 3, 'instruction' => 'Incorporer le beurre fondu, laisser reposer la pâte au frais.', 'timer_minutes' => 30],
                ['position' => 4, 'instruction' => 'Cuire les crêpes à la poêle chaude légèrement beurrée, des deux côtés.', 'timer_minutes' => 2],
            ]);
        }

        return $fiche;
    }

    private function seedMenu(FicheTechnique $ficheTechnique): Menu
    {
        $menu = Menu::firstOrCreate(
            ['slug' => 'menu-brunch-exemple'],
            [
                'name' => 'Menu Brunch (exemple)',
                'description' => 'Menu brunch de démonstration, généré par le seeder exemple.',
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
            ],
        );

        if ($menu->sections()->doesntExist()) {
            $section = $menu->sections()->create(['name' => 'Brunch', 'position' => 1]);
            $plat = $section->plats()->create(['name' => 'Crêpes sucrées', 'position' => 1]);
            $plat->ficheTechniques()->syncWithoutDetaching([$ficheTechnique->id => ['position' => 1]]);
        }

        return $menu;
    }

    private function seedEvents(Menu $menu): void
    {
        Event::firstOrCreate(
            ['name' => 'Brunch (exemple)'],
            [
                'detail' => 'Brunch de démonstration ouvert à tous, formule à volonté.',
                'horaire' => '10h00 - 14h00',
                'couverts' => 25,
                'type' => 'brunch',
                'start_date' => now()->addDays(5)->toDateString(),
                'end_date' => now()->addDays(5)->toDateString(),
                'menu_id' => $menu->id,
            ],
        );

        Event::firstOrCreate(
            ['name' => 'Réservation groupe (exemple)'],
            [
                'detail' => "Réservation d'un groupe de 15 personnes, menu à confirmer.",
                'horaire' => '19h30',
                'couverts' => 15,
                'type' => 'groupe',
                'start_date' => now()->addDays(12)->toDateString(),
                'end_date' => now()->addDays(12)->toDateString(),
                'menu_id' => null,
            ],
        );
    }

    private function seedShoppingItems(?User $user): void
    {
        if (! $user) {
            return;
        }

        $items = [
            ['name' => 'Farine T55', 'status' => 'todo'],
            ['name' => 'Beurre doux', 'status' => 'todo'],
            ['name' => 'Œufs (plateau de 30)', 'status' => 'todo'],
            ['name' => 'Papier essuie-tout', 'status' => 'done'],
            ['name' => 'Gants nitrile (boîte)', 'status' => 'todo'],
        ];

        foreach ($items as $item) {
            ShoppingItem::firstOrCreate(
                ['name' => $item['name'], 'user_id' => $user->id],
                ['status' => $item['status']],
            );
        }
    }

    private function seedTemperatureReleves(Appareil $appareil): void
    {
        $releves = [
            ['at' => now()->subDays(2)->setTime(8, 0), 'temperature' => 3.2],
            ['at' => now()->subDays(2)->setTime(20, 0), 'temperature' => 3.8],
            ['at' => now()->subDays(1)->setTime(8, 0), 'temperature' => 2.9],
            // Volontairement hors plage (2-5°C) pour montrer le flag visuel côté dashboard/public.
            ['at' => now()->subDays(1)->setTime(20, 0), 'temperature' => 6.2],
            ['at' => now()->setTime(8, 0), 'temperature' => 3.5],
        ];

        foreach ($releves as $releve) {
            TemperatureReleve::firstOrCreate(
                ['appareil_id' => $appareil->id, 'recorded_at' => $releve['at']],
                ['temperature' => $releve['temperature']],
            );
        }
    }

    private function seedChangementsHuile(Friteuse $friteuse): void
    {
        $changements = [now()->subDays(45)->toDateString(), now()->subDays(10)->toDateString()];

        foreach ($changements as $date) {
            ChangementHuile::firstOrCreate(
                ['friteuse_id' => $friteuse->id, 'date_changement' => $date],
            );
        }
    }
}
