
const _       = require("lodash");
const request = require("request-promise");
const Promise = require("bluebird");
const cheerio = require("cheerio");

require("colors");

const SFSPCA_BASE = "https://www.sfspca.org"
const ADOPTION_PAGE = `${SFSPCA_BASE}/adoptions/cats`;

const fetchCatsHelper = Promise.method((pageNumber, catsSoFar, log) => {
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
        return fetchCatsHelper(pageNumber + 1, catsSoFar.concat(cats), log);
      }
    })
    .catch((err) => {
      log("Error fetching cats:", err);
      return catsSoFar;
    });
});

module.exports = {

  fetchCats (options) {
    if (!options) {
      options = {verbose: false};
    }
    const log = options.verbose ? console.log : () => {};
    return fetchCatsHelper(0, [], log)
      .then(_.uniq) // NO DOUBLE CATS
      .tap((cats) => log(`Cat information system accessed. ${cats.length} cats found. Beginning weighing process...`))
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

            log("Weighing cat: %s", name.green);
            return {name, lbs, oz, weight, isFemale, url}
          })
          // Null for cats that cannot be parsed.
          .catch(() => {});
      })
      // Filter out unparsable cats.
      .then(_.compact);
  },
}
