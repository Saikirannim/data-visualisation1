import "https://d3js.org/d3.v7.min.js";

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

async function setupData() {
    const rows = (await d3.csv("/data_set/air-pollutant-emissions-2012-2019.csv"))
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
            .map(a => parseInt(a) || 0)
            .reduce((a, b) => a + b, 0)
        )
        .each(d => computeValues(d));
    
    d3.partition().size([tau, radius])(data);
    
    return data;
}

function setupSvg() {
    return d3.select("svg")
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
        .duration(200)
        .tween("", d => t => d.current = d3.interpolate(d.current, d.target)(t))
        .attrTween("d", d => () => arc(d.current));
        
    addText(p);
    addNav(p);
}

function addText(textRoot) {
    //TODO: Hierarchical top label (see Figma design), also clickable
    
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
    
    if (d.children) {
        d.total = d.children
            .map(d => d.value)
            .reduce((a, b) => a + b, 0)
    }

    if (d.parent) {
        d.percentage = (d.value / d.parent.total) * 100;
    }
}

function clamp(min, val, max) {
    return Math.max(min, Math.min(max, val));
}

const data = await setupData();
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
