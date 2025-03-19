document.addEventListener('DOMContentLoaded', () => {
    // Clear previous content
    d3.select('#visualization').html('');
    
    const visualizationDiv = document.getElementById('visualization');
    
    // Create button
    const button = document.createElement('button');
    button.id = 'alertButton';
    button.textContent = 'Alert';
    button.style.marginBottom = '10px';
    button.addEventListener('click', function() {
        alert('Button clicked!');
    });
    
    // Add button to the visualization container
    visualizationDiv.appendChild(button);
    
    const data = [5, 10, 15, 20, 25];
    
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const xScale = d3.scaleBand()
        .domain(d3.range(data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data)])
        .range([height - margin.bottom, margin.top]);
    
    svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', (d, i) => xScale(i))
        .attr('y', d => yScale(d))
        .attr('height', d => height - margin.bottom - yScale(d))
        .attr('width', xScale.bandwidth())
        .attr('fill', 'steelblue');
    
    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));
    
    // Add Y axis
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));
});