// Fixed Treemap Chart - uses global chartData like other charts
(function() {
  if (typeof chartData !== "undefined" && chartData.length > 0) {
    // Set dimensions for the treemap and UI
    const width = 800;
    const height = 400;
    const uiHeight = 50;

    // Step 1: Get all unique years and fuels
    const allYears = [...new Set(chartData.map(d => d.year))].sort();
    const allFuels = [...new Set(chartData.map(d => d.fuel))].filter(f => f !== "NA");
    console.log("Unique years:", allYears);
    console.log("Number of unique fuels:", allFuels.length);
    console.log("Unique fuels in dataset:", allFuels);

    // Create the chart container and center only the SVG
    const chartContainer = d3.select("#chart");
    
    // Create a wrapper div for the SVG to ensure proper centering
    const svgWrapper = chartContainer.append("div")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("width", "100%");
    
    // Create the SVG element with extra height for UI
    const svg = svgWrapper.append("svg")
      .attr("width", width)
      .attr("height", height + uiHeight)
      .attr("style", "max-width: 100%; height: auto;")
      .style("font", "12px 'Segoe UI', system-ui, sans-serif");

    // Define a color scale for fuels and pollutants
    const color = d3.scaleOrdinal()
      .domain(allFuels.concat(["pm10", "pm2_5", "co", "nox", "so2"]))
      .range(d3.schemeTableau10.concat(["#ff6f61", "#6b5b95", "#88d8b0", "#ffcc5c", "#ffeead"]));

    // Create scales
    const x = d3.scaleLinear().rangeRound([0, width]);
    const y = d3.scaleLinear().rangeRound([0, height]);

    // Create tooltip like other charts
    const tooltip = chartContainer.append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "6px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Treemap layout - use d3 default tiling
    const treemap = d3.treemap()
      .size([width, height])
      .paddingInner(1);

    // Variable to hold the current group
    let group;

    // Function to build hierarchy and update treemap
    function updateTreemap(selectedYear) {
      // Filter data by year
      const filteredData = chartData.filter(d => d.year === selectedYear);

      // Nest the data by fuel
      const nestedData = d3.group(filteredData, d => d.fuel);

      // Build two-level hierarchy: fuels > pollutants
      const rootData = { name: "root", children: [] };
      
      allFuels.forEach(fuel => {
        const rows = nestedData.get(fuel) || [];
        
        // Calculate pollutant values for this fuel
        const pollutantValues = {
          pm10: d3.sum(rows, d => isNaN(+d.pm10) ? 0 : +d.pm10),
          pm2_5: d3.sum(rows, d => isNaN(+d.pm2_5) ? 0 : +d.pm2_5),
          co: d3.sum(rows, d => isNaN(+d.co) ? 0 : +d.co),
          nox: d3.sum(rows, d => isNaN(+d.nox) ? 0 : +d.nox),
          so2: d3.sum(rows, d => isNaN(+d.so2) ? 0 : +d.so2)
        };
        
        // Only add fuel node if it has some emissions
        const totalEmissions = Object.values(pollutantValues).reduce((sum, val) => sum + val, 0);
        
        if (totalEmissions > 0) {
          const fuelNode = {
            name: fuel,
            children: [
              { name: "pm10", value: pollutantValues.pm10 },
              { name: "pm2_5", value: pollutantValues.pm2_5 },
              { name: "co", value: pollutantValues.co },
              { name: "nox", value: pollutantValues.nox },
              { name: "so2", value: pollutantValues.so2 }
            ].filter(d => d.value > 0) // Only include pollutants with positive values
          };
          rootData.children.push(fuelNode);
        }
      });

      // Create the hierarchy and compute sums
      const hierarchy = d3.hierarchy(rootData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

      // Compute initial layout
      treemap(hierarchy);

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
          .attr("x", d => d.x0)
          .attr("y", d => d.y0)
          .attr("width", d => d.x1 - d.x0)
          .attr("height", d => d.y1 - d.y0)
          .attr("fill", d => color(d.data.name))
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);

        node.each(function(d) {
          const rectWidth = d.x1 - d.x0;
          const rectHeight = d.y1 - d.y0;
          // Calculate percentage relative to parent or total
          const parent = d.parent;
          const percentage = parent ? ((d.value / parent.value) * 100).toFixed(1) : 100;
          const label = `${d.data.name} (${percentage}%)`;
          const fontSize = 12;
          const isVertical = rectHeight > rectWidth;

          const text = d3.select(this).append("text")
            .text(label)
            .style("font-size", `${fontSize}px`)
            .style("fill", "#333")
            .attr("text-anchor", "start");

          if (isVertical) {
            text
              .attr("x", d.x0 + 3)
              .attr("y", d.y0 + 15)
              .attr("transform", `rotate(90, ${d.x0 + 3}, ${d.y0 + 15})`);
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
              .attr("x", d.x0 + 5)
              .attr("y", d.y0 + fontSize + 2);
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

        // Event handlers for tooltip
        node
          .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1);
          })
          .on("mousemove", function(event, d) {
            const parent = d.parent;
            const percentage = parent ? ((d.value / parent.value) * 100).toFixed(1) : 100;
            tooltip
              .html(`<strong>${d.data.name}</strong><br>Emission: ${d.value.toFixed(2)} tonnes<br>Percentage: ${percentage}%`)
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", function() {
            tooltip.style("opacity", 0);
          });
      }

      function zoomin(d) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = svg.append("g")
          .attr("class", "treemap-group");

        // Create a new root with proper hierarchy structure
        const subRoot = d3.hierarchy({name: d.data.name, children: d.data.children})
          .sum(d => d.value)
          .sort((a, b) => b.value - a.value);

        // Compute treemap layout
        treemap(subRoot);
        
        group1.call(render, subRoot);

        // Transition the old group out and new group in
        group0.transition()
          .duration(750)
          .style("opacity", 0)
          .remove();

        group1.style("opacity", 0)
          .transition()
          .duration(750)
          .style("opacity", 1);

        console.log(`Zoomed to ${d.data.name}:`, subRoot.children.map(c => `${c.data.name} (${(c.value / subRoot.value * 100).toFixed(1)}%)`));
      }

      function zoomout(root) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = svg.append("g")
          .attr("class", "treemap-group");

        // Recompute the root layout
        treemap(root);
        
        group1.call(render, root);

        // Transition
        group0.transition()
          .duration(750)
          .style("opacity", 0)
          .remove();

        group1.style("opacity", 0)
          .transition()
          .duration(750)
          .style("opacity", 1);

        console.log("Zoomed out to fuels:", root.children.map(c => `${c.data.name} (${(c.value / root.value * 100).toFixed(1)}%)`));
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
      .style("font-size", "14px")
      .style("fill", "#333")
      .style("font-family", "'Segoe UI', system-ui, sans-serif");

    const select = uiGroup.append("foreignObject")
      .attr("x", 100)
      .attr("y", 5)
      .attr("width", 100)
      .attr("height", 30)
      .append("xhtml:select")
      .style("font-size", "14px")
      .style("font-family", "'Segoe UI', system-ui, sans-serif")
      .style("width", "100px")
      .style("padding", "6px")
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

    // Set initial year to the first available year
    select.property("value", allYears[0]);
    updateTreemap(allYears[0]);

    // Add description text after the chart (only if it doesn't exist)
    let descriptionContainer = chartContainer.select(".chart-description");
    
    if (descriptionContainer.empty()) {
      descriptionContainer = chartContainer.append("div")
        .attr("class", "chart-description")
        .style("margin-top", "20px")
        .style("padding", "15px")
        .style("background-color", "#f8f9fa")
        .style("border-radius", "8px")
        .style("font-family", "'Segoe UI', system-ui, sans-serif")
        .style("line-height", "1.6");

      descriptionContainer.append("h3")
        .text("Understanding the Air Pollutant Emissions Treemap")
        .style("margin-top", "0")
        .style("margin-bottom", "10px")
        .style("color", "#333")
        .style("font-size", "16px");

      descriptionContainer.append("p")
        .html(`This interactive treemap visualization displays air pollutant emissions across different fuel types from 2012 to 2019. 
              The visualization has two levels:`)
        .style("margin-bottom", "10px")
        .style("color", "#555");

      const list = descriptionContainer.append("ul")
        .style("margin", "10px 0")
        .style("padding-left", "20px")
        .style("color", "#555");

      list.append("li")
        .html(`<strong>Level 1 (Fuels):</strong> Each rectangle represents a different fuel type (e.g., petrol, diesel, coal). 
              The size of each rectangle is proportional to the total emissions from that fuel type.`);

      list.append("li")
        .html(`<strong>Level 2 (Pollutants):</strong> Click on any fuel rectangle to see the breakdown of pollutants 
              (PM10, PM2.5, CO, NOx, SO2) for that specific fuel. The size of each pollutant rectangle represents its 
              contribution to the total emissions from that fuel.`);

      descriptionContainer.append("p")
        .html(`Use the year dropdown to explore how emissions from different fuels and pollutants have changed over time. 
              Hover over any rectangle to see detailed emission values and percentages.`)
        .style("margin-top", "10px")
        .style("margin-bottom", "0")
        .style("color", "#555");
    }
  }
})();