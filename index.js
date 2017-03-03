#!/usr/bin/env node

const request         = require("request-promise");
const opener          = require("opener");
const Promise         = require("bluebird");
const cheerio         = require("cheerio");
const {uniq, compact} = require("lodash");
const colors          = require("colors");

const SFSPCA_BASE = "https://www.sfspca.org"
const ADOPTION_PAGE = `${SFSPCA_BASE}/adoptions/cats`;

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
const fetchCats = () => fetchCatsHelper(0, []);

console.log("Accessing San Francisco SPCA (Cat Department)...");

colors.setTheme({
  output: ["yellow", "bold"],
});

fetchCats()
  .then(uniq) // NO DOUBLE CATS
  .tap((cats) => console.log(`Cat information system accessed. ${cats.length} cats found. Beginning weighing process...`))
  .map((url) => {
    return request.get(url)
      // SPCA sometimes returns 403s for some cats, ignore this.
      .catch((err) => err)
      .then((catPage) => {
        const $ = cheerio.load(catPage);
        const name = $(".field-name-title h1").text();
        const weight = $(".field-name-field-animal-weight .field-item").text();
        const lbs = Number(/(\d+)lbs\./.exec(weight)[1]);
        const oz = /(\d+)oz\./.test(weight) ? Number(/(\d+)oz\./.exec(weight)[1]) : 0;
        const isFemale = $(".field-name-field-gender .field-item").text().trim() === "Female";

        console.log("Weighing cat: %s", colors.green(name));
        return {name, lbs, oz, isFemale, url}
      })
      // Null for cats that cannot be parsed.
      .catch(() => {});
  })
  // Filter out unparsable cats.
  .then(compact)
  .then((cats) => {
    let fattestCat = {lbs: 0, oz: 0};
    cats.forEach((cat) => {
      if (cat.lbs > fattestCat.lbs || (cat.lbs === fattestCat.lbs && cat.oz > fattestCat.oz)) {
        fattestCat = cat;
      }
    });
    console.log(`The fattest cat is ${colors.green.underline(fattestCat.name)}. ${(fattestCat.isFemale ? "She" : "He")} weighs ${fattestCat.lbs} lbs and ${fattestCat.oz} oz.`.output);
    setTimeout(() => console.log("Opening cat profile..."), 2000);
    setTimeout(() => opener(fattestCat.url), 4000);
  });
