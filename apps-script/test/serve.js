// Serves Index.html with a google.script.run shim backed by the simulator (for local UI checks).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { load } = require("./gas-sim");
const fx = require("./fixtures");
const { ctx } = load({ Stock_record: fx.stock(), User: fx.users() });

const shim = `<script>
window.google={script:{get run(){var ok,fail;var p=new Proxy({},{get:function(_,k){
 if(k==='withSuccessHandler')return function(f){ok=f;return p};
 if(k==='withFailureHandler')return function(f){fail=f;return p};
 return function(){fetch('/rpc/'+k,{method:'POST',body:JSON.stringify([].slice.call(arguments))}).then(function(r){return r.json()})
  .then(function(j){j.error?fail(new Error(j.error)):ok(j.value)})}}});return p}}};
</script>`;

http.createServer((req, res) => {
  if (req.url.startsWith("/rpc/")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { res.end(JSON.stringify({ value: ctx[req.url.slice(5)](...JSON.parse(body)) })); }
      catch (e) { res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }
  const html = fs.readFileSync(path.join(__dirname, "..", "Index.html"), "utf8").replace("<head>", "<head>" + shim);
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(html);
}).listen(process.env.PORT || 3200);
