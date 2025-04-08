const margin = { top: 20, right: 30, bottom: 30, left: 40 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleTime()
  .domain(d3.extent(chartData, d => d.date))
  .range([0, width]);

const y = d3.scaleLinear()
  .domain([0.5, d3.max(chartData, d => d.value)])
  .range([height, 0]);

svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
svg.append("g").call(d3.axisLeft(y));

const area = d3.area()
  .x(d => x(d.date))
  .y0(height)
  .y1(d => y(d.value));

svg.append("path")
  .datum(chartData)
  .attr("fill", "lightgreen")
  .attr("stroke", "green")
  .attr("stroke-width", 2)
  .attr("d", area);
