// Easter egg: an idle clicker about a Rotaract club's year. Spinning the Rotaract wheel earns hours; projects turn hours into
// francs (fundraisers) and hours and francs into people helped (service), each on a loading bar that gets faster, not bigger, with
// its level; francs also buy the wheels of the Rotary family, which mesh with ours, add hours to every turn and keep it turning by
// itself. People helped are the score: they set the title, and at a handover the pins for the next year.
// A project is designed, not bought: a cause, a format, an audience, a size and ten budget points over venue, food and publicity.
// How well those go together (judge) gives it one to five stars, which scale what every run of it brings, and a one-line review
// that names the weakest part. What goes with what is in the tables below and is not shown: the recipe book keeps what was tried.
// Every run needs a team of the club's members, who are tired for a while afterwards, so the members set how much can run at
// once. They join over time, turn 30 and move on to Rotary. Five of the family's wheels do more than add hours: Interact brings
// members, RYLA trains them, Rotex brings guest speakers (the bell: one of three talks, each a boost for 45 seconds), Inner
// Wheel shortens the rest, Rotary pays part of what service costs.
// Francs can also go to the Rotary Foundation (back after two minutes with a quarter on top, and what was given in all earns
// Paul Harris pins, which double a family wheel for good) or be staked on another club's project (a named chance of a multiple,
// else lost). A handover ends the year: its points buy levels of a small tree, a culture is chosen for the next year, and the
// recipe book, the banners (twelve feats, each 2 % on a turn), the pins and the chartered clubs stay. Chartered clubs (with the
// Districts wheel, named after the app's real clubs) help people by themselves; how many there are is the layer: club, district,
// country, international.
// Opened by the Rütli oath (./Oath). Everything of it is in this folder, texts in the four languages included (not in i18n/, but
// the family's names are the Family screen's): it is fetched on the oath, so the app's first load carries none of it. The state
// is one localStorage value, rac.clicker.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import "./Clicker.css";
import { LANG, LOCALE, tx } from "../../i18n";
import { getData, loaded } from "../../lib/data";
import { devFlag } from "../../lib/dev";
import { store, type StoreKeys } from "../../lib/store";
import { Popup } from "../Popup/Popup";

export type Game = StoreKeys["rac.clicker"];
type Proj = NonNullable<Game["proj"][number]>;
/** what the designer decides: cause, format, audience, size, and the budget points for venue, food, publicity (ten in all) */
export type Plan = Pick<Proj, "c" | "fm" | "a" | "z" | "b">;
/** the wheels of the family: which of tx("fam") it is, its picture and colour, cogs (ours has 24), the hours one level adds to a
 * turn of ours, and the first price in francs; every further level costs half as much again */
const FAM = [
  { name: 2, icon: "🎒", color: "#00a2e0", cogs: 9, gain: 2, price: 40 },
  { name: 4, icon: "⛺", color: "#ff7600", cogs: 10, gain: 6, price: 500 },
  { name: 3, icon: "✈️", color: "#009999", cogs: 11, gain: 25, price: 6000 },
  { name: 5, icon: "🌼", color: "#f7a81b", cogs: 12, gain: 120, price: 80_000 },
  { name: 0, icon: "🏛️", color: "#17458f", cogs: 13, gain: 700, price: 1e6 },
  { name: 6, icon: "🌍", color: "#872175", cogs: 12, gain: 5000, price: 1.5e7 },
  { name: 7, icon: "🗺️", color: "#6c7a89", cogs: 10, gain: 40_000, price: 2.5e8 },
] as const;
/** the causes, Rotary's seven areas of focus: picture, and how well each format (in FORMAT's order) serves it, 0 to 2 */
const CAUSE = [
  ["🕊️", "11120221"],
  ["🩺", "10220102"],
  ["💧", "01212012"],
  ["🤱", "20111212"],
  ["📚", "21010221"],
  ["💼", "12021200"],
  ["🌳", "01202120"],
] as const;
/** the formats: the first four raise francs, the last four (serve) spend francs on people. ideal: the budget it wants for venue,
 * food, publicity; aud: how well it draws each audience (in AUD's order), 0 to 2; from, to: the months (0 to 11) it works in,
 * all of them if there are none */
const FORMAT: readonly {
  icon: string;
  serve?: true;
  ideal: readonly number[];
  aud: string;
  from?: number;
  to?: number;
}[] = [
  { icon: "🧁", ideal: [1, 6, 3], aud: "1201" },
  { icon: "🥂", ideal: [3, 5, 2], aud: "2021" },
  { icon: "🏃", ideal: [3, 2, 5], aud: "2210", from: 3, to: 9 },
  { icon: "🎻", ideal: [5, 4, 1], aud: "0022", from: 9, to: 2 },
  { icon: "🧤", serve: true, ideal: [2, 3, 5], aud: "2110", from: 2, to: 9 },
  { icon: "📚", serve: true, ideal: [5, 1, 4], aud: "2101" },
  { icon: "🏕️", serve: true, ideal: [4, 5, 1], aud: "2200", from: 5, to: 8 },
  { icon: "🚚", serve: true, ideal: [2, 1, 7], aud: "0212" },
];
/** the audiences: picture, and how each moves the budget a format wants (students care less for the venue than for hearing of it) */
const AUD = [
  ["🎓", [-1, 0, 1]],
  ["👨‍👩‍👧", [0, 1, -1]],
  ["🧑‍💼", [1, -1, 0]],
  ["⚙️", [1, 0, -1]],
] as const;
/** the sizes: what a run costs (h hours, and for service f francs), its seconds at level 0, what it brings at three stars (out
 * francs for a fundraiser, ppl people for service), and the francs designing one costs */
const SIZE = [
  { h: 10, f: 15, s: 5, out: 8, ppl: 2, fee: 0 },
  { h: 80, f: 250, s: 9, out: 90, ppl: 40, fee: 150 },
  { h: 700, f: 5000, s: 16, out: 1100, ppl: 1000, fee: 3000 },
  { h: 9000, f: 120_000, s: 30, out: 20_000, ppl: 30_000, fee: 60_000 },
] as const;
/** the members a run of each size needs */
const NEED = [1, 3, 8, 20];
/** another club's project to stake on: [the chance it works, what the stake comes back as] */
const ODDS = [
  [0.8, 1.4],
  [0.6, 2],
  [0.4, 3.2],
  [0.2, 7],
] as const;
/** the tree a handover's points buy: the most levels of each (level n costs n points): hours per turn, hours counted while
 * away, officers for new projects, slots from the start, the chance of a stake */
const TREE = [99, 4, 1, 4, 3];
/** the cultures a year can have, as what they multiply: the length of a bar, the rest after it, the length of a talk, the hours
 * of a turn, how fast members join, what a fundraiser brings */
const PLAIN = { dur: 1, rest: 1, talk: 1, hours: 1, join: 1, out: 1 };
const CULT: Partial<typeof PLAIN>[] = [
  { dur: 1.1, rest: 0.5 },
  { dur: 0.8, rest: 1.5 },
  { talk: 2, hours: 0.9 },
  { join: 2, out: 0.9 },
];
/** the chartered clubs at which the next layer begins (club, district, country, international), and what a layer multiplies
 * what they do by */
const LAYER = [0, 1, 5, 12];
const REACH = [1, 1, 2, 5];
/** what one to five stars make of what a run brings */
const STAR = [0.4, 0.7, 1, 1.5, 2.2];
/** the francs the third to sixth project slot cost; two are there from the start */
const SLOT = [0, 0, 400, 8000, 150_000, 3e6];
/** how the wheel is spun: a tap, then a swipe, then holding it down; [fastest turns per second, price in francs] */
const SPIN = [
  [1.5, 0],
  [3, 150],
  [4, 5000],
] as const;
/** the people helped this year (g.p) at which the next title begins */
const RANKS = [0, 50, 1e3, 2e4, 5e5, 1e7];
const TEXT = {
  en: {
    title: "Service hours",
    stats: ["Hours", "Francs", "People helped"],
    tabs: ["Wheels", "Projects", "Club", "Fund", "Year"],
    tap: "Turn the wheel",
    turn: "{n} h per turn",
    spin: ["Tap to spin", "Swipe to spin", "Hold to spin"],
    faster: "Faster",
    auto: "Auto",
    bell: "Ring the bell",
    away: "While you were away:",
    reset: "Start over",
    sure: "Start over and lose everything?",
    over: "Hand over · +{n} 🎖",
    overHint:
      "A new Rotary year starts from zero. You keep the recipe book, banners, chartered clubs, Paul Harris pins, and 🎖 to spend above. The first 🎖 comes at 100 people helped.",
    causes: ["Peace", "Health", "Water", "Mothers & children", "Education", "Local economy", "Environment"],
    formats: ["Bake sale", "Apéro", "Charity run", "Gala", "Hands-on day", "Workshop", "Camp", "Aid drive"],
    auds: ["Students", "Families", "Alumni", "Rotarians"],
    sizes: ["Small", "Medium", "Large", "Huge"],
    budget: ["Venue", "Food & drink", "Publicity"],
    pick: ["Cause", "Format", "Audience", "Size", "Budget"],
    left: "{n} to spend",
    design: "New project",
    redesign: "Redesign",
    go: "Run it",
    back: "Back",
    book: "Recipe book",
    slot: "One more project",
    reviews: [
      "Everything fitted.",
      "The cause and the format did not go together.",
      "The wrong crowd for this.",
      "The wrong time of year.",
      "Too little went to: {x}.",
    ],
    crew: ["Members", "Tired", "Trained", "At Rotary"],
    clubHint:
      "Every run needs a team. Afterwards the team is tired for a while, so more members mean more projects at once.",
    camp: "Send {n} to RYLA",
    speaker: "A guest speaker! Pick a talk:",
    talks: ["Hours ×3", "Runs bring double", "Nobody gets tired"],
    fam: [
      "Members join faster, and the club can hold {n}.",
      "Send up to {n} members to a camp. After a minute they are back trained and count double.",
      "Guest speakers come {n} % more often.",
      "A tired team is back after {n} s.",
      "Pays {n} % of the francs service projects cost. Members who turn 30 move there and add 1 % each.",
    ],
    give: "Donate half · {n} 💰",
    giveHint:
      "The Rotary Foundation returns a donation after two minutes as a district grant, ×{n}. Each time all you ever gave grows tenfold, you get a Paul Harris pin.",
    phf: "Paul Harris pins to award: {n}",
    phfHint: "Award one to a wheel of the family: it then counts double for hours, for good.",
    stake: "Back another club's project",
    stakeHint:
      "A quarter of your francs ({n} 💰) for 30 seconds. If the project works you get a multiple back; if not, the stake is gone.",
    staked: "{club}: {n} 💰 at stake · {s} s",
    won: "It worked: +{n} 💰",
    lost: "It failed: −{n} 💰",
    tree: [
      ["Experience", "+25 % hours per turn"],
      ["Treasurer", "+4 h counted while away"],
      ["Vice-president", "New projects run by themselves"],
      ["Committee", "One more project slot from the start"],
      ["Good nose", "+5 % chance when backing a project"],
    ],
    cultTitle: "The club's culture next year:",
    cults: [
      ["Bern", "Bars 10 % slower, teams rest half as long"],
      ["Zürich", "Bars 20 % faster, teams rest half as long again"],
      ["Romandie", "Talks last twice as long, 10 % fewer hours per turn"],
      ["Ticino", "Members join twice as fast, fundraisers bring 10 % less"],
    ],
    charter: "Charter a club",
    charterHint:
      "Each club you chartered helps people by itself: your best year, once an hour. Three per level of Districts.",
    layers: ["Club", "District", "Country", "International"],
    banTitle: "Banners",
    banHint: "Each banner adds 2 % to every turn.",
    bans: [
      "First project",
      "Five stars",
      "Ten recipes",
      "The whole family",
      "100 people helped",
      "10,000 people helped",
      "1 million people helped",
      "First handover",
      "Five trained",
      "First club chartered",
      "Paul Harris Fellow",
      "Six projects",
    ],
    ranks: ["Guest", "Member", "Board member", "President", "DRR", "RI President"],
  },
  de: {
    title: "Service-Stunden",
    stats: ["Stunden", "Franken", "Menschen geholfen"],
    tabs: ["Räder", "Projekte", "Club", "Fonds", "Jahr"],
    tap: "Rad drehen",
    turn: "{n} Std. pro Umdrehung",
    spin: ["Tippen", "Wischen", "Halten"],
    faster: "Schneller",
    auto: "Auto",
    bell: "Glocke läuten",
    away: "In deiner Abwesenheit:",
    reset: "Neu anfangen",
    sure: "Neu anfangen und alles verlieren?",
    over: "Amt übergeben · +{n} 🎖",
    overHint:
      "Ein neues Rotary-Jahr fängt bei null an. Es bleiben: Rezeptbuch, Wimpel, gegründete Clubs, Paul-Harris-Pins und 🎖 für oben. Die erste 🎖 gibt es ab 100 geholfenen Menschen.",
    causes: ["Frieden", "Gesundheit", "Wasser", "Mütter & Kinder", "Bildung", "Lokale Wirtschaft", "Umwelt"],
    formats: ["Kuchenverkauf", "Apéro", "Spendenlauf", "Gala", "Hands-on-Tag", "Workshop", "Lager", "Sammelaktion"],
    auds: ["Studierende", "Familien", "Alumni", "Rotary-Mitglieder"],
    sizes: ["Klein", "Mittel", "Gross", "Riesig"],
    budget: ["Lokal", "Essen & Trinken", "Werbung"],
    pick: ["Zweck", "Format", "Publikum", "Grösse", "Budget"],
    left: "noch {n} zu verteilen",
    design: "Neues Projekt",
    redesign: "Neu planen",
    go: "Durchführen",
    back: "Zurück",
    book: "Rezeptbuch",
    slot: "Ein Projekt mehr",
    reviews: [
      "Alles hat gepasst.",
      "Zweck und Format passten nicht zusammen.",
      "Das falsche Publikum dafür.",
      "Die falsche Jahreszeit.",
      "Zu wenig Geld für: {x}.",
    ],
    crew: ["Mitglieder", "Müde", "Ausgebildet", "Bei Rotary"],
    clubHint:
      "Jeder Durchgang braucht ein Team. Danach ist es eine Weile müde: Mehr Mitglieder heisst mehr Projekte gleichzeitig.",
    camp: "{n} ins RYLA schicken",
    speaker: "Ein Gastreferat! Wähl ein Thema:",
    talks: ["Stunden ×3", "Doppelter Ertrag", "Niemand wird müde"],
    fam: [
      "Mitglieder kommen schneller dazu, und der Club fasst {n}.",
      "Schick bis zu {n} Mitglieder ins Lager. Nach einer Minute sind sie ausgebildet zurück und zählen doppelt.",
      "Gastreferate gibt es {n} % öfter.",
      "Ein müdes Team ist nach {n} s wieder da.",
      "Zahlt {n} % der Franken, die Hilfsprojekte kosten. Wer 30 wird, wechselt dorthin und bringt je 1 % dazu.",
    ],
    give: "Die Hälfte spenden · {n} 💰",
    giveHint:
      "Die Rotary Foundation gibt eine Spende nach zwei Minuten als Distrikt-Grant zurück, ×{n}. Jedes Mal, wenn sich alles je Gespendete verzehnfacht, gibt es einen Paul-Harris-Pin.",
    phf: "Paul-Harris-Pins zu vergeben: {n}",
    phfHint: "Verleih einen an ein Rad der Familie: Es zählt dann für immer doppelt für Stunden.",
    stake: "Das Projekt eines anderen Clubs unterstützen",
    stakeHint:
      "Ein Viertel deiner Franken ({n} 💰) für 30 Sekunden. Gelingt das Projekt, kommt ein Mehrfaches zurück; wenn nicht, ist der Einsatz weg.",
    staked: "{club}: {n} 💰 im Einsatz · {s} s",
    won: "Gelungen: +{n} 💰",
    lost: "Gescheitert: −{n} 💰",
    tree: [
      ["Erfahrung", "+25 % Stunden pro Umdrehung"],
      ["Kassier:in", "+4 Std. Abwesenheit angerechnet"],
      ["Vizepräsidium", "Neue Projekte laufen von selbst"],
      ["Komitee", "Ein Projektplatz mehr von Anfang an"],
      ["Gute Nase", "+5 % Chance beim Unterstützen"],
    ],
    cultTitle: "Die Clubkultur im nächsten Jahr:",
    cults: [
      ["Bern", "Balken 10 % langsamer, Teams ruhen halb so lang"],
      ["Zürich", "Balken 20 % schneller, Teams ruhen anderthalbmal so lang"],
      ["Romandie", "Referate wirken doppelt so lang, 10 % weniger Stunden pro Umdrehung"],
      ["Ticino", "Mitglieder kommen doppelt so schnell, Geldsammeln bringt 10 % weniger"],
    ],
    charter: "Club gründen",
    charterHint:
      "Jeder gegründete Club hilft von selbst: dein bestes Jahr, einmal pro Stunde. Drei pro Stufe von Distrikte.",
    layers: ["Club", "Distrikt", "Land", "International"],
    banTitle: "Wimpel",
    banHint: "Jeder Wimpel bringt 2 % mehr pro Umdrehung.",
    bans: [
      "Erstes Projekt",
      "Fünf Sterne",
      "Zehn Rezepte",
      "Die ganze Familie",
      "100 Menschen geholfen",
      "10 000 Menschen geholfen",
      "1 Million Menschen geholfen",
      "Erste Amtsübergabe",
      "Fünf Ausgebildete",
      "Erster Club gegründet",
      "Paul Harris Fellow",
      "Sechs Projekte",
    ],
    ranks: ["Gast", "Mitglied", "Vorstand", "Präsidium", "DRR", "RI-Präsidium"],
  },
  fr: {
    title: "Heures de service",
    stats: ["Heures", "Francs", "Personnes aidées"],
    tabs: ["Roues", "Projets", "Club", "Fonds", "Année"],
    tap: "Tourner la roue",
    turn: "{n} h par tour",
    spin: ["Toucher", "Glisser", "Maintenir"],
    faster: "Plus vite",
    auto: "Auto",
    bell: "Sonner la cloche",
    away: "Pendant ton absence :",
    reset: "Recommencer",
    sure: "Recommencer et tout perdre ?",
    over: "Passer le relais · +{n} 🎖",
    overHint:
      "Une nouvelle année rotarienne repart de zéro. Tu gardes : le livre de recettes, les fanions, les clubs fondés, les pins Paul Harris et des 🎖 à dépenser ci-dessus. La première 🎖 arrive à 100 personnes aidées.",
    causes: ["Paix", "Santé", "Eau", "Mères & enfants", "Éducation", "Économie locale", "Environnement"],
    formats: [
      "Vente de gâteaux",
      "Apéro",
      "Course caritative",
      "Gala",
      "Journée d'action",
      "Atelier",
      "Camp",
      "Collecte",
    ],
    auds: ["Étudiants", "Familles", "Alumni", "Rotariens"],
    sizes: ["Petit", "Moyen", "Grand", "Énorme"],
    budget: ["Lieu", "Boire & manger", "Publicité"],
    pick: ["Cause", "Format", "Public", "Taille", "Budget"],
    left: "encore {n} à répartir",
    design: "Nouveau projet",
    redesign: "Repenser",
    go: "Lancer",
    back: "Retour",
    book: "Livre de recettes",
    slot: "Un projet de plus",
    reviews: [
      "Tout était juste.",
      "La cause et le format n'allaient pas ensemble.",
      "Pas le bon public.",
      "Pas la bonne saison.",
      "Trop peu pour : {x}.",
    ],
    crew: ["Membres", "Fatigués", "Formés", "Au Rotary"],
    clubHint:
      "Chaque projet demande une équipe. Ensuite elle est fatiguée un moment : plus de membres, c'est plus de projets à la fois.",
    camp: "Envoyer {n} au RYLA",
    speaker: "Un conférencier ! Choisis un thème :",
    talks: ["Heures ×3", "Double résultat", "Personne ne fatigue"],
    fam: [
      "Les membres arrivent plus vite, et le club peut en compter {n}.",
      "Envoie jusqu'à {n} membres en camp. Après une minute, ils reviennent formés et comptent double.",
      "Les conférenciers viennent {n} % plus souvent.",
      "Une équipe fatiguée revient après {n} s.",
      "Paie {n} % des francs que coûtent les projets d'aide. Qui a 30 ans y passe et ajoute 1 %.",
    ],
    give: "Donner la moitié · {n} 💰",
    giveHint:
      "La Fondation Rotary rend un don après deux minutes sous forme de subvention de district, ×{n}. Chaque fois que le total de tes dons décuple, tu reçois un pin Paul Harris.",
    phf: "Pins Paul Harris à décerner : {n}",
    phfHint: "Décerne-en un à une roue de la famille : elle compte alors double pour les heures, pour toujours.",
    stake: "Soutenir le projet d'un autre club",
    stakeHint:
      "Un quart de tes francs ({n} 💰) pendant 30 secondes. Si le projet réussit, tu en récupères un multiple ; sinon, la mise est perdue.",
    staked: "{club} : {n} 💰 en jeu · {s} s",
    won: "Réussi : +{n} 💰",
    lost: "Raté : −{n} 💰",
    tree: [
      ["Expérience", "+25 % d'heures par tour"],
      ["Trésorerie", "+4 h d'absence comptées"],
      ["Vice-présidence", "Les nouveaux projets tournent tout seuls"],
      ["Comité", "Une place de projet en plus dès le départ"],
      ["Bon flair", "+5 % de chance en soutenant un projet"],
    ],
    cultTitle: "La culture du club l'an prochain :",
    cults: [
      ["Berne", "Barres 10 % plus lentes, les équipes se reposent moitié moins"],
      ["Zurich", "Barres 20 % plus rapides, les équipes se reposent une fois et demie plus"],
      ["Romandie", "Les conférences durent deux fois plus, 10 % d'heures en moins par tour"],
      ["Tessin", "Les membres arrivent deux fois plus vite, les collectes rapportent 10 % de moins"],
    ],
    charter: "Fonder un club",
    charterHint:
      "Chaque club fondé aide tout seul : ta meilleure année, une fois par heure. Trois par niveau de Districts.",
    layers: ["Club", "District", "Pays", "International"],
    banTitle: "Fanions",
    banHint: "Chaque fanion ajoute 2 % à chaque tour.",
    bans: [
      "Premier projet",
      "Cinq étoiles",
      "Dix recettes",
      "Toute la famille",
      "100 personnes aidées",
      "10 000 personnes aidées",
      "1 million de personnes aidées",
      "Première passation",
      "Cinq formés",
      "Premier club fondé",
      "Paul Harris Fellow",
      "Six projets",
    ],
    ranks: ["Invité", "Membre", "Comité", "Présidence", "DRR", "Présidence du RI"],
  },
  it: {
    title: "Ore di servizio",
    stats: ["Ore", "Franchi", "Persone aiutate"],
    tabs: ["Ruote", "Progetti", "Club", "Fondo", "Anno"],
    tap: "Gira la ruota",
    turn: "{n} h per giro",
    spin: ["Tocca", "Scorri", "Tieni premuto"],
    faster: "Più veloce",
    auto: "Auto",
    bell: "Suona la campana",
    away: "Mentre eri via:",
    reset: "Ricomincia",
    sure: "Ricominciare e perdere tutto?",
    over: "Passa le consegne · +{n} 🎖",
    overHint:
      "Un nuovo anno rotariano riparte da zero. Ti restano: ricettario, gagliardetti, club fondati, spille Paul Harris e 🎖 da spendere qui sopra. La prima 🎖 arriva a 100 persone aiutate.",
    causes: ["Pace", "Salute", "Acqua", "Madri & bambini", "Istruzione", "Economia locale", "Ambiente"],
    formats: [
      "Vendita di torte",
      "Aperitivo",
      "Corsa di beneficenza",
      "Gala",
      "Giornata sul campo",
      "Workshop",
      "Campo",
      "Raccolta",
    ],
    auds: ["Studenti", "Famiglie", "Alumni", "Rotariani"],
    sizes: ["Piccolo", "Medio", "Grande", "Enorme"],
    budget: ["Luogo", "Cibo & bevande", "Pubblicità"],
    pick: ["Causa", "Formato", "Pubblico", "Dimensione", "Budget"],
    left: "ancora {n} da distribuire",
    design: "Nuovo progetto",
    redesign: "Ripensa",
    go: "Avvia",
    back: "Indietro",
    book: "Ricettario",
    slot: "Un progetto in più",
    reviews: [
      "Tutto era giusto.",
      "Causa e formato non andavano insieme.",
      "Il pubblico sbagliato.",
      "La stagione sbagliata.",
      "Troppo poco per: {x}.",
    ],
    crew: ["Soci", "Stanchi", "Formati", "Al Rotary"],
    clubHint: "Ogni progetto richiede una squadra. Poi è stanca per un po': più soci significa più progetti insieme.",
    camp: "Manda {n} al RYLA",
    speaker: "Un relatore ospite! Scegli un tema:",
    talks: ["Ore ×3", "Risultato doppio", "Nessuno si stanca"],
    fam: [
      "I soci arrivano più in fretta, e il club ne può avere {n}.",
      "Manda fino a {n} soci a un campo. Dopo un minuto tornano formati e contano doppio.",
      "I relatori ospiti vengono il {n} % più spesso.",
      "Una squadra stanca torna dopo {n} s.",
      "Paga il {n} % dei franchi che costano i progetti di aiuto. Chi compie 30 anni passa lì e aggiunge l'1 %.",
    ],
    give: "Dona la metà · {n} 💰",
    giveHint:
      "La Fondazione Rotary restituisce una donazione dopo due minuti come sovvenzione distrettuale, ×{n}. Ogni volta che il totale donato si decuplica, ricevi una spilla Paul Harris.",
    phf: "Spille Paul Harris da assegnare: {n}",
    phfHint: "Assegnane una a una ruota della famiglia: conta doppio per le ore, per sempre.",
    stake: "Sostieni il progetto di un altro club",
    stakeHint:
      "Un quarto dei tuoi franchi ({n} 💰) per 30 secondi. Se il progetto riesce ne torna un multiplo; se no, la puntata è persa.",
    staked: "{club}: {n} 💰 in gioco · {s} s",
    won: "Riuscito: +{n} 💰",
    lost: "Fallito: −{n} 💰",
    tree: [
      ["Esperienza", "+25 % di ore per giro"],
      ["Tesoreria", "+4 h di assenza contate"],
      ["Vicepresidenza", "I nuovi progetti partono da soli"],
      ["Comitato", "Un posto progetto in più dall'inizio"],
      ["Buon fiuto", "+5 % di probabilità nel sostenere un progetto"],
    ],
    cultTitle: "La cultura del club l'anno prossimo:",
    cults: [
      ["Berna", "Barre più lente del 10 %, le squadre riposano la metà"],
      ["Zurigo", "Barre più veloci del 20 %, le squadre riposano una volta e mezza"],
      ["Romandia", "Le relazioni durano il doppio, 10 % di ore in meno per giro"],
      ["Ticino", "I soci arrivano due volte più in fretta, le raccolte rendono il 10 % in meno"],
    ],
    charter: "Fonda un club",
    charterHint:
      "Ogni club fondato aiuta da solo: il tuo anno migliore, una volta all'ora. Tre per livello di Distretti.",
    layers: ["Club", "Distretto", "Paese", "Internazionale"],
    banTitle: "Gagliardetti",
    banHint: "Ogni gagliardetto aggiunge il 2 % a ogni giro.",
    bans: [
      "Primo progetto",
      "Cinque stelle",
      "Dieci ricette",
      "Tutta la famiglia",
      "100 persone aiutate",
      "10 000 persone aiutate",
      "1 milione di persone aiutate",
      "Primo passaggio delle consegne",
      "Cinque formati",
      "Primo club fondato",
      "Paul Harris Fellow",
      "Sei progetti",
    ],
    ranks: ["Ospite", "Socio", "Consiglio", "Presidenza", "DRR", "Presidenza del RI"],
  },
}[LANG];
const ICONS = ["⏱️", "💰", "❤️"];
const CREW = ["👥", "😴", "🎓", "🏛️"];
const NUM = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
/** whole below a thousand, compact (12.4K) above */
const fmt = (n: number): string => NUM.format(n < 1000 ? Math.floor(n) : n);
const sum = (a: readonly number[]): number => a.reduce((s, n) => s + n, 0);

/** a year from zero. keep: what a handover carries into it (KEEP's fields); the tree's slots are there from the start */
export const fresh = (now: number, keep: Partial<Game> = {}): Game => ({
  v: 5,
  h: 0,
  f: 0,
  p: 0,
  at: now,
  spin: 0,
  fam: FAM.map(() => 0),
  proj: Array<null>(2 + (keep.tree?.[3] ?? 0)).fill(null),
  book: [],
  pins: 0,
  mem: 3,
  tired: 0,
  pro: 0,
  camp: 0,
  campT: 0,
  alum: 0,
  boost: -1,
  boostT: 0,
  grants: [],
  given: 0,
  phf: FAM.map(() => 0),
  stake: null,
  res: 0,
  tree: TREE.map(() => 0),
  cult: -1,
  clubs: [],
  best: 0,
  yrs: 0,
  ban: [],
  ...keep,
});
const KEEP = ["book", "pins", "given", "phf", "tree", "clubs", "best", "yrs", "ban"] as const;
/** what this year's culture multiplies (PLAIN's fields) */
const cult = (g: Game): typeof PLAIN => ({ ...PLAIN, ...CULT[g.cult] });
/** the hours one turn of our wheel earns: three and what the family's wheels add (a wheel with a Paul Harris pin twice), a
 * quarter more per level of experience, 2 % more per banner, by the culture, and thrice all that during the talk about hours */
export const perTurn = (g: Game): number =>
  (3 + sum(FAM.map((d, i) => d.gain * g.fam[i]! * 2 ** g.phf[i]!))) *
  (1 + g.tree[0]! / 4) *
  (1 + g.ban.length / 50) *
  cult(g).hours *
  (g.boost === 0 ? 3 : 1);
/** the turns per second the family keeps our wheel at when nobody spins it */
export const idle = (g: Game): number => Math.min(1.2, 0.08 * sum(g.fam));
/** the members the club can hold: six, and six more per level of Interact */
export const room = (g: Game): number => 6 + 6 * g.fam[0]!;
/** the members there are to work: the whole ones, a trained one counting double */
export const team = (g: Game): number => Math.floor(g.mem) + g.pro;
/** those of them that are neither on a running project nor tired */
export const free = (g: Game): number => team(g) - sum(g.proj.map((s) => (s && s.t >= 0 ? NEED[s.z]! : 0))) - g.tired;
/** the seconds a team is tired after a run: six, less with every level of Inner Wheel */
export const rest = (g: Game): number => (6 * cult(g).rest) / (1 + g.fam[3]!);
/** the share of a service project's francs Rotary pays: 5 % per level and 1 % per member who moved there, three quarters at most */
export const sponsor = (g: Game): number =>
  g.fam[4] ? Math.min(0.75, 0.05 * g.fam[4] + 0.01 * Math.floor(g.alum)) : 0;
export const famPrice = (g: Game, i: number): number => Math.ceil(FAM[i]!.price * 1.5 ** g.fam[i]!);

/** how good a plan is in the month it is made: one to five stars, the weakest of its four parts (0 cause and format, 1 format
 * and audience, 2 the time of year, 3 the budget; -1 if nothing is weak) and the budget item that is furthest short */
export function judge(p: Plan, month: number): Pick<Proj, "st" | "weak" | "want"> {
  const fm = FORMAT[p.fm]!;
  const { from, to = 0 } = fm;
  const inSeason = from === undefined || (from <= to ? month >= from && month <= to : month >= from || month <= to);
  const short = fm.ideal.map((n, i) => n + AUD[p.a]![1][i]! - p.b[i]!);
  // [points, the most there are]: the budget loses a point for every point that sits on the wrong item
  const parts = [
    [+CAUSE[p.c]![1][p.fm]!, 2],
    [+fm.aud[p.a]!, 2],
    [+inSeason, 1],
    [Math.max(0, 3 - sum(short.map(Math.abs)) / 2), 3],
  ] as const;
  const share = parts.map(([n, most]) => n / most);
  const low = Math.min(...share);
  return {
    st: Math.min(5, 1 + Math.floor(sum(parts.map(([n]) => n)) / 2)),
    weak: low < 1 ? share.indexOf(low) : -1,
    want: short.indexOf(Math.max(...short)),
  };
}
/** what a run of a project costs (h hours, f francs, need members) and brings (out francs, ppl people helped): its size's, by
 * its stars; Rotary pays its share of the francs, and the talk about results doubles what it brings */
export function runs(pr: Proj, g: Game): { h: number; f: number; need: number; out: number; ppl: number } {
  const z = SIZE[pr.z]!;
  const by = (n: number) => Math.max(1, Math.round(n * STAR[pr.st - 1]!)) * (g.boost === 1 ? 2 : 1);
  const cost = { h: z.h, need: NEED[pr.z]! };
  return FORMAT[pr.fm]!.serve
    ? { ...cost, f: Math.round(z.f * (1 - sponsor(g))), out: 0, ppl: by(z.ppl) }
    : { ...cost, f: 0, out: by(z.out * cult(g).out), ppl: 0 };
}
/** the seconds one run takes: a quarter faster with every level, and by the culture */
export const dur = (pr: Proj, g: Game): number => (SIZE[pr.z]!.s * cult(g).dur) / 1.25 ** pr.lv;
export const lvPrice = (pr: Proj): number => Math.ceil((SIZE[pr.z]!.fee / 2 + 5) * 1.4 ** pr.lv);
export const autoPrice = (pr: Proj): number => (SIZE[pr.z]!.fee + 25) * 4;

const slot = (g: Game, i: number, to: Partial<Proj>): Game => ({
  ...g,
  proj: g.proj.map((s, j) => (s && j === i ? { ...s, ...to } : s)),
});
/** g after `price` francs were paid for `then`, or g as it was if the francs do not reach */
const pay = (g: Game, price: number, then: (g: Game) => Game): Game =>
  g.f < price ? g : then({ ...g, f: g.f - price });
export const buyFam = (g: Game, i: number): Game =>
  pay(g, famPrice(g, i), (x) => ({ ...x, fam: x.fam.map((n, j) => n + +(j === i)) }));
export const buySpin = (g: Game): Game =>
  g.spin + 1 < SPIN.length ? pay(g, SPIN[g.spin + 1]![1], (x) => ({ ...x, spin: x.spin + 1 })) : g;
export const buySlot = (g: Game): Game =>
  g.proj.length < SLOT.length ? pay(g, SLOT[g.proj.length]!, (x) => ({ ...x, proj: [...x.proj, null] })) : g;
/** how a plan is written into the recipe book: its numbers and stars, the plan first so that a plan tried again replaces itself */
const recipe = (p: Plan, st: number): string => [p.c, p.fm, p.a, p.z, ...p.b, st].join(".");
/** puts a plan into slot i for its size's fee: judged for this month, from level 0, a run in progress lost; an officer who was
 * there stays, and with the tree's vice-president there always is one. The recipe book gets it on top. */
export const design = (g: Game, i: number, p: Plan, month: number): Game =>
  sum(p.b) !== 10 || i >= g.proj.length
    ? g
    : pay(g, SIZE[p.z]!.fee, (x) => {
        const verdict = judge(p, month);
        const key = recipe(p, 0).slice(0, -1);
        return {
          ...x,
          proj: x.proj.map((s, j) =>
            j === i ? { ...p, ...verdict, lv: 0, auto: (s?.auto ?? false) || x.tree[2]! > 0, t: -1 } : s,
          ),
          book: [recipe(p, verdict.st), ...x.book.filter((r) => !r.startsWith(key))].slice(0, 80),
        };
      });
/** makes project i a level faster */
export const faster = (g: Game, i: number): Game => {
  const pr = g.proj[i];
  return pr ? pay(g, lvPrice(pr), (x) => slot(x, i, { lv: pr.lv + 1 })) : g;
};
/** an officer for project i: it starts again by itself */
export const officer = (g: Game, i: number): Game => {
  const pr = g.proj[i];
  return !pr || pr.auto ? g : pay(g, autoPrice(pr), (x) => slot(x, i, { auto: true }));
};
/** starts a run of project i by hand, if it is idle and its hours, francs and team are there */
export const start = (g: Game, i: number): Game => {
  const pr = g.proj[i];
  if (!pr || pr.t >= 0) return g;
  const d = runs(pr, g);
  return g.h < d.h || g.f < d.f || free(g) < d.need ? g : slot({ ...g, h: g.h - d.h, f: g.f - d.f }, i, { t: 0 });
};
/** sends as many members to the RYLA camp as the RYLA wheel has levels, if they are free and untrained and nobody is there yet;
 * one always stays */
export const toCamp = (g: Game): Game => {
  const n = Math.min(g.fam[1]!, Math.floor(free(g)), Math.floor(g.mem) - g.pro, Math.floor(g.mem) - 1);
  return g.camp || n < 1 ? g : { ...g, mem: g.mem - n, camp: n, campT: 60 };
};
/** the guest speaker's talk k (0 hours thrice, 1 runs bring double, 2 nobody gets tired), for 45 seconds */
export const talk = (g: Game, k: number): Game => ({ ...g, boost: k, boostT: 45 * cult(g).talk });

/** what a donation comes back as: a quarter more, and a quarter more per level of the Foundation's wheel */
export const grantRate = (g: Game): number => 1.25 + 0.25 * g.fam[5]!;
/** gives `amt` francs to the Foundation: back in two minutes at grantRate, and counted in all that was ever given */
export const donate = (g: Game, amt: number): Game =>
  amt < 1 ? g : pay(g, amt, (x) => ({ ...x, grants: [...x.grants, [amt, 120]], given: x.given + amt }));
/** the Paul Harris pins still to award: one at 1000 francs given in all, one more at every tenfold, less those awarded */
export const phfFree = (g: Game): number => (g.given < 1000 ? 0 : Math.floor(Math.log10(g.given)) - 2) - sum(g.phf);
/** awards a Paul Harris pin to family wheel i, if one is to award and the wheel is there */
export const award = (g: Game, i: number): Game =>
  phfFree(g) > 0 && g.fam[i] ? { ...g, phf: g.phf.map((n, j) => n + +(j === i)) } : g;
/** the chance that the project staked on at odds k works: the odds', and 5 % more per level of the tree's good nose */
export const chance = (g: Game, k: number): number => Math.min(0.95, ODDS[k]![0] + 0.05 * g.tree[4]!);
/** stakes a quarter of the francs on club's project at odds k, for 30 seconds; win (drawn by the caller with chance) is how it
 * will end. One stake at a time, and not under 10 francs. */
export const stake = (g: Game, k: number, club: string, win: boolean): Game => {
  const amt = Math.floor(g.f / 4);
  return g.stake || amt < 10 ? g : { ...g, f: g.f - amt, stake: { club, k, amt, win, t: 30 }, res: 0 };
};
export const treePrice = (g: Game, i: number): number => g.tree[i]! + 1;
/** one more level of the tree's branch i, for as many handover points as the level's number */
export const buyTree = (g: Game, i: number): Game =>
  g.tree[i]! >= TREE[i]! || g.pins < treePrice(g, i)
    ? g
    : { ...g, pins: g.pins - treePrice(g, i), tree: g.tree.map((n, j) => n + +(j === i)) };
/** which layer the club has reached with the clubs it chartered: 0 club, 1 district, 2 country, 3 international */
export const layer = (g: Game): number => LAYER.findLastIndex((n) => g.clubs.length >= n);
export const charterPrice = (g: Game): number => 5e5 * 2 ** g.clubs.length;
/** charters a club of that name: three per level of the Districts wheel */
export const charter = (g: Game, name: string): Game =>
  g.clubs.length >= 3 * g.fam[6]! ? g : pay(g, charterPrice(g), (x) => ({ ...x, clubs: [...x.clubs, name] }));
/** the feats a banner is won for, in the order of TEXT.bans */
const BANS: ((g: Game) => boolean)[] = [
  (g) => g.book.length > 0,
  (g) => g.book.some((r) => r.endsWith(".5")),
  (g) => g.book.length >= 10,
  (g) => g.fam.every((n) => n > 0),
  (g) => g.p >= 100,
  (g) => g.p >= 1e4,
  (g) => g.p >= 1e6,
  (g) => g.yrs > 0,
  (g) => g.pro >= 5,
  (g) => g.clubs.length > 0,
  (g) => sum(g.phf) > 0,
  (g) => g.proj.length >= 6,
];
/** g with the banners it has newly won */
const flags = (g: Game): Game => {
  const won = BANS.flatMap((ok, i) => (!g.ban.includes(i) && ok(g) ? [i] : []));
  return won.length ? { ...g, ban: [...g.ban, ...won] } : g;
};
/** the money and the district dt seconds later: donations that are due come back, the stake ends one way or the other, and
 * every chartered club helps the best year's people in an hour, by the layer's reach */
function fund(g: Game, dt: number): Game {
  const due = sum(g.grants.map(([amt, t]) => (t! <= dt ? amt! : 0))) * grantRate(g);
  const end = g.stake && g.stake.t <= dt ? g.stake : null;
  const prize = end ? end.amt * ODDS[end.k]![1] : 0;
  let res = g.res;
  if (end) res = end.win ? prize - end.amt : -end.amt;
  return {
    ...g,
    f: g.f + due + (end?.win ? prize : 0),
    grants: g.grants.flatMap(([amt, t]) => (t! <= dt ? [] : [[amt!, t! - dt]])),
    stake: g.stake && !end ? { ...g.stake, t: g.stake.t - dt } : null,
    res,
    p: g.p + (g.clubs.length * REACH[layer(g)]! * g.best * dt) / 3600,
  };
}
/** the members dt seconds later: one joins every 20 seconds (faster with Interact) while there is room, those beyond the three
 * founders turn 30 at a rate of one in 900 a second and go to Rotary if its wheel is there, the camp ends, the talk runs out */
function crew(g: Game, dt: number): Game {
  const out = (Math.max(g.mem - 3, 0) * dt) / 900;
  const back = g.camp > 0 && g.campT <= dt ? g.camp : 0;
  // those at the camp keep their place
  const stay = g.mem - out;
  const mem = Math.max(stay, Math.min(room(g) - g.camp, stay + (0.05 + 0.03 * g.fam[0]!) * cult(g).join * dt)) + back;
  return {
    ...g,
    mem,
    pro: Math.min(g.pro, Math.floor(mem)) + back,
    camp: back ? 0 : g.camp,
    campT: Math.max(g.campT - dt, 0),
    alum: g.alum + (g.fam[4] ? out : 0),
    boost: g.boostT > dt ? g.boost : -1,
    boostT: Math.max(g.boostT - dt, 0),
  };
}
/** dt seconds later, the wheel `turns` turns further: the members move on (crew), the tired recover, then the hours of the
 * turns, every running project that much nearer its end, finished runs paid out and their teams tired, and projects with an
 * officer started again as long as their cost and team are there */
export function step(g: Game, dt: number, turns: number): Game {
  const x = fund(crew(g, dt), dt);
  let { h, f, p } = x;
  let tired = x.tired * Math.exp(-dt / rest(x));
  let idle = free({ ...x, tired });
  h += turns * perTurn(x);
  const paid = (d: { h: number; f: number; need: number }): boolean => {
    if (h < d.h || f < d.f || idle < d.need) return false;
    h -= d.h;
    f -= d.f;
    idle -= d.need;
    return true;
  };
  /** a finished run: paid out; its team is free of it and, but for the talk about that, tired */
  const done = (d: ReturnType<typeof runs>): void => {
    f += d.out;
    p += d.ppl;
    if (x.boost === 2) idle += d.need;
    else tired += d.need;
  };
  const proj = x.proj.map((s) => {
    if (!s) return s;
    const d = runs(s, x);
    const len = dur(s, x);
    let t = s.t < 0 ? -1 : s.t + dt;
    while (t >= len) {
      done(d);
      t = s.auto && paid(d) ? t - len : -1;
    }
    if (t < 0 && s.auto && paid(d)) t = 0;
    return t === s.t ? s : { ...s, t };
  });
  return flags({ ...x, h, f, p, tired, proj });
}
/** what happened while the app was closed: the idle wheel and the officers' projects, for at most eight hours (and four more per level of the tree's treasurer).
 * ponytail: five-second steps, in which a tired team recovers once, so very fast projects earn a little less than they would
 * have with the app open; smaller steps if that shows. */
export function away(g: Game, now: number): Game {
  let x = g;
  for (let left = Math.min(Math.max(now - g.at, 0) / 1000, (8 + 4 * g.tree[1]!) * 3600); left > 0; left -= 5) {
    const dt = Math.min(left, 5);
    x = step(x, dt, idle(x) * dt);
  }
  return { ...x, at: now };
}
/** the points a handover would bring now: one from 100 people helped this year, two from 800, three from 2700 ... */
export const pinsFor = (g: Game): number => Math.floor(Math.cbrt(g.p / 100));
/** a new Rotary year of that culture: everything from zero but what KEEP names, the points this year earned on top, the best
 * year and the count of years brought up to date */
export const handover = (g: Game, now: number, culture: number): Game =>
  pinsFor(g)
    ? fresh(now, {
        ...Object.fromEntries(KEEP.map((k) => [k, g[k]])),
        pins: g.pins + pinsFor(g),
        best: Math.max(g.best, g.p),
        yrs: g.yrs + 1,
        cult: culture,
      })
    : g;

/** a cogwheel around 0,0 with n cogs and pitch radius r, as an SVG path */
function cogPath(n: number, r: number): string {
  const pt = (rad: number, a: number) => `${(rad * Math.cos(a)).toFixed(1)},${(rad * Math.sin(a)).toFixed(1)}`;
  const step = (2 * Math.PI) / n;
  let d = "";
  for (let k = 0; k < n; k++) {
    const a = k * step;
    d += `${k ? "L" : "M"}${pt(r - 3.5, a - 0.3 * step)}L${pt(r + 3.5, a - 0.15 * step)}L${pt(r + 3.5, a + 0.15 * step)}L${pt(r - 3.5, a + 0.3 * step)}`;
  }
  return `${d}Z`;
}
/** the stage is 300 units wide; our wheel has 24 cogs on a pitch radius of 66, so every cog of the family is as big as ours */
const R0 = 66;
const pct = (units: number): string => `${units / 3}%`;

/** one family wheel, meshed with ours: placed around it by its number, turned against it by the ratio of the cogs */
function Cog({ i, angle }: { i: number; angle: number }) {
  const { cogs, color, icon } = FAM[i]!;
  const r = (R0 * cogs) / 24;
  const at = (i * 360) / FAM.length - 90;
  const rad = (at * Math.PI) / 180;
  const pos: CSSProperties = {
    left: pct(150 + (R0 + r) * Math.cos(rad)),
    top: pct(150 + (R0 + r) * Math.sin(rad)),
    width: pct(2 * (r + 3.5)),
  };
  const rot = at + 180 + 180 / cogs - ((angle * 360 - at) * 24) / cogs;
  return (
    <>
      <svg
        className="cog"
        viewBox={`${-r - 3.5} ${-r - 3.5} ${2 * r + 7} ${2 * r + 7}`}
        style={{ ...pos, color, rotate: `${rot}deg` }}
      >
        <path d={cogPath(cogs, r)} fill="currentColor" />
        <circle r={r * 0.55} />
      </svg>
      <span className="cog-i" style={pos} aria-hidden="true">
        {icon}
      </span>
    </>
  );
}

interface Sim {
  /** our wheel: turns so far, turns per second */
  a: number;
  w: number;
  held: boolean;
  /** the finger on the wheel: where it was (in turns around the middle) and when, how far it went, how fast */
  drag: { at: number; t: number; moved: number; v: number } | null;
}
/** where the pointer is around the middle of the wheel, in turns */
const around = (ev: PointerEvent<HTMLElement>): number => {
  const b = ev.currentTarget.getBoundingClientRect();
  return Math.atan2(ev.clientY - b.top - b.height / 2, ev.clientX - b.left - b.width / 2) / (2 * Math.PI);
};

/** the saved game brought up to now, and what to say about the time away (nothing under a minute of it) */
function load(): [Game, string] {
  const saved = store.get("rac.clicker", null);
  const was = saved?.v === 5 ? saved : fresh(Date.now());
  const now = away(was, Date.now());
  const got = [now.h - was.h, now.f - was.f, now.p - was.p].map((n, i) =>
    n >= 1 && now.at - was.at > 60_000 ? ` +${fmt(n)} ${ICONS[i]}` : "",
  );
  return [now, got.join("") && TEXT.away + got.join("")];
}
export default function Clicker({ onClose }: { onClose: () => void }) {
  const [[g, note], setState] = useState(load);
  /** the game after f; a banner newly won is said in the note */
  const setG = (f: (g: Game) => Game) =>
    setState(([x, n]) => {
      const y = f(x);
      return [y, y.ban.length > x.ban.length ? `🚩 ${TEXT.bans[y.ban.at(-1)!]}` : n];
    });
  const [tab, setTab] = useState(0);
  /** the slot being designed, if one is */
  const [desk, setDesk] = useState(-1);
  const [angle, setAngle] = useState(0);
  const [bell, setBell] = useState<{ x: number; y: number; until: number } | null>(null);
  /** the bell was rung: the three talks are on offer */
  const [speaker, setSpeaker] = useState(false);
  const sim = useRef<Sim>({ a: 0, w: 0, held: false, drag: null });
  const last = useRef(g);
  last.current = g;
  // ten steps a second while it is open; saved when it closes or the page goes away, not every step (a save re-renders the app)
  useEffect(() => {
    let then = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - then) / 1000;
      then = now;
      const s = sim.current;
      const x = last.current;
      const rest = idle(x);
      // held down (once that is bought) it speeds up; let go, it slows to what the family keeps it at
      if (s.held && x.spin >= 2) s.w = Math.min(SPIN[2][0], s.w + 4 * dt);
      else s.w = rest + (s.w - rest) * Math.exp(-dt / 1.2);
      const turns = s.drag?.moved ? 0 : s.w * dt; // under a finger the finger turns it
      s.a += turns;
      setAngle(s.a);
      setG((y) => step(y, dt, Math.abs(turns)));
      // the bell: about once a minute (more often with Rotex), for nine seconds, somewhere on the wheels
      const roll = (Math.random() * 500) / (1 + x.fam[2]! / 2);
      setBell((b) => {
        if (b) return now > b.until ? null : b;
        return roll < 1 ? { x: 8 + roll * 70, y: 8 + ((roll * 97) % 70), until: now + 9000 } : null;
      });
    }, 100);
    const save = () => store.set("rac.clicker", { ...last.current, at: Date.now() });
    addEventListener("pagehide", save);
    return () => {
      clearInterval(id);
      removeEventListener("pagehide", save);
      save();
    };
  }, []);
  // the wheel under a finger: a tap pushes it, a swipe (once bought) turns it with the finger and lets it run on
  const down = (ev: PointerEvent<HTMLElement>) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    sim.current.held = true;
    sim.current.drag = { at: around(ev), t: ev.timeStamp, moved: 0, v: 0 };
  };
  const move = (ev: PointerEvent<HTMLElement>) => {
    const s = sim.current;
    if (!s.drag || g.spin < 1) return;
    const at = around(ev);
    const d = ((at - s.drag.at + 1.5) % 1) - 0.5; // the short way round
    s.drag.v = d / Math.max((ev.timeStamp - s.drag.t) / 1000, 0.001) / 2 + s.drag.v / 2;
    s.drag = { ...s.drag, at, t: ev.timeStamp, moved: s.drag.moved + Math.abs(d) };
    s.a += d;
    setAngle(s.a);
    setG((x) => step(x, 0, Math.abs(d)));
  };
  const up = () => {
    const s = sim.current;
    const top = SPIN[g.spin]![0];
    if (s.drag && s.drag.moved > 0.02) s.w = Math.max(-top, Math.min(top, s.drag.v));
    else s.w = Math.min(top, Math.max(s.w, 0) + 0.4);
    s.held = false;
    s.drag = null;
  };
  const rank = RANKS.findLastIndex((r) => g.p >= r);
  const next = RANKS[rank + 1];
  return (
    <Popup title={TEXT.title} onClose={onClose} className="ob full clicker">
      <div className="stats">
        {[g.h, g.f, g.p].map((n, i) => (
          <p key={ICONS[i]} className={i === 2 ? "goal" : undefined}>
            <b>{fmt(n)}</b>
            <span>
              {ICONS[i]} {TEXT.stats[i]}
            </span>
          </p>
        ))}
      </div>
      <div className="rank">
        <b>{TEXT.ranks[rank]}</b>
        {next && <progress value={g.p - RANKS[rank]!} max={next - RANKS[rank]!} />}
        {next && <span>{TEXT.ranks[rank + 1]}</span>}
      </div>
      {g.boost >= 0 && (
        <p className="boost">
          🎤 {TEXT.talks[g.boost]} · {Math.ceil(g.boostT)} s
        </p>
      )}
      {note.startsWith("🚩") && <p className="boost">{note}</p>}
      <div className="seg">
        {TEXT.tabs.map((name, i) => (
          <button
            key={name}
            type="button"
            aria-pressed={tab === i}
            onClick={() => {
              setTab(i);
              setState(([x]) => [x, ""]);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === 0 && (
        <>
          <div className="stage" style={{ "--w": Math.min(Math.abs(sim.current.w) / 3, 1) } as CSSProperties}>
            {FAM.map((d, i) => (g.fam[i] ? <Cog key={d.icon} i={i} angle={angle} /> : null))}
            <button
              className="wheel"
              type="button"
              aria-label={TEXT.tap}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onKeyUp={(ev) => (ev.key === " " || ev.key === "Enter") && up()}
            >
              {/* the wheel alone, cut out of the brand mark */}
              <img
                src="rotaract.svg#svgView(viewBox(320,0,149.3,149.6))"
                alt=""
                draggable={false}
                style={{ rotate: `${angle * 360}deg` }}
              />
            </button>
            {bell && (
              <button
                className="bell"
                type="button"
                aria-label={TEXT.bell}
                style={{ left: `${bell.x}%`, top: `${bell.y}%` }}
                onClick={() => {
                  setSpeaker(true);
                  setBell(null);
                }}
              >
                🔔
              </button>
            )}
          </div>
          {speaker ? (
            <div className="talks">
              <p className="note">{TEXT.speaker}</p>
              {TEXT.talks.map((name, k) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setG((x) => talk(x, k));
                    setSpeaker(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <p className="note" aria-live="polite">
              {note || `${TEXT.spin[g.spin]} · ${TEXT.turn.replace("{n}", fmt(perTurn(g)))}`}
            </p>
          )}
          <Shop g={g} act={setG} />
        </>
      )}
      {tab === 1 && desk >= 0 && (
        <Designer
          g={g}
          was={g.proj[desk] ?? null}
          onDone={(plan) => {
            if (plan) setG((x) => design(x, desk, plan, new Date(devFlag("Date") || Date.now()).getMonth()));
            setDesk(-1);
          }}
        />
      )}
      {tab === 1 && desk < 0 && <Slots g={g} act={setG} onDesign={setDesk} />}
      {tab === 2 && <Club g={g} act={setG} />}
      {tab === 3 && <Fund g={g} act={setG} />}
      {tab === 4 && <Year g={g} act={setG} />}
    </Popup>
  );
}
/** the projects: who is free to work, every slot (its project, or the way to the designer), and one more slot to buy */
function Slots({ g, act, onDesign }: { g: Game; act: (f: (g: Game) => Game) => void; onDesign: (i: number) => void }) {
  return (
    <div className="rows">
      <p className="note">
        👥 {Math.max(Math.floor(free(g)), 0)}/{team(g)} · 😴 {Math.ceil(g.tired - 0.05)}
      </p>
      {g.proj.map((pr, i) =>
        pr ? (
          <Project key={i} g={g} pr={pr} i={i} act={act} onDesign={() => onDesign(i)} />
        ) : (
          <button key={i} type="button" className="row empty" aria-disabled="false" onClick={() => onDesign(i)}>
            <i aria-hidden="true">＋</i>
            <b>{TEXT.design}</b>
          </button>
        ),
      )}
      {g.proj.length < SLOT.length && (
        <Row icon="＋" name={TEXT.slot} sub="" price={SLOT[g.proj.length]!} n={0} f={g.f} onBuy={() => act(buySlot)} />
      )}
    </div>
  );
}
/** what francs buy for the wheels: the next way to spin, and the family's wheels (one shows once the one before it is owned) */
function Shop({ g, act }: { g: Game; act: (f: (g: Game) => Game) => void }) {
  const famSeen = (i: number) => i === 0 || g.fam[i - 1]! > 0;
  const buyRow = (key: string, icon: string, name: string, sub: string, price: number, n: number, buy: () => void) => (
    <Row key={key} icon={icon} name={name} sub={sub} price={price} n={n} f={g.f} onBuy={buy} />
  );
  return (
    <div className="rows">
      {g.spin + 1 < SPIN.length &&
        buyRow(
          "spin",
          g.spin ? "✊" : "👆",
          TEXT.spin[g.spin + 1]!,
          `≤ ${SPIN[g.spin + 1]![0]}/s`,
          SPIN[g.spin + 1]![1],
          0,
          () => act(buySpin),
        )}
      {FAM.map((d, i) =>
        famSeen(i)
          ? buyRow(
              d.icon,
              d.icon,
              tx("fam")[d.name]![0],
              `+${fmt(d.gain * 2 ** g.phf[i]!)} ${ICONS[0]}${"🏅".repeat(g.phf[i]!)}`,
              famPrice(g, i),
              g.fam[i]!,
              () => act((x) => buyFam(x, i)),
            )
          : null,
      )}
    </div>
  );
}
/** a thing francs buy: it fills from the left as the francs (f) near its price */
function Row(p: { icon: string; name: string; sub: string; price: number; n: number; f: number; onBuy: () => void }) {
  return (
    <button
      type="button"
      className="row"
      aria-disabled={p.f < p.price}
      style={{ "--p": `${Math.min(p.f / p.price, 1) * 100}%` } as CSSProperties}
      onClick={p.onBuy}
    >
      <i aria-hidden="true">{p.icon}</i>
      <span>
        <b>{p.name}</b>
        <small>{p.sub}</small>
      </span>
      <em>{fmt(p.price)} 💰</em>
      <strong>{p.n || ""}</strong>
    </button>
  );
}
/** the club: its members, what a team is, the RYLA camp, and what each wheel of the family that is there does */
function Club({ g, act }: { g: Game; act: (f: (g: Game) => Game) => void }) {
  return (
    <div className="rows">
      <div className="stats crew">
        {[`${Math.floor(g.mem)}/${room(g)}`, Math.ceil(g.tired - 0.05), g.pro, Math.floor(g.alum)].map((n, i) => (
          <p key={TEXT.crew[i]}>
            <b>{n}</b>
            <span>
              {CREW[i]} {TEXT.crew[i]}
            </span>
          </p>
        ))}
      </div>
      <p>{TEXT.clubHint}</p>
      {g.fam[1]! > 0 && (
        <button className="btn" type="button" aria-disabled={toCamp(g) === g} onClick={() => act(toCamp)}>
          {g.camp ? `⛺ ${g.camp} · ${Math.ceil(g.campT)} s` : TEXT.camp.replace("{n}", `${g.fam[1]}`)}
        </button>
      )}
      {[room(g), g.fam[1]!, g.fam[2]! * 50, rest(g).toFixed(1), Math.round(sponsor(g) * 100)].map((n, i) =>
        g.fam[i] ? (
          <p key={FAM[i]!.icon}>
            {FAM[i]!.icon} <b>{tx("fam")[FAM[i]!.name]![0]}</b> {TEXT.fam[i]!.replace("{n}", `${n}`)}
          </p>
        ) : null,
      )}
      {g.fam[6]! > 0 && (
        <>
          <h3>
            {TEXT.layers[layer(g)]} · {g.clubs.length}/{3 * g.fam[6]!}
          </h3>
          <p>{TEXT.charterHint}</p>
          <Row
            icon="🗺️"
            name={TEXT.charter}
            sub={g.clubs.join(", ")}
            price={charterPrice(g)}
            n={0}
            f={g.clubs.length < 3 * g.fam[6]! ? g.f : 0}
            onBuy={() =>
              act((x) => charter(x, clubNames().find((n) => !x.clubs.includes(n)) ?? `Rotaract ${x.clubs.length + 1}`))
            }
          />
        </>
      )}
      <h3>
        {TEXT.banTitle} · {g.ban.length}/{TEXT.bans.length}
      </h3>
      <p>{TEXT.banHint}</p>
      <div className="wall">
        {TEXT.bans.map((name, i) => (
          <span key={name} className={g.ban.includes(i) ? "won" : undefined}>
            🚩 {name}
          </span>
        ))}
      </div>
    </div>
  );
}
/** the names of the app's real clubs, for the clubs staked on and chartered; none while the data is not in */
const clubNames = (): string[] => (loaded ? Object.values(getData().clubs).map((c) => c.name) : []);
/** the fund: the Foundation (donate, what is on its way back, Paul Harris pins to award) and staking on another club's project */
function Fund({ g, act }: { g: Game; act: (f: (g: Game) => Game) => void }) {
  const names = clubNames();
  const half = Math.floor(g.f / 2);
  const quarter = Math.floor(g.f / 4);
  return (
    <div className="rows">
      <h3>{tx("fam")[6]![0]}</h3>
      <p>{TEXT.giveHint.replace("{n}", `${grantRate(g)}`)}</p>
      <button
        className="btn"
        type="button"
        aria-disabled={half < 1}
        onClick={() => act((x) => donate(x, Math.floor(x.f / 2)))}
      >
        {TEXT.give.replace("{n}", fmt(half))}
      </button>
      {g.grants.map(([amt, t], i) => (
        <p key={i} className="note">
          ⏳ {fmt(amt! * grantRate(g))} 💰 · {Math.ceil(t!)} s
        </p>
      ))}
      {phfFree(g) > 0 && (
        <>
          <p>
            <b>🏅 {TEXT.phf.replace("{n}", `${phfFree(g)}`)}</b> {TEXT.phfHint}
          </p>
          <div className="chips">
            {FAM.map((d, i) =>
              g.fam[i] ? (
                <button key={d.icon} type="button" onClick={() => act((x) => award(x, i))}>
                  {d.icon} {tx("fam")[d.name]![0]}
                </button>
              ) : null,
            )}
          </div>
        </>
      )}
      <h3>{TEXT.stake}</h3>
      <p>{TEXT.stakeHint.replace("{n}", fmt(quarter))}</p>
      {g.stake ? (
        <p className="note">
          {TEXT.staked
            .replace("{club}", g.stake.club)
            .replace("{n}", fmt(g.stake.amt))
            .replace("{s}", `${Math.ceil(g.stake.t)}`)}
        </p>
      ) : (
        ODDS.map(([, back], k) => {
          const club = names[(g.book.length + g.yrs + k) % (names.length || 1)] ?? `Rotaract ${k + 1}`;
          return (
            <button
              key={back}
              type="button"
              className="row odds"
              aria-disabled={quarter < 10}
              onClick={() => {
                const win = Math.random() < chance(g, k);
                act((x) => stake(x, k, club, win));
              }}
            >
              <b>{club}</b>
              <em>
                {Math.round(chance(g, k) * 100)} % · ×{back}
              </em>
            </button>
          );
        })
      )}
      {g.res !== 0 && <p className="note">{(g.res > 0 ? TEXT.won : TEXT.lost).replace("{n}", fmt(Math.abs(g.res)))}</p>}
    </div>
  );
}
/** the year: the handover's points and the tree they buy, the culture for the next year, the handover, and starting over */
function Year({ g, act }: { g: Game; act: (f: (g: Game) => Game) => void }) {
  const [culture, setCulture] = useState(Math.max(g.cult, 0));
  const gain = pinsFor(g);
  return (
    <div className="rows">
      <p className="pins">🎖 {g.pins}</p>
      {TEXT.tree.map(([name, what], i) => (
        <button
          key={name}
          type="button"
          className="row odds"
          aria-disabled={g.tree[i]! >= TREE[i]! || g.pins < treePrice(g, i)}
          onClick={() => act((x) => buyTree(x, i))}
        >
          <span>
            <b>
              {name}
              {g.tree[i] ? ` · ${g.tree[i]}` : ""}
            </b>
            <small>{what}</small>
          </span>
          <em>{g.tree[i]! >= TREE[i]! ? "✓" : `${treePrice(g, i)} 🎖`}</em>
        </button>
      ))}
      <p>{TEXT.overHint}</p>
      <h3>{TEXT.cultTitle}</h3>
      <div className="chips">
        {TEXT.cults.map(([name], i) => (
          <button key={name} type="button" aria-pressed={culture === i} onClick={() => setCulture(i)}>
            {name}
          </button>
        ))}
      </div>
      <p>{TEXT.cults[culture]![1]}</p>
      <button
        className="btn"
        type="button"
        aria-disabled={!gain}
        onClick={() => act((x) => handover(x, Date.now(), culture))}
      >
        {TEXT.over.replace("{n}", `${gain}`)}
      </button>
      <button
        className="skip"
        type="button"
        onClick={() => confirm(TEXT.sure) && act((x) => fresh(Date.now(), { book: x.book }))}
      >
        {TEXT.reset}
      </button>
    </div>
  );
}
const stars = (n: number): string => "★".repeat(n) + "☆".repeat(5 - n);
/** what a run costs and brings, as "10 ⏱️ + 1 👥 → 8 💰" */
function cost(pr: Proj, g: Game): string {
  const d = runs(pr, g);
  const from = [d.h, d.f].map((n, i) => (n ? `${fmt(n)} ${ICONS[i]}` : "")).filter(Boolean);
  return `${from.join(" + ")} + ${d.need} 👥 → ${d.out ? `${fmt(d.out)} ${ICONS[1]}` : `${fmt(d.ppl)} ${ICONS[2]}`}`;
}
/** the project in slot i: its bar, which a tap starts; its stars and review; and under them "faster", its officer and the way
 * back to the designer. With an officer and under a second a run, the bar gives way to a rate. */
function Project(p: { g: Game; pr: Proj; i: number; act: (f: (g: Game) => Game) => void; onDesign: () => void }) {
  const { g, pr, i, act } = p;
  const d = runs(pr, g);
  const len = dur(pr, g);
  const trickle = pr.auto && len < 1;
  const time = len < 10 ? len.toFixed(1) : `${Math.round(len)}`;
  const review = TEXT.reviews[pr.weak + 1]!.replace("{x}", TEXT.budget[pr.want]!);
  return (
    <div className="proj">
      <button
        type="button"
        className={trickle ? "row flow" : "row"}
        aria-disabled={pr.t >= 0 || g.h < d.h || g.f < d.f || free(g) < d.need}
        style={{ "--p": `${(Math.min(Math.max(pr.t, 0) / len, 1) * 100).toFixed(1)}%` } as CSSProperties}
        onClick={() => act((x) => start(x, i))}
      >
        <i aria-hidden="true">{FORMAT[pr.fm]!.icon}</i>
        <span>
          <b>
            {TEXT.formats[pr.fm]} {CAUSE[pr.c]![0]} {AUD[pr.a]![0]}
          </b>
          <small>{cost(pr, g)}</small>
        </span>
        <em>{trickle ? `${fmt((d.out || d.ppl) / len)}/s` : `${time} s`}</em>
        <strong>{pr.lv || ""}</strong>
      </button>
      <p>
        <span>{stars(pr.st)}</span> {review}
      </p>
      <button type="button" aria-disabled={g.f < lvPrice(pr)} onClick={() => act((x) => faster(x, i))}>
        {TEXT.faster} · {fmt(lvPrice(pr))} 💰
      </button>
      <button
        type="button"
        aria-pressed={pr.auto}
        aria-disabled={!pr.auto && g.f < autoPrice(pr)}
        onClick={() => act((x) => officer(x, i))}
      >
        {TEXT.auto}
        {pr.auto ? " ✓" : ` · ${fmt(autoPrice(pr))} 💰`}
      </button>
      <button type="button" onClick={p.onDesign}>
        {TEXT.redesign}
      </button>
    </div>
  );
}
/** the designer: the four picks, the ten budget points on three sliders, and below the recipe book (what was tried, newest
 * first; a tap takes a recipe over). onDone gets the plan to run, or null for "back". was: the project the slot holds now. */
function Designer({ g, was, onDone }: { g: Game; was: Proj | null; onDone: (plan: Plan | null) => void }) {
  const [plan, setPlan] = useState<Plan>(() =>
    was ? { c: was.c, fm: was.fm, a: was.a, z: was.z, b: was.b } : { c: 0, fm: 0, a: 0, z: 0, b: [4, 3, 3] },
  );
  const left = 10 - sum(plan.b);
  const fee = SIZE[plan.z]!.fee;
  const picks: [keyof Plan & ("c" | "fm" | "a" | "z"), readonly string[], (i: number) => string][] = [
    ["c", TEXT.causes, (i) => CAUSE[i]![0]],
    ["fm", TEXT.formats, (i) => `${FORMAT[i]!.icon}${FORMAT[i]!.serve ? ICONS[2] : ICONS[1]}`],
    ["a", TEXT.auds, (i) => AUD[i]![0]],
    ["z", TEXT.sizes, (i) => `${NEED[i]} 👥${SIZE[i]!.fee ? ` ${fmt(SIZE[i]!.fee)} 💰` : ""}`],
  ];
  return (
    <div className="design">
      {picks.map(([k, names, icon], n) => (
        <div key={k}>
          <h3>{TEXT.pick[n]}</h3>
          <div className="chips">
            {names.map((name, i) => (
              <button
                key={name}
                type="button"
                aria-pressed={plan[k] === i}
                onClick={() => setPlan({ ...plan, [k]: i })}
              >
                {icon(i)} {name}
              </button>
            ))}
          </div>
        </div>
      ))}
      <h3>
        {TEXT.pick[4]} · {TEXT.left.replace("{n}", `${left}`)}
      </h3>
      {TEXT.budget.map((name, i) => (
        <label key={name}>
          <span>{name}</span>
          <input
            type="range"
            min={0}
            max={10}
            value={plan.b[i]}
            onChange={(ev) =>
              setPlan({ ...plan, b: plan.b.map((n, j) => (j === i ? Math.min(+ev.target.value, n + left) : n)) })
            }
          />
          <b>{plan.b[i]}</b>
        </label>
      ))}
      <div className="nav">
        <button className="skip" type="button" onClick={() => onDone(null)}>
          {TEXT.back}
        </button>
        <button
          className="btn"
          type="button"
          aria-disabled={left !== 0 || g.f < fee}
          onClick={() => left === 0 && g.f >= fee && onDone(plan)}
        >
          {TEXT.go}
          {fee ? ` · ${fmt(fee)} 💰` : ""}
        </button>
      </div>
      {g.book.length > 0 && <h3>{TEXT.book}</h3>}
      {g.book.map((r) => {
        const [c, fm, a, z, v, fd, pb, st] = r.split(".").map(Number) as [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ];
        return (
          <button key={r} type="button" className="recipe" onClick={() => setPlan({ c, fm, a, z, b: [v, fd, pb] })}>
            <span>
              {FORMAT[fm]!.icon} {CAUSE[c]![0]} {AUD[a]![0]} · {v}/{fd}/{pb}
            </span>
            <span>{stars(st)}</span>
          </button>
        );
      })}
    </div>
  );
}
