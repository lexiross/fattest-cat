#!/usr/bin/env node

const _ = require('lodash');
const opener = require('opener');
const { fetchCatItems, fetchCatDetails } = require('./fetch_cats');
require('colors');

const GARFIELD =
  process.argv.includes('--garfield') || process.argv.includes('--garfield-mode');
const METRIC = process.argv.includes('--metric');
const GRAMS_PER_OZ = 28.3495;

if (GARFIELD) {
  if (new Date().getDay() == 1) {
    console.log('I hate Mondays');
    return;
  }
}

async function main() {
  console.log('Accessing San Francisco SPCA (Cat Department)...');

  const catPages = await fetchCatItems();
  if (catPages.length === 0) {
    console.log('No cats found. It is a sad day.'.red.bold);
    return;
  }
  console.log(
    `Cat information system accessed. ${catPages.length} cats found. Beginning weighing process...`,
  );

  const cats = [];
  for (const catPage of catPages) {
    const catDetails = await fetchCatDetails(catPage);
    if (catDetails) {
      console.log('Weighing cat: %s', catDetails.name.green);
      cats.push(catDetails);
    }
  }

  const highestWeight = _(cats)
    .map('weight')
    .max();
  const fattestCats = _.filter(cats, { weight: highestWeight });
  const names = _.map(fattestCats, 'name');
  const tie = fattestCats.length > 1;

  const introText = (tie ? 'The fattest cats are' : 'The fattest cat is').yellow.bold;
  const nameText = (tie
    ? `${names.slice(0, -1).join(', ')} and ${_.last(names)}`
    : names[0]
  ).green.underline.bold;
  const descriptionText = (tie
    ? 'They each weigh'
    : fattestCats[0].isFemale
    ? 'She weighs'
    : 'He weighs'
  ).yellow.bold;
  const weightText = METRIC
    ? `${Math.round(GRAMS_PER_OZ * highestWeight)} grams`.yellow.bold
    : `${fattestCats[0].lbs} lbs and ${fattestCats[0].oz} oz.`.yellow.bold;
  const openText = (tie ? 'Opening cat profiles...' : 'Opening cat profile...').yellow
    .bold;

  console.log(`${introText} ${nameText}. ${descriptionText} ${weightText}. ${openText}`);
  setTimeout(
    () =>
      _(fattestCats)
        .map('url')
        .each((url) => opener(url)),
    3000,
  );
}

main();
