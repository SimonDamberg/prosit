// The Abstimmung pool. The club votes on a member; the winner holds `title` on the TV until the
// next vote.

export interface Vote {
  question: string;
  title: string;
}

export const VOTES: readonly Vote[] = [
  {
    question: "Vem i klubben skulle i smyg beställa en alkoholfri?",
    title: "Klubbens Nykterist",
  },
  {
    question: "Vem i klubben somnar först i kväll?",
    title: "Klubbens Schlafmütze",
  },
  {
    question: "Vem i klubben skulle anlända till ett möte på elsparkcykel?",
    title: "Klubbens Rollerfahrer",
  },
  {
    question: "Vem i klubben skulle klara sig sämst utan sin telefon?",
    title: "Klubbens Modernist",
  },
  {
    question: "Vem i klubben skulle skriva en insändare om ungdomen av i dag?",
    title: "Klubbens Leserbriefschreiber",
  },
  {
    question: "Vem i klubben spiller mest öl per kväll?",
    title: "Klubbens Bierverschütter",
  },
  {
    question: "Vem i klubben sjunger högst och falskast?",
    title: "Klubbens Kammersänger",
  },
  {
    question: "Vem i klubben borde aldrig mer få ansvara för kassan?",
    title: "Klubbens Schatzmeister a.D.",
  },
  {
    question: "Vem i klubben kommer alltid för sent?",
    title: "Klubbens Spätankömmling",
  },
  {
    question: "Vem i klubben skulle bära Lederhosen till vardags?",
    title: "Klubbens Lederhosenträger",
  },
  {
    question: "Vem i klubben skulle fuska i den här omröstningen?",
    title: "Klubbens Wahlfälscher",
  },
  {
    question: "Vem i klubben går hem först?",
    title: "Klubbens Frühaufbrecher",
  },
  {
    question: "Vem i klubben har kvällens mest tvivelaktiga klädsel?",
    title: "Klubbens Modeopfer",
  },
  {
    question: "Vem i klubben blir mest högljudd efter två sejdlar?",
    title: "Klubbens Lautsprecher",
  },
  {
    question: "Vem i klubben skulle beställa in en sallad?",
    title: "Klubbens Salatesser",
  },
  {
    question: "Vem i klubben har störst respekt för stadgarna?",
    title: "Klubbens Paragraphenreiter",
  },
  {
    question: "Vem i klubben skulle gå vilse på väg till toaletten?",
    title: "Klubbens Pfadfinder",
  },
  {
    question: "Vem i klubben har kvällens ståtligaste hållning?",
    title: "Klubbens Ehrenmann",
  },
  {
    question: "Vem i klubben tål minst Schnaps?",
    title: "Klubbens Leichtgewicht",
  },
  {
    question: "Vem i klubben mår sämst i morgon?",
    title: "Klubbens Katerkönig",
  },
  {
    question:
      "Vem i klubben skulle begära ordet för att rätta ett kommatecken i stadgarna?",
    title: "Klubbens Erbsenzähler",
  },
  {
    question: "Vem i klubben bär kvällens präktigaste mustasch av skum?",
    title: "Klubbens Schaumbart",
  },
  {
    question: "Vem i klubben utbringar flest skålar utan anledning?",
    title: "Klubbens Prositmeister",
  },
  // Member themes, from the running jokes in Rally75 (natcasino kuskar.ts). Simon may veto.
  {
    question: "Vem i klubben skyller ett spillt glas på lagg?",
    title: "Klubbens Lagopfer",
  },
  {
    question: "Vem i klubben anser att inget har blivit bättre sedan 1918?",
    title: "Klubbens Nostalgiker",
  },
  {
    question: "Vem i klubben gör vad som helst för en fördel i nästa Duell?",
    title: "Klubbens Vorteilsjäger",
  },
  {
    question: "Vem i klubben har en bekant på departementet som ordnar saken?",
    title: "Klubbens Lobbyist",
  },
  {
    question: "Vem i klubben skulle beställa en Radler och kalla det öl?",
    title: "Klubbens Radlerfahrer",
  },
];
