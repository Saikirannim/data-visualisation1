// Stream Chart rendering logic wrapped in an IIFE to isolate scope
(function () {
  if (typeof chartData !== 'undefined' && chartData.length > 0) {

    // Get selected filters for year and pollutant
    const selectedYear = document.getElementById("yearSelect").value;
    const selectedPollutant = document.getElementById("pollutantSelect").value;

    const pollutantKeys = ["pm10", "pm2_5", "co", "nox", "so2"];
    const activeKeys = selectedPollutant === "all" ? pollutantKeys : [selectedPollutant];

    // Transform the filtered data into a structure suitable for stream graph
    const transformed = [];
    chartData.forEach(row => {
      if (selectedYear !== "all" && row.year !== selectedYear) return;
      activeKeys.forEach(key => {
        if (row[key]) {
          transformed.push({
            Year: row.year,
            Pollutant: key.toUpperCase(),
            Value: +row[key]
          });
        }
      });
    });

    const years = [...new Set(transformed.map(d => d.Year))].sort();
    const pollutants = [...new Set(transformed.map(d => d.Pollutant))];

    // Create a matrix of year vs pollutants
    const dataByYear = years.map(year => {
      const row = { year };
      pollutants.forEach(p => {
        const entry = transformed.find(d => d.Year == year && d.Pollutant === p);
        row[p] = entry ? entry.Value : 0;
      });
      return row;
    });

    // === Calculate statistics to display in dashboard cards ===
    const totalEmission = d3.sum(transformed, d => d.Value);
    const avgEmission = (totalEmission / years.length).toFixed(2);

    // Updated Highest Emissions Year logic based on current filters
    const emissionsByYear = d3.rollups(
      transformed,
      v => d3.sum(v, d => d.Value),
      d => d.Year
    );
    const [yearMax, maxVal] = emissionsByYear.reduce((a, b) => (b[1] > a[1] ? b : a));

    // Most dominant pollutant in selected dataset
    const emissionsByPollutant = d3.rollups(
      transformed,
      v => d3.sum(v, d => d.Value),
      d => d.Pollutant
    );
    const [topPollutant, topValue] = emissionsByPollutant.reduce((a, b) => (b[1] > a[1] ? b : a));

    // Inject values into dashboard stat cards
    document.getElementById("totalEmission").textContent = totalEmission.toFixed(2) + " tonnes";
    document.getElementById("avgEmission").textContent = avgEmission + " tonnes";
    document.getElementById("yearMax").textContent = yearMax;
    document.getElementById("topPollutant").textContent = topPollutant;

    // === Stream Chart Rendering ===
    const stack = d3.stack().keys(pollutants).offset(d3.stackOffsetWiggle);
    const series = stack(dataByYear);

    const margin = { top: 30, right: 30, bottom: 30, left: 40 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(years).range([0, width]);
    const y = d3.scaleLinear()
      .domain([
        d3.min(series, layer => d3.min(layer, d => d[0])),
        d3.max(series, layer => d3.max(layer, d => d[1]))
      ])
      .range([height, 0]);

    const color = d3.scaleOrdinal().domain(pollutants).range(d3.schemeSet2);

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);

    // Tooltip setup
    const tooltip = d3.select("#chart")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "6px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Draw the stream layers
    svg.selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", d => color(d.key))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("d", area)
      .attr("opacity", 0)
      .on("mouseover", function (event, d) {
        tooltip.style("opacity", 1);
        d3.select(this).attr("opacity", 1);
      })
      .on("mousemove", function (event, d) {
        const [mouseX] = d3.pointer(event);
        const index = Math.round((mouseX / width) * (years.length - 1));
        const year = years[index] || "";
        const value = d[index] ? (d[index][1] - d[index][0]).toFixed(2) : "N/A";

        tooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 20) + "px")
          .html(`<strong>${d.key}</strong><br>Year: ${year}<br>Emission: ${value}`);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
        d3.select(this).attr("opacity", 0.8);
      })
      .transition()
      .duration(1000)
      .attr("opacity", 0.8);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y));

    // Legend setup
    const legend = svg.append("g").attr("transform", `translate(${width - 100}, 0)`);
    pollutants.forEach((pollutant, i) => {
      legend.append("rect")
        .attr("x", 0)
        .attr("y", i * 20)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color(pollutant));
      legend.append("text")
        .attr("x", 20)
        .attr("y", i * 20 + 10)
        .text(pollutant)
        .attr("font-size", "12px")
        .attr("fill", "#333");
    });

    console.log("✅ Stream Chart rendered with updated stats");
  }
})();
