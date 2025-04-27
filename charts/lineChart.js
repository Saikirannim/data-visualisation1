(function () {
  if (typeof chartData !== "undefined" && chartData.length > 0) {
    let selectedLineFuel = "all";
    let selectedLinePollutant = "all";

    const chartContainer = d3.select("#chart");
    chartContainer.html("");

    // Create a centered wrapper for both filter and chart
    const chartWrapper = chartContainer.append("div")
      .style("width", "800px")
      .style("margin", "0 auto");

    const filterDiv = chartWrapper.append("div")
      .attr("class", "filter-container")
      .style("margin-bottom", "20px")
      .style("display", "flex")
      .style("gap", "10px");

    // Pollutant Select (Static list)
    const pollutantSelect = filterDiv.append("select")
      .attr("id", "linePollutantSelect")
      .style("padding", "6px");

    pollutantSelect.append("option").attr("value", "all").text("All Pollutants");
    const pollutantKeys = ["pm10", "pm2_5", "co", "nox", "so2"];
    pollutantKeys.forEach(pollutant => {
      pollutantSelect.append("option")
        .attr("value", pollutant)
        .text(pollutant.toUpperCase());
    });

    // Fuel Type Select (Dynamic from CSV's 'fuel' column)
    const fuelSelect = filterDiv.append("select")
      .attr("id", "lineFuelSelect")
      .style("padding", "6px");

    fuelSelect.append("option").attr("value", "all").text("All Fuels");

    const fuelTypes = [...new Set(chartData.map(d => d.fuel).filter(f => f && f.trim() !== ""))];
    fuelTypes.forEach(fuel => {
      fuelSelect.append("option")
        .attr("value", fuel)
        .text(fuel);
    });

    pollutantSelect.on("change", function () {
      selectedLinePollutant = this.value;
      renderLineChart();
    });

    fuelSelect.on("change", function () {
      selectedLineFuel = this.value;
      renderLineChart();
    });

    // Create a wrapper div for the SVG inside the chartWrapper
    const svgWrapper = chartWrapper.append("div")
      .style("width", "100%");

    renderLineChart(); // Initial Draw

    function renderLineChart() {
      svgWrapper.selectAll("svg").remove();
      chartContainer.selectAll(".tooltip").remove();

      const filtered = selectedLineFuel === "all"
        ? chartData
        : chartData.filter(d =>
            d.fuel && d.fuel.trim().toLowerCase() === selectedLineFuel.trim().toLowerCase()
          );

      const allYears = [...new Set(filtered.map(d => d.year))].sort();

      const activePollutants = selectedLinePollutant === "all"
        ? pollutantKeys
        : [selectedLinePollutant];

      const grouped = {};
      activePollutants.forEach(pollutant => {
        grouped[pollutant.toUpperCase()] = allYears.map(year => {
          const yearData = filtered.filter(d => d.year === year);
          const total = d3.sum(yearData, d => d[pollutant] !== undefined && d[pollutant] !== "" ? +d[pollutant] : 0);
          return [year, total];
        });
      });

      const margin = { top: 40, right: 100, bottom: 40, left: 60 },
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

      const svg = svgWrapper.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scalePoint()
        .domain(allYears)
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([
          0,
          d3.max(Object.values(grouped).flat(), d => d[1])
        ])
        .nice()
        .range([height, 0]);

      const color = d3.scaleOrdinal()
        .domain(Object.keys(grouped))
        .range(d3.schemeSet2);

      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));

      const tooltip = chartContainer.append("div")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "6px 10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0);

      const line = d3.line()
        .x(d => x(d[0]))
        .y(d => y(d[1]))
        .curve(d3.curveMonotoneX);

      for (const [pollutant, values] of Object.entries(grouped)) {
        svg.append("path")
          .datum(values)
          .attr("fill", "none")
          .attr("stroke", color(pollutant))
          .attr("stroke-width", 2)
          .attr("d", line);

        svg.selectAll(`.dot-${pollutant}`)
          .data(values)
          .enter()
          .append("circle")
          .attr("class", `dot-${pollutant}`)
          .attr("cx", d => x(d[0]))
          .attr("cy", d => y(d[1]))
          .attr("r", 4)
          .attr("fill", color(pollutant))
          .on("mouseover", function (event, d) {
            tooltip.style("opacity", 1);
          })
          .on("mousemove", function (event, d) {
            tooltip
              .html(`<strong>${pollutant}</strong><br>Year: ${d[0]}<br>Emission: ${d[1].toFixed(2)}`)
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", function () {
            tooltip.style("opacity", 0);
          });
      }

      const legend = svg.append("g").attr("transform", `translate(${width + 20}, 0)`);
      Object.keys(grouped).forEach((key, i) => {
        legend.append("rect")
          .attr("x", 0)
          .attr("y", i * 20)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", color(key));
        legend.append("text")
          .attr("x", 20)
          .attr("y", i * 20 + 10)
          .text(key)
          .attr("font-size", "12px")
          .attr("fill", "#333");
      });
    }

    // Add description text after the chart (only if it doesn't exist)
    let descriptionContainer = chartContainer.select(".line-chart-description");
    
    if (descriptionContainer.empty()) {
      descriptionContainer = chartContainer.append("div")
        .attr("class", "line-chart-description")
        .style("margin-top", "20px")
        .style("padding", "15px")
        .style("background-color", "#f8f9fa")
        .style("border-radius", "8px")
        .style("font-family", "'Segoe UI', system-ui, sans-serif")
        .style("line-height", "1.6");

      descriptionContainer.append("h3")
        .text("Understanding the Air Pollutant Emissions Line Chart")
        .style("margin-top", "0")
        .style("margin-bottom", "10px")
        .style("color", "#333")
        .style("font-size", "16px");

      descriptionContainer.append("p")
        .html(`This line chart visualization displays trends in air pollutant emissions over time from 2012 to 2019. 
              Each line represents a specific pollutant, showing how its emission levels have changed across years.`)
        .style("margin-bottom", "10px")
        .style("color", "#555");

      const list = descriptionContainer.append("ul")
        .style("margin", "10px 0")
        .style("padding-left", "20px")
        .style("color", "#555");

      list.append("li")
        .html(`<strong>Pollutant Filtering:</strong> Use the left dropdown to select specific pollutants (PM10, PM2.5, CO, NOx, SO2) 
              or view all pollutants simultaneously. This allows you to focus on trends for individual pollutants or compare multiple pollutants.`);

      list.append("li")
        .html(`<strong>Fuel Type Filtering:</strong> Use the right dropdown to filter emissions by fuel type. 
              This helps you understand which fuels contribute most to specific pollutant emissions over time.`);

      list.append("li")
        .html(`<strong>Interactive Data Points:</strong> Hover over any point on the lines to see the exact emission 
              values for that year and pollutant. The dots on the lines represent actual data points from the dataset.`);

      descriptionContainer.append("p")
        .html(`The line chart is particularly useful for identifying trends, seasonal patterns, and the impact of 
              environmental policies on air pollutant emissions over the years. Combining both filters allows for 
              detailed analysis of specific pollutant-fuel combinations.`)
        .style("margin-top", "10px")
        .style("margin-bottom", "0")
        .style("color", "#555");
    }
  }
})();
