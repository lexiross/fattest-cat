#!/usr/bin/env node

const _           = require("lodash");
const converter   = require("number-to-words");
const opener      = require("opener");
const {fetchCats} = require("./fetch_cats.js");
require("colors");

const GARFIELD = (process.argv.includes("--garfield") || process.argv.includes("--garfield-mode"));
const METRIC = process.argv.includes("--metric");
const GRAMS_PER_OZ = 28.3495;
let nIndex = process.argv.indexOf("--n");
const FATNO = nIndex > 0 ? parseInt(process.argv[nIndex + 1]) - 1 : 0;

if (GARFIELD) {
  if (new Date().getDay() == 1) {
    console.log("I hate Mondays");
    return;
  }
}

console.log("Accessing San Francisco SPCA (Cat Department)...");

fetchCats({verbose: true})
  .then((cats) => {
    if (cats.length === 0) {
      console.log("No cats found. It is a sad day.".red.bold);
      return;
    }

    if(FATNO > cats.length) {
      FATNO = 0;
    }

    const weight = _(cats).map((cat) => cat.weight).sortBy().sortedUniq().reverse().get(FATNO);
    const fattestCats = _.filter(cats, {weight: weight});
    const names = _.map(fattestCats, "name");
    const tie = fattestCats.length > 1;

    const fattestText = (FATNO > 0 ? `The ${converter.toWordsOrdinal(FATNO + 1)} fattest` : "The fattest");
    const introText = (tie ? `${fattestText} cats are` : `${fattestText} cat is`).yellow.bold;
    const nameText = (tie ? `${names.slice(0, -1).join(", ")} and ${_.last(names)}` : names[0]).green.underline.bold;
    const descriptionText = (tie ? "They each weigh" : (fattestCats[0].isFemale ? "She weighs" : "He weighs")).yellow.bold;
    const weightText = METRIC ?
      (`${Math.round(GRAMS_PER_OZ * highestWeight)} grams`).yellow.bold :
      (`${fattestCats[0].lbs} lbs and ${fattestCats[0].oz} oz.`).yellow.bold;
    const openText = (tie ? "Opening cat profiles..." : "Opening cat profile...").yellow.bold;

    console.log(`${introText} ${nameText}. ${descriptionText} ${weightText}. ${openText}`);
    setTimeout(() => _(fattestCats).map("url").each((url) => opener(url)), 3000);
  });
