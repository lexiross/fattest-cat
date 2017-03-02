#!/usr/bin/env node

const request         = require("request-promise");
const opener          = require("opener");
const Promise         = require("bluebird");
const cheerio         = require("cheerio");
const {uniq, compact, sortBy} = require("lodash");

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

function urlToCat (url) {
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

      console.log("Weighing cat:", name);
      return {name, lbs, oz, isFemale, url, weight: (lbs * 16) + oz}
    })
    // Null for cats that cannot be parsed.
    .catch(() => {});
}


if (module.parent == null) {
  fetchCats()
    .then(uniq) // NO DOUBLE CATS
    .tap((cats) => console.log(`Cat information system accessed. ${cats.length} cats found. Beginning weighing process...`))
    .map(urlToCat)
    // Filter out unparsable cats.
    .then(compact)
    .then((cats) => {
      const fattestCat = sortBy(cats, "weight")[cats.length - 1];
      console.log(`The fattest cat is ${fattestCat.name}. ${(fattestCat.isFemale ? "She" : "He")} weighs ${fattestCat.lbs} lbs and ${fattestCat.oz} oz.`);
      setTimeout(() => console.log("Opening cat profile..."), 2000);
      setTimeout(() => opener(fattestCat.url), 4000);
    });
}

module.exports = {
  fetchCats,
  urlToCat,
}
