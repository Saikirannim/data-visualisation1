if (!chartData || chartData.length === 0) {
    d3.select("#chart").append("p").text("Data not loaded yet.");
  } else {
    const table = d3.select("#chart").append("table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");
  
    // Headers
    thead.append("tr")
      .selectAll("th")
      .data(Object.keys(chartData[0]))
      .enter()
      .append("th")
      .text(d => d);
  
    // Rows
    chartData.forEach(row => {
      const tr = tbody.append("tr");
      Object.values(row).forEach(val => {
        tr.append("td").text(val);
      });
    });
  }
  