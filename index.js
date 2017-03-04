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
    let fattestCats = [{lbs: 0, oz: 0}];
    cats.forEach((cat) => {
      //Cat is bigger than the biggest cats
      if (cat.lbs > fattestCats[0].lbs || (cat.lbs === fattestCats[0].lbs && cat.oz > fattestCats[0].oz)) {
        fattestCats = [cat];
      }
      //Cat ties with the current biggest cats
      else if(cat.lbs === fattestCats[0].lbs && cat.oz === fattestCats[0].oz){
        fattestCats.push(cat);
      }
    });
    
    // Only display up to 10 fattest cats
    fattestCats = fattestCats.slice(0, 10);

    //Decide whether to display a single cat or multiple
    let winnerDesc;
    if(fattestCats.length === 1){
      winnerDesc = `cat is ${colors.green.underline(fattestCats[0].name)}. ${(fattestCats[0].isFemale ? "She" : "He")} weighs`.output;
    }
    else{
      winnerDesc = `cats ${fattestCats.map(function (cat) {
          return colors.green.underline(cat.name);
      }).join(', ')} each weigh`.output;

      let pos = winnerDesc.lastIndexOf(',');
      winnerDesc = winnerDesc.substring(0, pos) + ' and' + winnerDesc.substring(pos+1);
    }
    console.log(`The fattest ${winnerDesc} ${fattestCats[0].lbs} lbs and ${fattestCats[0].oz} oz.`.output);
    setTimeout(() => console.log("Opening cat profile..."), 2000);
    setTimeout(() => {
        for(let fattestCat of fattestCats){
            opener(fattestCat.url);
        }
    }, 4000);
  });
