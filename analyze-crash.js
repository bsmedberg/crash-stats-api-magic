Array.prototype.counter = function() {
  var r = {};
  this.forEach(function(d) {
    if (!(d in r)) {
      r[d] = 1;
    } else {
      r[d] += 1;
    }
  });
  return r;
};

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(substr) {
    return this.indexOf(substr) == 0;
  };
}

var gData;

function logError(e) {
  console.error(e);
  d3.select("#error").text(e);
}

function fetch() {
  var url = d3.select("#apiurl").property("value");
  d3.json(url).on("load", function(d) {
    gData = d;
    d3.select("#count").text(gData.hits.length);
  }).on("error", function(e) {
    logError(e);
  }).get();
}

function newRule() {
  return d3.select("#processing").append(function() {
    var n = d3.select("#processing-template").node().cloneNode(true);
    n.removeAttribute("id");
    return n;
  });
}

function go() {
  try {
    setState();

    var filters = [];
    d3.selectAll("#processing form:not(#processing-template)").each(function() {
      var d = d3.select(this);
      var action = d.select("input[name=type]:checked").property("value");
      var fnstr = d.select("[name=func]").property("value");
      if (action != "counter") {
        try {
          var fn = eval("(" + fnstr + ")");
        }
        catch (e) {
          throw new Error("Error evaluating function: " + fnstr + ": " + e);
        }
      }
      filters.push({action: action, fn: fn});
    });
    gFilters = filters;

    if (gData) {
      var data = gData.hits;
      filters.forEach(function(filter) {
        data = data[filter.action](filter.fn);
      });

      d3.select("#results").text(JSON.stringify(data, null, 2));
    }
    d3.select("#error").text("");
  }
  catch(e) {
    logError(e);
    throw e;
  }
}

function setState() {
  var rules = d3.selectAll("#processing form:not(#processing-template)");

  var url = new URL(location);

  var searchParams = new Map();

  searchParams.set("url", d3.select("#apiurl").property("value"));
  searchParams.set("rulecount", rules.size());

  rules.each(function(datum, i) {
    var d = d3.select(this);
    var action = d.select("input[name=type]:checked").property("value");
    var fnstr = d.select("[name=func]").property("value");
    searchParams.set("rule" + i + "_action", action);
    searchParams.set("rule" + i + "_fn", fnstr);
  });

  var paramList = [];
  searchParams.forEach(function(v, k) {
    paramList.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
  });
  url.search = "?" + paramList.join("&");
  history.replaceState(null, "Tool For Analyzing Crashes From Search", url.href);
}

function getState() {
  var url = window.location;

  var q = url.search;
  if (q.startsWith("?")) {
    q = q.slice(1);
  }
  var searchParams = new Map();
  q.split(/&/).forEach(function(d) {
    var parts = d.split("=");
    searchParams.set(decodeURIComponent(parts[0]), decodeURIComponent(parts[1]));
  });
  d3.select("#apiurl").property("value", searchParams.get("url"));

  d3.select("#processing form:not(#processing-template)").remove();
  for (var i = 0; i < parseInt(searchParams.get("rulecount")); ++i) {
    var action = searchParams.get("rule" + i + "_action");
    var fnstr = searchParams.get("rule" + i + "_fn");

    var rule = newRule();
    rule.selectAll("input[name=type]").filter(function(d, i) {
      return this.value == action;
    }).property("checked", true);
    rule.select("[name=func]").property("value", fnstr);
  }
}

function removerule(el) {
  while (!(el instanceof HTMLFormElement)) {
    el = el.parentNode;
  }
  el.remove();
}

getState();
