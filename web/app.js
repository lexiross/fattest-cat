var express = require("express");
var path = require("path");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var { uniq, compact, sortBy } = require("lodash");
var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

var server = require("http").Server(app);
var io = require("socket.io")(server);

var cats = require("../");

io.on("connection", function (socket) {

  socket.emit("line", "Accessing San Francisco SPCA (Cat Department)...");

  cats.fetchCats()
    .then(uniq)
    .map(url => {
      return cats.urlToCat(url)
        .tap(cat => {
          socket.emit("line", `Weighing cat: ${cat.name}`);
        });
    }, { concurrency: 10 })
    .then(compact)
    .then(cats => {
      const fattestCat = sortBy(cats, "weight")[cats.length - 1];
      socket.emit("line", `The fattest cat is ${fattestCat.name}. ${(fattestCat.isFemale ? "She" : "He")} weighs ${fattestCat.lbs} lbs and ${fattestCat.oz} oz.`);
      socket.emit("redirect", fattestCat.url);
    });

});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err,
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: {},
  });
});

app.set("port", process.env.PORT || 3000);

server.listen(app.get("port"), function() {
  console.log(`Express server listening on port ${server.address().port}`);
});

module.exports = { app, server, io };
