// The Schätzfrage pool. Every answer is a plain number; closest wins, furthest gets a Strafe.
// `unit` is empty when the question asks for a year.

export interface Question {
  question: string;
  answer: number;
  unit: string;
}

export const QUESTIONS: readonly Question[] = [
  {
    question: "Vilket år utfärdades den bayerska renhetslagen?",
    answer: 1516,
    unit: "",
  },
  {
    question: "Hur många ingredienser tillät renhetslagen i ölet?",
    answer: 3,
    unit: "ingredienser",
  },
  {
    question: "Vilket år hölls den första Oktoberfest i München?",
    answer: 1810,
    unit: "",
  },
  {
    question:
      "Vilket år grundade hertig Wilhelm V bryggeriet Hofbräuhaus i München?",
    answer: 1589,
    unit: "",
  },
  {
    question: "Vilket år anger bryggeriet Weihenstephan som sitt grundningsår?",
    answer: 1040,
    unit: "",
  },
  {
    question: "Hur många förbundsländer har Tyskland?",
    answer: 16,
    unit: "förbundsländer",
  },
  {
    question: "Vilket år lades grundstenen till slottet Neuschwanstein?",
    answer: 1869,
    unit: "",
  },
  {
    question: "Hur många hela meter höga är tornen på domen i Köln?",
    answer: 157,
    unit: "meter",
  },
  {
    question:
      "Hur många centiliter rymmer det klassiska Kölschglaset, en Stange?",
    answer: 20,
    unit: "cl",
  },
  {
    question: "Vilket år vann Västtyskland sitt första VM-guld i fotboll?",
    answer: 1954,
    unit: "",
  },
  {
    question: "Hur många VM-guld har Tysklands herrar i fotboll?",
    answer: 4,
    unit: "guld",
  },
  {
    question: "Hur många symfonier fullbordade Beethoven?",
    answer: 9,
    unit: "symfonier",
  },
  {
    question: "Vilket år föddes Johann Sebastian Bach?",
    answer: 1685,
    unit: "",
  },
  {
    question: "Vilket år folkomröstade Sverige om rusdrycksförbud?",
    answer: 1922,
    unit: "",
  },
  {
    question:
      "Vilket år försvann mellanölet ur de svenska livsmedelsbutikerna?",
    answer: 1977,
    unit: "",
  },
  {
    question:
      "Vilket år gick Sverige över till högertrafik, mot bättre vetande?",
    answer: 1967,
    unit: "",
  },
  { question: "Vilket år blev Carl XVI Gustaf kung?", answer: 1973, unit: "" },
  {
    question: "Hur många ledamöter har Sveriges riksdag?",
    answer: 349,
    unit: "ledamöter",
  },
  { question: "Vilket år gick Sverige med i EU?", answer: 1995, unit: "" },
  {
    question: "Vilket år blev nationaldagen helgdag i Sverige?",
    answer: 2005,
    unit: "",
  },
  {
    question:
      "Vilket år rullade de första hyrda elsparkcyklarna ut i Stockholm?",
    answer: 2018,
    unit: "",
  },
  {
    question:
      "Vilket år började Sverige sända färg-TV, och svartvitt blev omodernt?",
    answer: 1970,
    unit: "",
  },
  {
    question:
      "Vilket år införde Sverige sommartid, och rubbade naturens ordning för gott?",
    answer: 1980,
    unit: "",
  },
];
