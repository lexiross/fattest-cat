var el = document.getElementById("app");

var socket = window.io();

socket.on("line", appendLine);

socket.on("redirect", (url) => {
  appendLine("redirecting to cat profile...");
  setTimeout(function () {
    window.location = url;
  }, 2500)
})

function appendLine (str) {
  const line = document.createElement("div");
  line.innerHTML = str;
  el.appendChild(line);
}
