"use strict";
   
(function () {
   const subColours = {
      "Energy (combustion)": {
         "root": "#FF9500",
         "Agriculture/forestry/fishing": "#FF7700",
         "Commercial/institutional": "#ECB500",
         "Energy industries": "#F0BD75",
         "Manufacturing industries and construction": "#B97500",
         "Residential": "#D47C00"
      },
      "Transport": {
         "root": "#AF52DE",
         "Aviation": "#7543D9",
         "Railways": "#EC7CB6",
         "Road transportation": "#AF94BD",
         "Shipping": "#4F2F5F"
      },
      "Construction (non-combustion)": {
         "root": "#007AFF",
         "Non-residential buildings": "#0087D4",
         "Residential houses": "#2C42BC",
         "Residential other": "#6253D7",
         "Road construction": "#004691"
      },
      "Road dust": {
         "root": "#756410",
         "Sealed roads": "#9B6F18",
         "Unsealed roads": "#755810"
      },
      "Industrial (non-combustion)": {
         "root": "#FB3B00",
         "Metal industries": "#B43F00",
         "Mineral products": "#FF8560",
         "Production of chemicals": "#E85428",
         "Pulp and paper production": "#E85428"
      },
      "Agriculture": {
         "root": "#34C759",
         "Animal housing": "#3EE396",
         "Field burning of agricultural residues": "#85C734"
      },
      "Biomass burning": {
         "root": "#167531",
         "Controlled burning": "#617D46",
         "Wildfires": "#167551"
      },
      "Waste": {
         "root": "#671675",
         "Open burning (garden waste)": "#4E1E7A",
         "Waste incineration": "#70367A"
      },
   }
   
   const ringOffsets = [
      0, -15, 5, 10, 15, 10, 5
   ];
   
   const width = 500;
   const height = 500; 
   const ringPadding = 5;
   const sizeOffset = 100;
   const maxDepth = 4;
   const textMargin = 40;
   const centreRadius = 25;
   
   const tau = 2 * Math.PI;
   const radius = (Math.min(width, height) / 2) - sizeOffset;    
   
   function setupData() {
      const rows = chartData
         .filter(a => a.year == "2019");
         
      const grouped = d3.group(
         rows, 
         d => d.sector, 
         d => d.class, 
         d => d.sub_class,
         d => d.fuel
      );
      
      const data = d3.hierarchy(grouped)
         .sum(d => [d.nox, d.pm2_5, d.co, d.pm10, d.so2]
               .map(a => parseFloat(a) || 0)
               .reduce((a, b) => a + b, 0)
         )
         .eachAfter(d => computeValues(d));
      
      d3.partition().size([tau, radius])(data);      
      return data;
   }
   
   function setupSvg() {
      // Create a centered wrapper like the treemap
      const chartContainer = d3.select("#chart");
      
      const chartWrapper = chartContainer.append("div")
         .style("width", `${width}px`)
         .style("margin", "0 auto");
      
      return chartWrapper.append("svg")
         .attr("class", "sunburst")
         .attr("viewBox", `0 0 ${width} ${height}`)
         .append("g")
         .attr(
               "transform", 
               `translate(${width / 2},${textMargin + (height / 2)})`
         );
   }
   
   function getColour(d) {
      let parent, child;
      
      if (d.depth == 0) {
         return "";
      }
      else if (d.depth == 1) {
         return subColours[d.data[0]]["root"];
      }
      
      while (d.depth > 0) {
         if (d.depth == 1) parent = d.data[0];
         if (d.depth == 2) child = d.data[0]; 
      
         d = d.parent; 
      }
      
      return subColours[parent][child];
   }
   
   function addClickTargets(paths) {
      paths.filter(d => d.depth <= maxDepth - 1)
         .attr("class", "arcPart clickableArc")
         .on("click", onClick);
   }
   
   function onClick(_, p) {
      const pWidth = p.x1 - p.x0;
      let cachedPath;
   
      centre
         .datum(p?.parent)
         .attr("r", centreRadius + ringOffsets[p.depth + 1]);
         
      paths.each(d => {
         const depth = p.depth * (d.y1 - d.y0);
         
         d.target = { 
               depth: d.depth,
               x0: clamp(0, (d.x0 - p.x0) / pWidth, 1) * tau,
               x1: clamp(0, (d.x1 - p.x0) / pWidth, 1) * tau,
               y0: clamp(0,  d.y0 - depth, radius),
               y1: clamp(0, d.y1 - depth, radius)	
         }
      })
         .transition()
         .duration(150)
         .tween("", d => t => d.current = d3.interpolate(d.current, d.target)(t))
         .attrTween("d", d => () => {
               const path = arc(d.current);
               if (path.includes("NaN")) return cachedPath;
               cachedPath = path;
               return path;
         });
         
      addText(p);
      addNav(p);
   }
   
   function addText(textRoot) {
      const arcOffset = (textRoot.depth * -30) + (sizeOffset / 2);
      const textArc = d3.arc()
         .startAngle(d => d.x0)
         .endAngle(d => d.x1)
         .padAngle(() => 0.002)
         .innerRadius(radius + arcOffset)
         .outerRadius(radius + arcOffset); 
   
      d3.select(".textContainer")?.remove();
      
      const textContainer = svg.append("g")
         .attr("class", "textContainer");
      
      let prevX = 0, prevY = 0;
      
      for (const d of textRoot.children) {
         let [x, y] =  textArc.centroid(d.target || d.current);
         let dist = Math.sqrt( 
               Math.pow(prevX - x, 2) + Math.pow(prevY - y, 2)
         );
         
         if (dist < 80) {
               if (x < 0) {
                  y -= d.depth < 4 ? 20 : 40;
               }
               else {
                  y += d.depth < 4 ? 20 : 40;
               }
         }
         
         const parent = textContainer.append("g")
               .datum(d)
               .attr("fill", getColour(d))
               .on("click", onClick)
               .attr("transform", `translate(${x},${y})`);
         
         const lines = d.depth < 4 ? 
               d.data[0].split(" ") :
               [d.data[0]];
         let offset = (lines.length / 2) * -1;
         
         for (let i = 0; i < lines.length; i++) {
               let line = lines[i];
               
               if (line.length < 4 && i != lines.length - 1) {
                  line += " " + lines[i + 1]
                  i += 1;
               }
               
               parent.append("text")
                  .attr("dy", `${0.1 + offset}em`)
                  .text(line);
               
               offset += 1;
         }
         
         parent.append("text")
               .attr("dy", `${0.3 + offset}em`)
               .attr("class", "percentage")
               .text(`${d.percentage.toFixed(2)}%`);
               
         prevX = x, prevY = y;
      }
   }
   
   function addNav(navRoot) {
      d3.select(".navContainer")?.remove();
      
      const x = (width / 2) * -1
      const y = ((height / 2) * -1) - textMargin;
      
      const navContainer = svg.append("g")
         .attr("class", "navContainer")
         .attr("transform", `translate(${x},${y})`);
      
      let offset = 1;
         
      for (const ancestor of navRoot.ancestors().toReversed()) {
         navContainer.append("text")
            .attr("dy", `${offset}em`)
            .text(ancestor.data[0] || "Air pollutants")
            .datum(ancestor)
            .style("fill", getColour)
            .on("click", onClick);
         
         offset += 1.2;
      }
   }
   
   function computeValues(d) {
      d.current = d;
      
      if (d.parent) {
         d.percentage = (d.value / d.parent.value) * 100;
      }
   }
   
   function clamp(min, val, max) {
      return Math.max(min, Math.min(max, val));
   }
   
   const data = setupData();
   const svg = setupSvg();
      
   const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(() => 0.002)
      .innerRadius(d => {
         let k = ringOffsets[d.depth] + ringPadding;
         return d.y0 + k
      })
      .outerRadius(d => {
         let k = ringOffsets[d.depth + 1];
         return d.y1 + k
      });
      
   const filtered = data.descendants().filter(d => d.depth <= maxDepth);
   const paths = svg.selectAll("path")
      .data(filtered)
      .enter()
      .append("path")
      .attr("d", d => arc(d.current))
      .attr("data-depth", d => d.depth)
      .attr("class", "arcPart")
      .style("fill", getColour);
      
   const centre = svg.append("circle")
      .datum(data)
      .attr("class", "centre")
      .attr("r", centreRadius)
      .on("click", onClick);
   
   addText(data);
   addNav(data);
   addClickTargets(paths);

   // Add description text after the chart (only if it doesn't exist)
   let descriptionContainer = d3.select("#chart").select(".chart-description");
   
   if (descriptionContainer.empty()) {
      descriptionContainer = d3.select("#chart").append("div")
         .attr("class", "chart-description")
         .style("margin-top", "20px")
         .style("padding", "15px")
         .style("background-color", "#f8f9fa")
         .style("border-radius", "8px")
         .style("font-family", "'Segoe UI', system-ui, sans-serif")
         .style("line-height", "1.6");

      descriptionContainer.append("h3")
         .text("Understanding the Air Pollutant Emissions Donut Chart")
         .style("margin-top", "0")
         .style("margin-bottom", "10px")
         .style("color", "#333")
         .style("font-size", "16px");

      descriptionContainer.append("p")
         .html(`This interactive donut chart visualization displays air pollutant emissions for 2019, 
               organized hierarchically by sectors and sub-sectors. The visualization has four levels:`)
         .style("margin-bottom", "10px")
         .style("color", "#555");

      const list = descriptionContainer.append("ul")
         .style("margin", "10px 0")
         .style("padding-left", "20px")
         .style("color", "#555");

      list.append("li")
         .html(`<strong>Level 1 (Sectors):</strong> The outermost ring shows major emission sources like 
               Energy, Transport, Agriculture, etc. Each segment's size represents its percentage of total emissions.`);

      list.append("li")
         .html(`<strong>Level 2 (Classes):</strong> Click on any sector to see its classes (e.g., Road transportation, Aviation 
               within the Transport sector).`);

      list.append("li")
         .html(`<strong>Level 3 (Sub-classes):</strong> Click further to drill down into sub-classes for more detailed 
               emission sources.`);

      list.append("li")
         .html(`<strong>Level 4 (Fuel types):</strong> The deepest level shows the specific fuel types used in combustion sources.`);

      descriptionContainer.append("p")
         .html(`Click on any arc to drill down into its sub-categories. Click the center circle or use the navigation 
               breadcrumbs in the top-left corner to navigate back up the hierarchy.`)
         .style("margin-top", "10px")
         .style("margin-bottom", "0")
         .style("color", "#555");
   }
})();