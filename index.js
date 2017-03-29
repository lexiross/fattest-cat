#!/usr/bin/env node

const _       = require("lodash");
const request = require("request-promise");
const opener  = require("opener");
const Promise = require("bluebird");
const cheerio = require("cheerio");

require("colors");

const HELP = (process.argv.includes("-h") || process.argv.includes("--help"));
const METRIC = process.argv.includes("--metric");
const GRAMS_PER_OZ = 28.3495;
const SFSPCA_BASE = "https://www.sfspca.org"
const ADOPTION_PAGE = `${SFSPCA_BASE}/adoptions/cats`;

if(HELP){
  console.log("Some cats are born fat, some achieve fatness, others have fatness thrust");
  console.log("upon them. You can find all of them at the San Francisco SPCA using this");
  console.log("tool...");
  console.log("");
  console.log("Standard Usage:");
  console.log("$ fattest-cat");
  console.log("Metric Units:");
  console.log("$ fattest-cat --metric");
  return;
}

const fetchCatsHelper = Promise.method((pageNumber, catsSoFar) => {
  const url = pageNumber === 0 ? ADOPTION_PAGE : `${ADOPTION_PAGE}?page=${pageNumber}`
  return request.get(url)
    .then((adoptionsPage) => {
      const cats = cheerio(adoptionsPage)
        .find("a")
        .filter((i, tag) => tag.attribs.href && tag.attribs.href.match(/adoptions\/pet-details\/\d+/))
        .map((i, tag) => `${SFSPCA_BASE}${tag.attribs.href}`)
        .toArray();
      if (!cats || cats.length === 0) {
        return catsSoFar;
      } else {
        return fetchCatsHelper(pageNumber + 1, catsSoFar.concat(cats));
      }
    })
    .catch((err) => {
      console.log("Error fetching cats:", err);
      return catsSoFar;
    });
});

console.log("Accessing San Francisco SPCA (Cat Department)...");
fetchCatsHelper(0, [])
  .then(_.uniq) // NO DOUBLE CATS
  .tap((cats) => console.log(`Cat information system accessed. ${cats.length} cats found. Beginning weighing process...`))
  .map((url) => {
    return request.get(url)
      // SPCA sometimes returns 403s for some cats, ignore this.
      .catch((err) => err)
      .then((catPage) => {
        const $ = cheerio.load(catPage);
        const name = $(".field-name-title h1").text();
        const weightText = $(".field-name-field-animal-weight .field-item").text();
        const lbs = Number(/(\d+)lbs\./.exec(weightText)[1]);
        const oz = /(\d+)oz\./.test(weightText) ? Number(/(\d+)oz\./.exec(weightText)[1]) : 0;
        const weight = 16 * lbs + oz;
        const isFemale = $(".field-name-field-gender .field-item").text().trim() === "Female";

        console.log("Weighing cat: %s", name.green);
        return {name, lbs, oz, weight, isFemale, url}
      })
      // Null for cats that cannot be parsed.
      .catch(() => {});
  })
  // Filter out unparsable cats.
  .then(_.compact)
  .then((cats) => {
    if (cats.length === 0) {
      console.log("No cats found. It is a sad day.".red.bold);
      return;
    }

    const highestWeight = _(cats).map("weight").max();
    const fattestCats = _.filter(cats, {weight: highestWeight});
    const names = _.map(fattestCats, "name");
    const tie = fattestCats.length > 1;

    const introText = (tie ? "The fattest cats are" : "The fattest cat is").yellow.bold;
    const nameText = (tie ? `${names.slice(0, -1).join(", ")} and ${_.last(names)}` : names[0]).green.underline.bold;
    const descriptionText = (tie ? "They each weigh" : (fattestCats[0].isFemale ? "She weighs" : "He weighs")).yellow.bold;
    const weightText = METRIC ?
      (`${Math.round(GRAMS_PER_OZ * highestWeight)} grams`).yellow.bold :
      (`${fattestCats[0].lbs} lbs and ${fattestCats[0].oz} oz.`).yellow.bold;
    const openText = (tie ? "Opening cat profiles..." : "Opening cat profile...").yellow.bold;

    console.log(`${introText} ${nameText}. ${descriptionText} ${weightText}. ${openText}`);
    setTimeout(() => _(fattestCats).map("url").each((url) => opener(url)), 3000);
  });
