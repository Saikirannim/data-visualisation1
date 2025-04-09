// Step 1: Extract years and pollutants
const years = Array.from(new Set(chartData.map(d => d.Year))).sort();
const pollutants = Array.from(new Set(chartData.map(d => d.Pollutant)));

// Step 2: Transform raw data into stacked-friendly format
const dataByYear = years.map(year => {
  const row = { year };
  pollutants.forEach(pollutant => {
    const entry = chartData.find(d => d.Year === year && d.Pollutant === pollutant);
    row[pollutant] = entry ? +entry.Value : 0;
  });
  return row;
});

// Step 3: Stack the data
const stack = d3.stack()
  .keys(pollutants)
  .offset(d3.stackOffsetWiggle); // <- stream graph effect

const series = stack(dataByYear);

// Step 4: Set up dimensions
const margin = { top: 20, right: 30, bottom: 40, left: 50 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

// Step 5: Create SVG
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Step 6: X and Y scales
const x = d3.scalePoint()
  .domain(years)
  .range([0, width]);

const y = d3.scaleLinear()
  .domain([
    d3.min(series, layer => d3.min(layer, d => d[0])),
    d3.max(series, layer => d3.max(layer, d => d[1]))
  ])
  .range([height, 0]);

// Step 7: Color scale
const color = d3.scaleOrdinal()
  .domain(pollutants)
  .range(d3.schemeCategory10);

// Step 8: Area generator
const area = d3.area()
  .x(d => x(d.data.year))
  .y0(d => y(d[0]))
  .y1(d => y(d[1]))
  .curve(d3.curveBasis);

// Step 9: Draw paths
svg.selectAll("path")
  .data(series)
  .enter()
  .append("path")
  .attr("d", area)
  .attr("fill", d => color(d.key))
  .attr("stroke", "#444")
  .attr("stroke-width", 0.5)
  .attr("opacity", 0.85)
  .on("mouseover", function () {
    d3.select(this).attr("opacity", 0.5);
  })
  .on("mouseout", function () {
    d3.select(this).attr("opacity", 0.85);
  });

// Step 10: Axes
svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(x));

svg.append("g")
  .call(d3.axisLeft(y));
