import scene1 from './campaign-sketches/campaign-01-la-bille-de-service.json';
import scene2 from './campaign-sketches/campaign-02-par-dessus-le-mur.json';
import scene3 from './campaign-sketches/campaign-03-la-balancoire.json';
import scene4 from './campaign-sketches/campaign-04-retour-a-l-expediteur.json';
import scene5 from './campaign-sketches/campaign-05-l-electricien.json';
import scene6 from './campaign-sketches/campaign-06-la-porte-de-trop.json';
import scene7 from './campaign-sketches/campaign-07-service-a-l-etage.json';
import scene8 from './campaign-sketches/campaign-08-le-courant-d-air.json';
import scene9 from './campaign-sketches/campaign-09-lever-le-rideau.json';
import scene10 from './campaign-sketches/campaign-10-le-paravent-de-balles.json';
import scene11 from './campaign-sketches/campaign-11-apres-vous.json';
import scene12 from './campaign-sketches/campaign-12-treize-secondes.json';
import scene13 from './campaign-sketches/campaign-13-une-seule-main.json';
import scene14 from './campaign-sketches/campaign-14-l-aiguillage.json';
import scene15 from './campaign-sketches/campaign-15-le-sonneur.json';
import scene16 from './campaign-sketches/campaign-16-deux-souffles.json';
import scene17 from './campaign-sketches/campaign-17-la-grande-machine.json';

import { levelDocumentSchema } from '../../src/domain/level-document';
import type { CampaignChapter } from '../../src/content/embedded-levels';

/** Validated reference scenes for interaction tests, outside the shipped campaign. */
export const sketchChapters: readonly CampaignChapter[] = [
  {
    id: 'les-billes-de-service',
    title: 'Les billes de service',
    levels: [
      levelDocumentSchema.parse(scene1),
      levelDocumentSchema.parse(scene2),
      levelDocumentSchema.parse(scene3),
    ],
  },
  {
    id: 'commandes-a-distance',
    title: 'Commandes à distance',
    levels: [
      levelDocumentSchema.parse(scene4),
      levelDocumentSchema.parse(scene5),
      levelDocumentSchema.parse(scene6),
    ],
  },
  {
    id: 'le-vent',
    title: 'Le vent',
    levels: [
      levelDocumentSchema.parse(scene7),
      levelDocumentSchema.parse(scene8),
      levelDocumentSchema.parse(scene9),
      levelDocumentSchema.parse(scene10),
    ],
  },
  {
    id: 'l-ordre-et-le-temps',
    title: "L'ordre et le temps",
    levels: [
      levelDocumentSchema.parse(scene11),
      levelDocumentSchema.parse(scene12),
      levelDocumentSchema.parse(scene13),
      levelDocumentSchema.parse(scene14),
    ],
  },
  {
    id: 'grandes-machines',
    title: 'Grandes machines',
    levels: [
      levelDocumentSchema.parse(scene15),
      levelDocumentSchema.parse(scene16),
      levelDocumentSchema.parse(scene17),
    ],
  },
];

export const sketchLevels = sketchChapters.flatMap(({ levels }) => levels);
