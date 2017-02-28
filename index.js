const Promise = require("bluebird");
const request = require("request-promise");
const cheerio = require("cheerio");
const exec    = require("child_process").execSync;

const {flatten, uniq, compact} = require("lodash");

const SFSPCA_BASE = "https://www.sfspca.org"
const ADOPTION_PAGE = `${SFSPCA_BASE}/adoptions/cats`;

console.log("Accessing San Francisco SPCA (Cat Department)...");

// Assume no more than 3 pages of cats
Promise.map([ADOPTION_PAGE, `${ADOPTION_PAGE}?page=1`, `${ADOPTION_PAGE}?page=2`], request.get)
  .tap(() => console.log("Cat information system accessed. Beginning weighing process..."))
  .map((adoptionsPage) => {
    return cheerio(adoptionsPage)
      .find("a")
      .filter((i, tag) => tag.attribs.href && tag.attribs.href.match(/adoptions\/pet-details\/\d+/))
      .map((i, tag) => `${SFSPCA_BASE}/${tag.attribs.href}`)
      .toArray();
  })
  // Flat cats before fat cats
  .then(flatten)
  // NO DOUBLE CATS
  .then(uniq)
  .map((url) => {
    return request.get(url)
      // SPCA sometimes returns 403s for some cats, ignore this.
      .catch((err) => err)
      .then((catPage) => {
        const name = /\<h1\>([a-zA-Z]+)\<\/h1\>/.exec(catPage)[1];
        const lbs = Number(/(\d+)lbs\./.exec(catPage)[1]);
        const oz = Number(/(\d+)oz\./.exec(catPage)[1]);
        const isFemale = /Female/.test(catPage);

        console.log("Weighing cat:", name);
        return {name, lbs, oz, isFemale, url}
      })
      // Null for cats that cannot be parsed.
      .catch(() => null);
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
    console.log(`The fattest cat is ${fattestCat.name}. ${(fattestCat.isFemale ? "She" : "He")} weighs ${fattestCat.lbs} lbs and ${fattestCat.oz} oz.`);
    setTimeout(() => console.log("Opening cat profile..."), 2000);
    setTimeout(() => exec(`open ${fattestCat.url}`), 4000);
  });
