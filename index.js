const opener = require("opener");
const request = require("request-promise");

const SFSPCA_BASE = "https://www.sfspca.org"
const ADOPTION_PAGE = `${SFSPCA_BASE}/adoptions/cats`;
const CAT_URL_REGEX = /adoptions\/pet-details\/\d+/g;

console.log("Accessing San Francisco SPCA (Cat Department)...");
request.get(ADOPTION_PAGE)
  .then((adoptionsPage) => {
    console.log("Cat information system accessed. Beginning weighing process...");
    const urls = [];
    let match;
    while (match = CAT_URL_REGEX.exec(adoptionsPage)) {
      urls.push(`${SFSPCA_BASE}/${match[0]}`);
    }
    // Remove any duplicates
    return urls.filter((url, i) => urls.indexOf(url) === i);
  })
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
  .filter(Boolean)
  .then((cats) => {
    let fattestCat = {lbs: 0, oz: 0};
    cats.forEach((cat) => {
      if (cat.lbs > fattestCat.lbs || (cat.lbs === fattestCat.lbs && cat.oz > fattestCat.oz)) {
        fattestCat = cat;
      }
    });
    console.log(`The fattest cat is ${fattestCat.name}. ${(fattestCat.isFemale ? "She" : "He")} weighs ${fattestCat.lbs} lbs and ${fattestCat.oz} oz.`);
    setTimeout(() => console.log("Opening cat profile..."), 2000);
    setTimeout(() => opener(fattestCat.url), 4000);
  });
