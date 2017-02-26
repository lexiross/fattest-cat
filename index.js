const request = require("request-promise");
const exec = require("child_process").execSync;

const ADOPTION_PAGE = "https://www.sfspca.org/adoptions/cats";
const CAT_URL_REGEX = /adoptions\/pet-details\/\d+/g;
let hasOpened = false;
console.log("Accessing San Francisco SPCA (Cat Department)...");
request.get(ADOPTION_PAGE)
    .then(function(adoptionsPage) {
        console.log("Cat information system accessed. Beginning weighing process...");
        const urls = [];
        let match;
        while (match = CAT_URL_REGEX.exec(adoptionsPage)) {
            urls.push(`https://www.sfspca.org/${match[0]}`);
        }
        return urls.filter((url, i) => urls.indexOf(url) === i);
    })
    .map((url) => {
        return request.get(url)
            .catch((err) => err)
            .then((catPage) => {
                const name = /\<h1\>([a-zA-Z]+)\<\/h1\>/.exec(catPage)[1];
                const lbs = Number(/(\d+)lbs\./.exec(catPage)[1]);
                const oz = Number(/(\d+)oz./.exec(catPage)[1]);
                const isFemale = /Female/.test(catPage);
                console.log("Weighing cat:", name);
                return {name, lbs, oz, isFemale, url}
            })
            .catch((err) => null);
    })
    .filter(Boolean)
    .then(function (cats) {
        let fattestCat = {lbs: 0, oz: 0};
        cats.forEach((cat) => {
            if (cat.lbs > fattestCat.lbs || (cat.lbs === fattestCat.lbs && cat.oz > fattestCat.oz)) {
                fattestCat = cat;
            }
        });
        console.log("The fattest cat is", fattestCat.name + ".  ", fattestCat.isFemale ? "She" : "He", "weighs", fattestCat.lbs, "lbs", fattestCat.oz, "oz.");
        setTimeout(() => console.log("Opening cat profile..."), 2000);
        setTimeout(() => exec(`open ${fattestCat.url}`), 4000);
    });
