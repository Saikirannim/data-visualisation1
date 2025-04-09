// Set dimensions for the treemap and UI
const width = 800;
const height = 400;
const uiHeight = 50;

// Load the CSV data
d3.csv("data_set/air-pollutant-emissions-2012-2019.csv").then(data => {
  // Step 1: Get all unique years and fuels
  const allYears = [...new Set(data.map(d => d.year))].sort();
  const allFuels = [...new Set(data.map(d => d.fuel))].filter(f => f !== "NA");
  console.log("Unique years:", allYears);
  console.log("Number of unique fuels:", allFuels.length);
  console.log("Unique fuels in dataset:", allFuels);

  // Create the SVG element with extra height for UI
  const svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height + uiHeight)
    .attr("style", "max-width: 100%; height: auto;")
    .style("font", "12px Arial, sans-serif");

  // Define a color scale for fuels and pollutants
  const color = d3.scaleOrdinal()
    .domain(allFuels.concat(["pm10", "pm2_5", "co", "nox", "so2"]))
    .range(d3.schemeTableau10.concat(["#ff6f61", "#6b5b95", "#88d8b0", "#ffcc5c", "#ffeead"]));

  // Create scales
  const x = d3.scaleLinear().rangeRound([0, width]);
  const y = d3.scaleLinear().rangeRound([0, height]);

  // Custom tiling function
  function tile(node, x0, y0, x1, y1) {
    d3.treemapBinary(node, 0, 0, width, height);
    for (const child of node.children) {
      child.x0 = x0 + child.x0 / width * (x1 - x0);
      child.x1 = x0 + child.x1 / width * (x1 - x0);
      child.y0 = y0 + child.y0 / height * (y1 - y0);
      child.y1 = y0 + child.y1 / height * (y1 - y0);
    }
  }

  // Treemap layout
  const treemap = d3.treemap().tile(tile);

  // Variable to hold the current group
  let group;

  // Function to build hierarchy and update treemap
  function updateTreemap(selectedYear) {
    // Filter data by year
    const filteredData = data.filter(d => d.year === selectedYear);

    // Nest the data by fuel
    const nestedData = d3.group(filteredData, d => d.fuel);

    // Build two-level hierarchy: fuels > pollutants
    const rootData = { name: "root", children: [] };
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
      const fuelNode = {
        name: fuel,
        value: totalEmissions,
        children: [
          { name: "pm10", value: d3.sum(rows, d => isNaN(+d.pm10) ? 0 : +d.pm10) },
          { name: "pm2_5", value: d3.sum(rows, d => isNaN(+d.pm2_5) ? 0 : +d.pm2_5) },
          { name: "co", value: d3.sum(rows, d => isNaN(+d.co) ? 0 : +d.co) },
          { name: "nox", value: d3.sum(rows, d => isNaN(+d.nox) ? 0 : +d.nox) },
          { name: "so2", value: d3.sum(rows, d => isNaN(+d.so2) ? 0 : +d.so2) }
        ]
      };
      rootData.children.push(fuelNode);
    });

    // Create the hierarchy and compute sums
    const hierarchy = d3.hierarchy(rootData)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    // Compute initial layout
    treemap(hierarchy);

    // Reset scales to root level
    x.domain([hierarchy.x0, hierarchy.x1]);
    y.domain([hierarchy.y0, hierarchy.y1]);

    // Clear previous treemap content
    svg.selectAll(".treemap-group").remove();

    // Display the root (fuels only)
    group = svg.append("g")
      .attr("class", "treemap-group")
      .call(render, hierarchy);

    function render(group, root) {
      const node = group
        .selectAll("g")
        .data(root.children || [])
        .join("g");

      node.filter(d => d.children)
        .attr("cursor", "pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          zoomin(d);
        });

      node.append("rect")
        .attr("fill", d => color(d.data.name))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

      node.each(function(d) {
        const rectWidth = x(d.x1) - x(d.x0);
        const rectHeight = y(d.y1) - y(d.y0);
        const label = `${d.data.name} (${d.value.toFixed(0)})`;
        const fontSize = 12;
        const isVertical = rectHeight > rectWidth;

        const text = d3.select(this).append("text")
          .text(label)
          .style("font-size", `${fontSize}px`)
          .style("fill", "#000")
          .attr("text-anchor", "start");

        if (isVertical) {
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
          text
            .attr("x", 5)
            .attr("y", fontSize + 2);
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

      group.call(position, root);

      // Tooltip
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

      node
        .on("mouseover", function(event, d) {
          tooltip.style("display", "block");
          tooltip.select("text").text(`${d.data.name} (${d.value.toFixed(0)})`);
        })
        .on("mousemove", function(event, d) {
          const [xPos, yPos] = d3.pointer(event, svg.node());
          tooltip.attr("transform", `translate(${xPos},${yPos + 20})`);
        })
        .on("mouseout", function() {
          tooltip.style("display", "none");
        });
    }

    function position(group, root) {
      group.selectAll("g")
        .attr("transform", d => `translate(${x(d.x0)},${y(d.y0)})`)
        .select("rect")
        .attr("width", d => x(d.x1) - x(d.x0))
        .attr("height", d => y(d.y1) - y(d.y0));
    }

    function zoomin(d) {
      const group0 = group.attr("pointer-events", "none");
      const group1 = group = svg.append("g")
        .attr("class", "treemap-group")
        .call(render, d);

      x.domain([d.x0, d.x1]);
      y.domain([d.y0, d.y1]);

      svg.transition()
        .duration(750)
        .call(t => group0.transition(t).remove()
          .call(position, d.parent))
        .call(t => group1.transition(t)
          .attrTween("opacity", () => d3.interpolate(0, 1))
          .call(position, d));

      console.log(`Zoomed to ${d.data.name}:`, d.children.map(c => `${c.data.name} (${c.value.toFixed(0)})`));
    }

    function zoomout(root) {
      const group0 = group.attr("pointer-events", "none");
      const group1 = group = svg.append("g")
        .attr("class", "treemap-group")
        .call(render, root);

      x.domain([root.x0, root.x1]);
      y.domain([root.y0, root.y1]);

      svg.transition()
        .duration(750)
        .call(t => group0.transition(t).remove()
          .attrTween("opacity", () => d3.interpolate(1, 0))
          .call(position, root))
        .call(t => group1.transition(t)
          .call(position, root));

      console.log("Zoomed out to fuels:", root.children.map(c => `${c.data.name} (${c.value.toFixed(0)})`));
    }

    // Click to zoom out
    svg.on("click", (event) => {
      if (event.target === svg.node()) zoomout(hierarchy);
    });
  }

  // Add UI: Dropdown for year selection
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