(function () {
  if (typeof chartData !== "undefined" && chartData.length > 0) {
    let selectedStreamFuel = "all";
    let selectedStreamPollutant = "all";

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

    // Pollutant Select
    const pollutantSelect = filterDiv.append("select")
      .attr("id", "streamPollutantSelect")
      .style("padding", "6px");

    pollutantSelect.append("option").attr("value", "all").text("All Pollutants");
    const pollutantKeys = ["pm10", "pm2_5", "co", "nox", "so2"];
    pollutantKeys.forEach(pollutant => {
      pollutantSelect.append("option")
        .attr("value", pollutant)
        .text(pollutant.toUpperCase());
    });

    // Fuel Select (dynamic from CSV's 'fuel' column)
    const fuelSelect = filterDiv.append("select")
      .attr("id", "streamFuelSelect")
      .style("padding", "6px");

    fuelSelect.append("option").attr("value", "all").text("All Fuels");

    const fuelTypes = [...new Set(chartData.map(d => d.fuel).filter(f => f && f.trim() !== ""))];
    fuelTypes.forEach(fuel => {
      fuelSelect.append("option")
        .attr("value", fuel)
        .text(fuel);
    });

    pollutantSelect.on("change", function () {
      selectedStreamPollutant = this.value;
      renderStreamChart();
    });

    fuelSelect.on("change", function () {
      selectedStreamFuel = this.value;
      renderStreamChart();
    });

    renderStreamChart(); // Initial Draw

    function renderStreamChart() {
      chartWrapper.selectAll("svg").remove();
      chartContainer.selectAll(".tooltip").remove();

      const filtered = selectedStreamFuel === "all"
        ? chartData
        : chartData.filter(d =>
            d.fuel && d.fuel.trim().toLowerCase() === selectedStreamFuel.trim().toLowerCase()
          );

      const allYears = [...new Set(filtered.map(d => d.year))].sort();

      const activePollutants = selectedStreamPollutant === "all"
        ? pollutantKeys
        : [selectedStreamPollutant];

      // Transform data for Streamgraph
      const transformed = [];
      filtered.forEach(row => {
        activePollutants.forEach(key => {
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

      const dataByYear = years.map(year => {
        const row = { year };
        pollutants.forEach(p => {
          const entry = transformed.find(d => d.Year == year && d.Pollutant === p);
          row[p] = entry ? entry.Value : 0;
        });
        return row;
      });

      const stack = d3.stack()
        .keys(pollutants)
        .offset(d3.stackOffsetWiggle);

      const series = stack(dataByYear);

      const margin = { top: 30, right: 100, bottom: 30, left: 50 },
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

      // Create a wrapper div for the SVG
      const svgWrapper = chartWrapper.append("div")
        .style("width", "100%")
        .style("display", "flex")
        .style("justify-content", "center");
      
      const svg = svgWrapper.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("max-width", "100%")
        .style("height", "auto")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scalePoint()
        .domain(years)
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([
          d3.min(series, layer => d3.min(layer, d => d[0])),
          d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([height, 0]);

      const color = d3.scaleOrdinal()
        .domain(pollutants)
        .range(d3.schemeSet2);

      const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

      const tooltip = chartContainer.append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0);

      svg.selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", d => color(d.key))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .attr("d", area)
        .attr("opacity", 0.8)
        .on("mouseover", function (event, d) {
          tooltip.style("opacity", 1);
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
        });

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));

      const legend = svg.append("g").attr("transform", `translate(${width + 10}, 0)`);
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
          .text("Understanding the Air Pollutant Emissions Stream Chart")
          .style("margin-top", "0")
          .style("margin-bottom", "10px")
          .style("color", "#333")
          .style("font-size", "16px");

        descriptionContainer.append("p")
          .html(`This stream chart visualizes the trends in air pollutant emissions from 2012 to 2019. 
                Each colored stream represents a different pollutant type, with the width of each stream 
                showing the relative amount of emissions for that pollutant over time.`)
          .style("margin-bottom", "10px")
          .style("color", "#555");

        const features = descriptionContainer.append("ul")
          .style("margin", "10px 0")
          .style("padding-left", "20px")
          .style("color", "#555");

        features.append("li")
          .html(`The organic, flowing shape helps visualize changes in proportions 
                over time. The thicker the stream, the higher the emissions for that pollutant.`);

        features.append("li")
          .html(`Use the dropdown menus to filter by specific pollutants 
                (PM10, PM2.5, CO, NOx, SO2) or fuel types (petrol, diesel, coal, etc.). Select "All" to see 
                the complete picture.`);

        features.append("li")
          .html(`Hover over any part of the chart to see detailed emission 
                values for specific pollutants at specific years.`);

        descriptionContainer.append("p")
          .html(`This visualization is particularly useful for identifying emission trends, seasonal patterns, 
                and comparing the relative contributions of different pollutants. The smooth transitions help 
                spot gradual changes in emission patterns over the years.`)
          .style("margin-top", "10px")
          .style("margin-bottom", "0")
          .style("color", "#555");
      }
    }
  }
})();
