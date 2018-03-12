var token = "nxnYm1q36VZeWqNOBCnMzsKHz";

// the geojson files are large, so loading them locally
var urls = {
  basemap: "baseMap.geojson",
  arrests: "Tree_Maintenance_2016.csv"
};

// calculate date range
var start = d3.timeDay.offset(new Date(), -21);
var end = d3.timeDay.ceil(d3.timeDay.offset(start, 6));
var format = d3.timeFormat("%Y-%m-%d");
console.log(format(start), format(end));

// add parameters to arrests url
urls.arrests += "?$$app_token=" + token;
urls.arrests += "&$where=starts_with(resolution, 'ARREST')";
urls.arrests += " AND date between '" + format(start) + "'";
urls.arrests += " and '" + format(end) + "'";

var svg = d3.select("body").select("svg");

var g = {
  basemap: svg.append("g").attr("id", "basemap"),
  arrests: svg.append("g").attr("id", "arrests"),
  tooltip: svg.append("g").attr("id", "tooltip"),
  details: svg.append("g").attr("id", "details")
};


// https://github.com/d3/d3-geo#conic-projections
var projection = d3.geoConicEqualArea();
var path = d3.geoPath().projection(projection);

// http://mynasadata.larc.nasa.gov/latitudelongitude-finder/
// center on san francisco [longitude, latitude]
// choose parallels on either side of center
projection.parallels([37.692514, 37.840699]);

// rotate to view we usually see of sf
projection.rotate([122, 0]);

// we want both basemap and streets to load before arrests
// https://github.com/d3/d3-queue
var q = d3.queue()
  .defer(d3.json, urls.basemap)
  .await(drawMap);

function drawMap(error, basemap, streets) {
  if (error) throw error;
  console.log("basemap", basemap);


  // make sure basemap fits in projection
  projection.fitSize([960, 600], basemap);

  // draw basemap
  var land = g.basemap.selectAll("path.land")
    .data(basemap.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "land");



  // used to show neighborhood outlines on top of streets
  g.basemap.selectAll("path.neighborhood")
    .data(basemap.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "neighborhood")
    .each(function(d) {
      // save selection in data for interactivity
      d.properties.outline = this;
    });

  // setup tooltip (shows neighborhood name)
  var tip = g.tooltip.append("text").attr("id", "tooltip");
  tip.attr("text-anchor", "end");
  tip.attr("dx", -5);
  tip.attr("dy", -5);
  tip.style("visibility", "hidden");

  // add interactivity
  land.on("mouseover", function(d) {
      tip.text(d.properties.name);
      tip.style("visibility", "visible");

      d3.select(d.properties.outline).raise();
      d3.select(d.properties.outline).classed("active", true);
    })
    .on("mousemove", function(d) {
      var coords = d3.mouse(g.basemap.node());
      tip.attr("x", coords[0]);
      tip.attr("y", coords[1]);
    })
    .on("mouseout", function(d) {
      tip.style("visibility", "hidden");
      d3.select(d.properties.outline).classed("active", false);
    });

  d3.csv(urls.arrests, drawArrests);
}


function drawArrests(error, arrests) {
  if (error) throw error;
  arrests = parseTree(arrests);
  console.log("arrests", arrests);

  var symbols = g.arrests.selectAll("circle")
    .data(arrests)
    .enter()
    .append("circle")
    .attr("cx", function(d) { return projection([+d.Point[1], +d.Point[0]])[0]; })
    .attr("cy", function(d) { return projection([+d.Point[1], +d.Point[0]])[1]; })
    .attr("r", 5)
    .attr("class", "symbol");

  // add details widget
  // https://bl.ocks.org/mbostock/1424037


  var details = g.details.append("foreignObject")
    .attr("id", "details")
    .attr("width", 960)
    .attr("height", 600)
    .attr("x", 0)
    .attr("y", 0);

  var body = details.append("xhtml:body")
    .style("text-align", "left")
    .style("background", "none")
    .html("<p>N/A</p>");

  details.style("visibility", "hidden");

  symbols.on("mouseover", function(d) {
    d3.select(this).raise();
    d3.select(this).classed("active", true);

    body.html("<table border=0 cellspacing=0 cellpadding=2>" + "\n" +
      "<tr><th>Incident:</th><td>" + d.incidntnum + "</td></tr>" + "\n" +
      "<tr><th>Date:</th><td>" + new Date(d.date).toDateString() + "</td></tr>" + "\n" +
      "<tr><th>Time:</th><td>" + d.time + "</td></tr>" + "\n" +
      "<tr><th>Category:</th><td>" + d.category + "</td></tr>" + "\n" +
      "<tr><th>Description:</th><td>" + d.descript + "</td></tr>" + "\n" +
      "</table>");

    details.style("visibility", "visible");
  });

  symbols.on("mouseout", function(d) {
    d3.select(this).classed("active", false);
    details.style("visibility", "hidden");
  });
}

function translate(x, y) {
  return "translate(" + String(x) + "," + String(y) + ")";
}

function parseTree(d) {
  for (var i = 0; i < d.length; i++) {
    var temp = d[i].Point.replace("(", "")
    temp = temp.replace(")", "")
    temp = temp.split(",")
    temp[0] = parseFloat(temp[0])
    temp[1] = parseFloat(temp[1])
    d[i].Point = temp

  }
  return d;

}
