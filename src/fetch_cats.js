const request = require('request-promise');

const LIST_URL =
  'https://www.sfspca.org/wp-json/sfspca/v1/filtered-posts/get-adoptions?per_page=100';

async function fetchJSON(url) {
  const responseText = await request.get(url);
  return JSON.parse(responseText);
}

exports.fetchCatItems = async function fetchCatItems() {
  const response = await fetchJSON(LIST_URL);
  return response.items
    .filter((item) => item.tags.species == 'Cat')
    .map((item) => ({
      name: item.title,
      url: item.permalink,
    }));
};

exports.fetchCatDetails = async function fetchCatDetails({ name, url }) {
  let response;
  try {
    response = await request.get(url);
  } catch (_err) {
    return null;
  }

  const lbsMatch = response.match(/([0-9]+)\slb/);
  const ozMatch = response.match(/([0-9]+)\soz/);
  const lbs = lbsMatch ? Number(lbsMatch[1]) : 0;
  const oz = ozMatch ? Number(ozMatch[1]) : 0;
  const weight = 16 * lbs + oz;

  return { name, lbs, oz, weight, url };
};
