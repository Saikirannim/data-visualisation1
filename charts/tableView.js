// Inject CSS dynamically using JS
const style = document.createElement("style");
style.textContent = `
  #chart table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 0 6px rgba(0,0,0,0.05);
  }
  #chart th, #chart td {
    border: 1px solid #ccc;
    padding: 10px 14px;
    text-align: center;
    font-size: 14px;
  }
  #chart th {
    background-color: #f0f0f0;
    font-weight: 600;
    color: #333;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  #chart tbody tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  #chart tbody tr:hover {
    background-color: #f1f1f1;
    cursor: pointer;
  }
  body.dark #chart table {
    background: #1e1e1e;
    color: #ddd;
  }
  body.dark #chart th {
    background-color: #333;
    color: #fff;
  }
  body.dark #chart td {
    border-color: #444;
  }
  body.dark #chart tbody tr:hover {
    background-color: #2a2a2a;
  }
`;
document.head.appendChild(style);

(function () {
  if (typeof chartData !== 'undefined' && chartData.length > 0) {
    const columns = Object.keys(chartData[0]);

    const controls = d3.select("#chart")
      .append("div")
      .attr("class", "table-controls")
      .style("margin", "10px 0");

    controls.append("button")
      .text("⬇️ Export as CSV")
      .style("margin-right", "10px")
      .on("click", downloadCSV);

    controls.append("button")
      .text("🌓 Toggle Dark Mode")
      .on("click", () => {
        document.body.classList.toggle("dark");
      });

    const table = d3.select("#chart").append("table");

    table.append("thead").append("tr")
      .selectAll("th")
      .data(columns)
      .join("th")
      .text(d => d.toUpperCase());

    const tbody = table.append("tbody");
    chartData.forEach(row => {
      tbody.append("tr")
        .selectAll("td")
        .data(columns.map(c => row[c]))
        .join("td")
        .text(d => d);
    });

    function downloadCSV() {
      const rows = document.querySelectorAll("#chart table tr");
      let csv = [];
      rows.forEach(row => {
        const cols = row.querySelectorAll("th, td");
        const rowData = Array.from(cols).map(cell => `"${cell.innerText}"`);
        csv.push(rowData.join(","));
      });
      const blob = new Blob([csv.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "air_pollution_data.csv";
      a.click();
    }
  }
})();
