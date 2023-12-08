import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import events from "node:events";
import { fileURLToPath } from "node:url";

const cardRanks = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
] as const;

const rankTexts = [
  "five-of-a-kind",
  "four-of-a-kind",
  "full-house",
  "three-of-a-kind",
  "two-pair",
  "one-pair",
  "high-card",
] as const;

type RankTypes = (typeof rankTexts)[number];

type RankChecker = (hand: TCard[]) => boolean;

function getCardCounts(cards: TCard[]): Map<TCard, number> {
  let seenCardsMap: Map<TCard, number> = new Map();

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const currentCardCount = seenCardsMap.get(card);
    if (currentCardCount) {
      seenCardsMap.set(card, currentCardCount + 1);
    } else {
      seenCardsMap.set(card, 1);
    }
  }

  return seenCardsMap;
}

function getHighestDuplicates(cards: TCard[]): { card: TCard; count: number } {
  const seenCardsMap = getCardCounts(cards);
  let largest: { card: TCard | null; count: number } = { card: null, count: 0 };

  for (let [card, count] of seenCardsMap.entries()) {
    if (!largest?.card || largest.count < count) {
      largest = {
        card,
        count,
      };
    }
  }
  if (largest.card === null) {
    throw new Error("no cards");
  }
  return {
    card: largest.card,
    count: largest.count,
  };
}

// far too much loopin should use a switch probably
const handRanks: RankChecker[] = [
  function fiveOfAKind(cards) {
    const firstCard = cards[0];
    return cards.every((card) => card === firstCard);
  },
  function fourOfAKind(cards) {
    return getHighestDuplicates(cards).count === 4;
  },
  function fullHouse(cards) {
    const seenCardsMap = getCardCounts(cards);
    let has3 = false;
    let hasPair = false;
    for (let [, number] of seenCardsMap.entries()) {
      if (number === 3) {
        has3 = true;
      } else if (number === 2) {
        hasPair = true;
      }
      if (has3 && hasPair) {
        break;
      }
    }

    return has3 && hasPair;
  },
  function threeOfAKind(cards) {
    return getHighestDuplicates(cards).count === 3;
  },
  function twoPair(cards) {
    const cardCounts = getCardCounts(cards);
    const pairs = [...cardCounts.values()].filter((count) => count === 2);
    if (pairs.length === 2) {
      return true;
    }

    return false;
  },
  function onePair(cards) {
    const cardCounts = getCardCounts(cards);
    const pairs = [...cardCounts.values()].filter((count) => count === 2);
    if (pairs.length === 1) {
      return true;
    }
    return false;
  },
  function highCard() {
    return true;
  },
];

function getRankIndex(cards: TCard[]): number {
  let rankIdx = -1;
  for (let i = 0; i < handRanks.length; i++) {
    const rankFn = handRanks[i];
    if (rankFn(cards)) {
      rankIdx = i;
      break;
    }
  }
  if (rankIdx < 0) {
    throw new Error("Found no matching rank");
  }

  return rankIdx;
}

function getRankValue(rankIdx: number) {
  return handRanks.length - rankIdx;
}

type TCard = (typeof cardRanks)[number];
interface Hand {
  cards: TCard[];
  bet: number;
  rank: number;
  rankText: string;
}

const dirname = () => path.dirname(fileURLToPath(import.meta.url));

let logDebug = false;
function debug(...args: unknown[]) {
  if (logDebug) {
    console.debug("[DEBUG]", ...args);
  }
}

function parseNumber(roundNumber: string) {
  const num = parseInt(roundNumber);
  if (isNaN(num)) {
    throw new Error(`Invalid number ${roundNumber}`);
  }
  return num;
}

const handRanksMap: Map<number, Hand[]> = new Map();

async function processLines(fileName: string, onLine: (line: string) => void) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dirname(), fileName)),
  });

  rl.on("line", onLine);

  await events.once(rl, "close");
}
let numberSum = 0;
try {
  await processLines("./input.txt", (line) => {
    const hand = parseHand(line);
    const sameRanks = handRanksMap.get(hand.rank);
    if (!sameRanks) {
      handRanksMap.set(hand.rank, [hand]);
    } else {
      sameRanks.push(hand);
      // meh probs bad
      sameRanks.sort((a, b) => {
        for (let i = 0; i < a.cards.length; i++) {
          const aCard = cardRanks.indexOf(a.cards[i]);
          const bCard = cardRanks.indexOf(b.cards[i]);
          if (aCard < bCard) {
            return -1;
          } else if (aCard > bCard) {
            return 1;
          }
        }
        return 0;
      });
    }
  });

  let rankNumber = 0;
  // oof
  const mapAsc = new Map([...handRanksMap.entries()].sort());

  console.log(handRanksMap);
  for (let [, hands] of mapAsc) {
    for (let hand of hands) {
      rankNumber++;
      console.log(
        `Rank of ${hand.cards} with bet ${hand.bet} is ${rankNumber}`
      );
      numberSum = numberSum + hand.bet * rankNumber;
    }
  }
  console.log("The sum total is", numberSum);
} catch (e) {
  console.error("FATAL ERROR: ", e);
}

function parseHand(line: string): Hand {
  const lineParts = line.split(" ");
  if (lineParts.length !== 2) {
    throw new Error(`invalid hand: ${line}`);
  }

  const [cardStr, betStr] = lineParts;

  const cards = cardStr.split("").map((card) => {
    if (!cardRanks.includes(card as TCard)) {
      throw new Error(`Invalid card: ${card}`);
    }
    return card as TCard;
  });

  const rankIdx = getRankIndex(cards);

  return {
    bet: parseNumber(betStr),
    cards,
    rank: getRankValue(rankIdx),
    rankText: rankTexts[rankIdx],
  };
}
