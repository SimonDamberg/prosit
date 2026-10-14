// Copy for the achievement pop-ups on the TV. Keys match AchievementKey in
// src/shared/game/achievements.ts.
import type { AchievementKey } from '../game/achievements'

interface AchievementCopy {
  title: string
  line: (name: string) => string
}

export const ACHIEVEMENTS: Record<AchievementKey, AchievementCopy> = {
  anstich: { title: "O'zapft is!", line: (n) => `${n} slog an kvällens första Maß.` },
  liter1: { title: 'Ein Liter', line: (n) => `${n} har passerat första litern. En god början.` },
  liter2: { title: 'Zwei Liter', line: (n) => `${n} har två liter i protokollet. Respekt.` },
  liter3: { title: 'Drei Liter', line: (n) => `${n} når tre liter. Klubben reser sig.` },
  liter5: { title: 'Fünf Liter', line: (n) => `${n} har fem liter. Herr Präsident är rörd och lätt oroad.` },
  hattrick: { title: 'Hattrick', line: (n) => `${n}: tre ädla drycker på tjugo minuter. Tempo!` },
  schnaps3: { title: 'Schnaps-Trio', line: (n) => `${n} har tre Schnaps bakom västen.` },
  wasser: { title: 'Moderniteten har nått klubben', line: (n) => `${n} beställde kvällens första Wasser. Styrelsen sammanträder.` },
  strafe3: { title: 'Wiederholungstäter', line: (n) => `${n} har tre Strafen. Mönstret är tydligt.` },
  strafe5: { title: 'Gewohnheitsverbrecher', line: (n) => `${n} har fem Strafen. Ett fall för stadgarna.` },
  prosit3: { title: 'Schnellster Prost', line: (n) => `${n} var först i skålen tre gånger.` },
  duell2: { title: 'Revolverheld', line: (n) => `${n} har vunnit två dueller. Ingen vågar blinka.` },
  orator: { title: 'Goldene Zunge', line: (n) => `${n} höll ett tal värt minst 4,5 Maß.` },
  volltreffer: { title: 'Volltreffer', line: (n) => `${n} gissade exakt rätt. Misstänkt.` },
}

export const ACHIEVEMENT_KICKER = 'Utmärkelse'
