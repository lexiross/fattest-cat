const express     = require("express");
const _           = require("lodash");
const {fetchCats} = require("./fetch_cats.js");

const app = express();

app.set("port", (process.env.PORT || 5000));

app.get("/", function(req, res) {
  return fetchCats()
    .then(function(cats) {
      const highestWeight = _(cats).map("weight").max();
      const fattestCats = _.filter(cats, {weight: highestWeight});
      if (fattestCats.length === 0) {
        return res.json({fattestCats});
      } else {
        return res.redirect(301, fattestCats[0].url);
      }
    });
});

app.listen(app.get("port"), function() {
  console.log("Node app is running on port", app.get("port"));
});
