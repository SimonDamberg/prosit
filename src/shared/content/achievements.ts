// Copy for the achievement pop-ups on the TV. Keys match AchievementKey in
// src/shared/game/achievements.ts.
import type { AchievementKey } from '../game/achievements'

interface AchievementCopy {
  title: string
  line: (name: string) => string
}

export const ACHIEVEMENTS: Record<AchievementKey, AchievementCopy> = {
  anstich: { title: 'Det är anslaget!', line: (n) => `${n} slog an kvällens första Maß.` },
  liter1: { title: 'En liter', line: (n) => `${n} har passerat första litern. Uppvärmningen är avklarad.` },
  liter2: { title: 'Två liter', line: (n) => `${n} har två liter i protokollet. Bryggaren skickar ett tackkort.` },
  liter3: { title: 'Tre liter', line: (n) => `${n} når tre liter. Klubben reser sig, de som kan.` },
  liter5: { title: 'Fem liter', line: (n) => `${n} har fem liter. Herr Präsident är rörd och lätt oroad.` },
  hattrick: { title: 'Hattrick', line: (n) => `${n}: tre ädla drycker på tjugo minuter. Tempo! Ordnung kommer senare.` },
  schnaps3: { title: 'Schnaps-Trio', line: (n) => `${n} har tre Schnaps bakom västen. Västen håller, än så länge.` },
  wasser: { title: 'Moderniteten har nått klubben', line: (n) => `${n} beställde kvällens första Wasser. Styrelsen sammanträder.` },
  strafe3: { title: 'Återfallsförbrytaren', line: (n) => `${n} har tre Strafen. Mönstret är tydligt, ångern är det inte.` },
  strafe5: { title: 'Vaneförbrytaren', line: (n) => `${n} har fem Strafen. Ett fall för stadgarna.` },
  prosit3: { title: 'Snabbaste Prost', line: (n) => `${n} var först i skålen tre gånger. Glaset har vuxit fast i handen.` },
  duell2: { title: 'Revolvermannen', line: (n) => `${n} har vunnit två dueller. Ingen vågar blinka.` },
  orator: { title: 'Guldtungan', line: (n) => `${n} höll ett tal värt minst 4,5 Maß.` },
  besinnung: {
    title: 'En stunds eftertanke',
    line: (n) => `${n} drack ett Wasser efter tre Maß. Styrelsen protesterar, läkaren applåderar.`,
  },
  volltreffer: { title: 'Fullträff', line: (n) => `${n} gissade exakt rätt. Misstänkt. Telefonen ska undersökas.` },
}

export const ACHIEVEMENT_KICKER = 'Utmärkelse'
