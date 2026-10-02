import {
  ArrowRight,
  CircleCheck,
  Flag,
  Library,
  Play,
  Settings,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { campaignChapters, embeddedLevels } from '../content/embedded-levels';
import { spriteThumbnailPath } from '../presentation/sprite-loader';
import { AppFrame } from '../ui/AppFrame';
import { PwaInvitation } from '../ui/PwaInvitation';
import { useCampaignProgress } from './use-campaign-progress';
import { usePwaInvitation } from './use-pwa-invitation';

/** Decorative composition using the same local artwork as the game. */
function WorkshopIllustration() {
  return (
    <div
      className="home-invention"
      role="img"
      aria-label="Une bille, des poutres et un panier dans l’atelier TinkerBolt"
    >
      <span className="home-invention-label" aria-hidden="true">
        Une idée, une réaction en chaîne.
      </span>
      <svg className="home-invention-path" viewBox="0 0 500 360" fill="none" aria-hidden="true">
        <path d="M105 74 Q65 123 183 144 Q350 165 290 214 Q258 249 360 278" />
      </svg>
      <img className="home-sprite home-sprite-ball" src={spriteThumbnailPath('ball')} alt="" />
      <img className="home-sprite home-sprite-beam-one" src={spriteThumbnailPath('beam')} alt="" />
      <img className="home-sprite home-sprite-beam-two" src={spriteThumbnailPath('beam')} alt="" />
      <img className="home-sprite home-sprite-basket" src={spriteThumbnailPath('basket')} alt="" />
      <img className="home-sprite home-sprite-lever" src={spriteThumbnailPath('lever')} alt="" />
      <span className="home-invention-stamp" aria-hidden="true">
        <Sparkles size={18} /> Et si ça marchait ?
      </span>
    </div>
  );
}

export function HomePage() {
  const { levels, storageError, storageWarning } = useCampaignProgress();
  const pwaInvitation = usePwaInvitation(null);
  const resolvedCount = embeddedLevels.filter(
    (level) => levels[level.id]?.resolved === true,
  ).length;
  const unlockedCount = embeddedLevels.filter(
    (level) => levels[level.id]?.unlocked === true,
  ).length;
  const nextLevel = embeddedLevels.find(
    (level) => levels[level.id]?.unlocked === true && !levels[level.id]?.resolved,
  );
  const nextLevelNumber = nextLevel === undefined ? null : embeddedLevels.indexOf(nextLevel) + 1;
  const percentage =
    embeddedLevels.length === 0 ? 0 : Math.round((resolvedCount / embeddedLevels.length) * 100);
  const playLabel =
    nextLevel === undefined
      ? 'Revisiter la campagne'
      : resolvedCount === 0
        ? 'Commencer à jouer'
        : 'Continuer à jouer';

  return (
    <AppFrame title="Accueil" subtitle="À toi d’inventer" variant="page">
      <div className="page-content home-page">
        {pwaInvitation !== null && (
          <PwaInvitation
            kind={pwaInvitation.kind}
            onAccept={pwaInvitation.onAccept}
            onDismiss={pwaInvitation.onDismiss}
          />
        )}
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="home-kicker">
              <span aria-hidden="true" /> Bienvenue dans l’atelier
            </p>
            <h2 id="home-title">
              Les bonnes idées
              <br />
              font <span>leur chemin.</span>
            </h2>
            <p className="home-intro">
              Une bille, quelques outils et ton imagination. Assemble, essaie, ajuste… et regarde
              tes idées prendre vie.
            </p>
            <div className="home-hero-actions">
              <Link
                className="btn btn-go home-play"
                to={nextLevel === undefined ? '/levels' : `/levels/${nextLevel.id}/play`}
              >
                <Play size={19} aria-hidden="true" />
                {playLabel}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <p className="home-next-level">
                {nextLevel === undefined
                  ? 'Il reste toujours une autre façon de faire.'
                  : `Niveau ${String(nextLevelNumber)} · ${nextLevel.metadata.title}`}
              </p>
            </div>
            <div className="home-facts" aria-label="Contenu du jeu">
              <span>{embeddedLevels.length} défis à résoudre</span>
              <span>{campaignChapters.length} chapitres à explorer</span>
              <span>Une infinité d’idées</span>
            </div>
          </div>
          <WorkshopIllustration />
        </section>

        <nav className="home-explore" aria-label="Explorer TinkerBolt">
          <div className="home-section-heading">
            <h2>Qu’est-ce qu’on invente aujourd’hui ?</h2>
            <span>Choisis ton terrain de jeu</span>
          </div>
          <div className="home-destinations">
            <Link className="home-destination" to="/levels">
              <div className="home-destination-top">
                <span className="home-destination-icon">
                  <Flag size={24} aria-hidden="true" />
                </span>
                <span className="home-destination-tag">À toi de jouer</span>
                <ArrowRight size={20} aria-hidden="true" />
              </div>
              <h3>La campagne</h3>
              <p>De petites astuces aux grandes machines : un défi après l’autre.</p>
              <span className="home-destination-action">
                Explorer les niveaux <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
            <Link className="home-destination" to="/editor">
              <div className="home-destination-top">
                <span className="home-destination-icon">
                  <Wrench size={24} aria-hidden="true" />
                </span>
                <span className="home-destination-tag">Carte blanche</span>
                <ArrowRight size={20} aria-hidden="true" />
              </div>
              <h3>L’atelier</h3>
              <p>Construis tes machines, imagine tes puzzles et partage tes trouvailles.</p>
              <span className="home-destination-action">
                Créer une invention <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
            <Link className="home-destination" to="/my-levels">
              <div className="home-destination-top">
                <span className="home-destination-icon">
                  <Library size={24} aria-hidden="true" />
                </span>
                <span className="home-destination-tag">Tes trouvailles</span>
                <ArrowRight size={20} aria-hidden="true" />
              </div>
              <h3>Mes niveaux</h3>
              <p>Tes créations et les niveaux qu’on t’a envoyés, à rejouer et à partager.</p>
              <span className="home-destination-action">
                Ouvrir mes niveaux <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
            <Link className="home-destination" to="/demo">
              <div className="home-destination-top">
                <span className="home-destination-icon">
                  <Play size={24} aria-hidden="true" />
                </span>
                <span className="home-destination-tag">Un peu d’inspiration</span>
                <ArrowRight size={20} aria-hidden="true" />
              </div>
              <h3>La démonstration</h3>
              <p>Une machine, une bille… découvre le plaisir des réactions en chaîne.</p>
              <span className="home-destination-action">
                Voir la machine <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </div>
          <div className="home-utilities">
            <p>Les essais font aussi partie de l’invention.</p>
            <Link to="/settings">
              <Settings size={17} aria-hidden="true" /> Paramètres{' '}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <section className="home-progress" aria-labelledby="home-progress-title">
          <div className="home-progress-copy">
            <p className="home-kicker">
              <CircleCheck size={16} aria-hidden="true" /> Pas à pas, idée après idée
            </p>
            <h2 id="home-progress-title">Ton carnet de bord</h2>
            <p>
              {nextLevel === undefined
                ? 'Tous les défis sont résolus. Place à de nouvelles inventions !'
                : resolvedCount === 0
                  ? 'Ta première invention t’attend. Lance la bille !'
                  : 'Chaque machine résolue ouvre la voie à la suivante.'}
            </p>
          </div>
          <div className="home-progress-details">
            <dl className="home-stats">
              <div>
                <dt>Niveaux résolus</dt>
                <dd>
                  {resolvedCount} / {embeddedLevels.length}
                </dd>
              </div>
              <div>
                <dt>Niveaux accessibles</dt>
                <dd>{unlockedCount}</dd>
              </div>
              <div>
                <dt>Chapitres</dt>
                <dd>{campaignChapters.length}</dd>
              </div>
            </dl>
            <div className="home-progress-track">
              <progress
                aria-label="Progression de la campagne"
                value={resolvedCount}
                max={embeddedLevels.length}
              />
              <span>{percentage} %</span>
            </div>
          </div>
          {(storageError !== null || storageWarning !== null) && (
            <p className="home-storage-note" role="status">
              {storageError !== null
                ? 'La progression ne peut pas être enregistrée sur cet appareil.'
                : 'Une ancienne sauvegarde illisible a été mise de côté.'}
            </p>
          )}
        </section>
        <footer className="home-footer">
          <span>TinkerBolt</span> Le plaisir de faire fonctionner ses idées.
        </footer>
      </div>
    </AppFrame>
  );
}
