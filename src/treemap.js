// Setting dimensions for the treemap and UI
const width = 1200;
const height = 800;
const uiHeight = 50;

//To Load the CSV data
d3.csv("data_set/air-pollutant-emissions-2012-2019.csv").then(data => {
  // Step 1: Get all unique years and fuels
  const allYears = [...new Set(data.map(d => d.year))].sort();
  const allFuels = [...new Set(data.map(d => d.fuel))].filter(f => f !== "NA");
  console.log("Unique years:", allYears);
  console.log("Number of unique fuels:", allFuels.length);
  console.log("Unique fuels in dataset:", allFuels);

  // Creates the SVG element with extra height for UI
  const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height + uiHeight);

  // Defines a color scale for all fuels
  const color = d3.scaleOrdinal()
    .domain(allFuels)
    .range(d3.schemeTableau10.concat(["#ff6f61", "#6b5b95"]));

  // Function to update the treemap based on selected year
  function updateTreemap(selectedYear) {
    // Filter data by year
    const filteredData = data.filter(d => d.year === selectedYear);

    // Nest the data by fuel
    const nestedData = d3.group(filteredData, d => d.fuel);

    // Build the hierarchical structure with actual emissions
    const root = { name: "root", children: [] };
    allFuels.forEach(fuel => {
      const rows = nestedData.get(fuel) || [];
      const totalEmissions = d3.sum(rows, d => {
        const pm10 = isNaN(+d.pm10) ? 0 : +d.pm10;
        const pm2_5 = isNaN(+d.pm2_5) ? 0 : +d.pm2_5;
        const co = isNaN(+d.co) ? 0 : +d.co;
        const nox = isNaN(+d.nox) ? 0 : +d.nox;
        const so2 = isNaN(+d.so2) ? 0 : +d.so2;
        return pm10 + pm2_5 + co + nox + so2;
      });
      root.children.push({ name: fuel, value: totalEmissions });
    });

    // Created the hierarchy and compute sums
    const hierarchy = d3.hierarchy(root)
      .sum(d => d.value);

    // To Set up the treemap layout
    const treemap = d3.treemap()
      .size([width, height])
      .padding(2)
      .tile(d3.treemapSquarify.ratio(1));

    // Compute the layout
    treemap(hierarchy);

    // Get the leaf nodes and log them
    const leaves = hierarchy.leaves();
    console.log(`Fuels in treemap for ${selectedYear}:`, leaves.map(d => `${d.data.name} (${d.value.toFixed(0)})`));
    console.log("Rectangle sizes:", leaves.map(d => `${d.data.name}: ${d.x1 - d.x0}x${d.y1 - d.y0}`));

    // Clear previous treemap content
    svg.selectAll(".node").remove();

    // Append groups for each leaf node (fuel)
    const nodes = svg.selectAll(".node")
      .data(leaves)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // Appended rectangles
    nodes.append("rect")
      .attr("width", d => Math.max(d.x1 - d.x0, 10))
      .attr("height", d => Math.max(d.y1 - d.y0, 10))
      .attr("fill", d => color(d.data.name))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Appended labels with fixed size and dynamic orientation
    nodes.each(function(d) {
      const rectWidth = d.x1 - d.x0;
      const rectHeight = d.y1 - d.y0;
      const label = `${d.data.name} (${d.value.toFixed(0)})`;
      const fontSize = 12; // Fixed size for all labels
      const isVertical = rectHeight > rectWidth; // Vertical if taller than wide

      const text = d3.select(this).append("text")
        .text(label)
        .style("font-size", `${fontSize}px`)
        .style("fill", "#000")
        .style("font-family", "Arial, sans-serif")
        .attr("text-anchor", "start");

      if (isVertical) {
        // Vertical orientation
        text
          .attr("x", 3)
          .attr("y", 15)
          .attr("transform", "rotate(90, 3, 15)");
        const textWidth = text.node().getBBox().width;
        if (textWidth > rectHeight - 4) {
          let truncated = label;
          while (truncated.length > 5 && text.node().getBBox().width > rectHeight - 4) {
            truncated = truncated.slice(0, -1);
            text.text(truncated + "...");
          }
        }
        if (rectHeight < 20) text.style("display", "none");
      } else {
        // Horizontal orientation
        text
          .attr("x", 5)
          .attr("y", fontSize + 2); // Slight padding below top
        const textWidth = text.node().getBBox().width;
        if (textWidth > rectWidth - 10) {
          let truncated = label;
          while (truncated.length > 5 && text.node().getBBox().width > rectWidth - 10) {
            truncated = truncated.slice(0, -1);
            text.text(truncated + "...");
          }
        }
        if (rectHeight < fontSize + 4) text.style("display", "none");
      }
    });

    //To Ensure tooltip is on top
    svg.select(".tooltip").remove();
    const tooltip = svg.append("g")
      .attr("class", "tooltip")
      .style("display", "none");

    tooltip.append("rect")
      .attr("width", 150)
      .attr("height", 20)
      .attr("fill", "#333")
      .attr("opacity", 0.8);

    tooltip.append("text")
      .attr("x", 5)
      .attr("y", 15)
      .style("font-size", "12px")
      .style("fill", "#fff");

    // Added hover effect to show tooltip
    nodes
      .on("mouseover", function(event, d) {
        tooltip.style("display", "block");
        tooltip.select("text").text(`${d.data.name} (${d.value.toFixed(0)})`);
      })
      .on("mousemove", function(event, d) {
        const [x, y] = d3.pointer(event, svg.node());
        tooltip.attr("transform", `translate(${x},${y + 20})`);
      })
      .on("mouseout", function(event, d) {
        tooltip.style("display", "none");
      });
  }

  //UI for Dropdown for year selection
  const uiGroup = svg.append("g")
    .attr("transform", `translate(10, ${height + 10})`);

  uiGroup.append("text")
    .text("Select Year:")
    .attr("y", 20)
    .style("font-size", "16px")
    .style("font-family", "Arial, sans-serif");

  const select = uiGroup.append("foreignObject")
    .attr("x", 100)
    .attr("y", 5)
    .attr("width", 100)
    .attr("height", 30)
    .append("xhtml:select")
    .style("font-size", "14px")
    .style("width", "100px")
    .on("change", function() {
      const selectedYear = this.value;
      updateTreemap(selectedYear);
    });

  select.selectAll("option")
    .data(allYears)
    .enter()
    .append("xhtml:option")
    .attr("value", d => d)
    .text(d => d);

  // Set initial year to 2012
  select.property("value", allYears[0]);
  updateTreemap(allYears[0]);

}).catch(error => {
  console.error("Error loading the CSV file:", error);
});