(function () {
  if (typeof chartData !== "undefined" && chartData.length > 0) {
    const selectedPollutant = document.getElementById("pollutantSelect").value;
    const selectedFuel = document.getElementById("fuelSelect")?.value || "all";

    const pollutantKeys = ["pm10", "pm2_5", "co", "nox", "so2"];
    const activeKeys = selectedPollutant === "all" ? pollutantKeys : [selectedPollutant];

    const filtered = chartData.filter(d => selectedFuel === "all" || d.fuel === selectedFuel);
    const allYears = [...new Set(filtered.map(d => d.year))].sort();

    const grouped = {};
    activeKeys.forEach(pollutant => {
      grouped[pollutant.toUpperCase()] = allYears.map(year => {
        const yearData = filtered.filter(d => d.year === year);
        const total = d3.sum(yearData, d => +d[pollutant] || 0);
        return [year, total];
      });
    });

    const margin = { top: 40, right: 100, bottom: 40, left: 60 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
      .append("svg")
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

    const tooltip = d3.select("#chart")
      .append("div")
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
})();
