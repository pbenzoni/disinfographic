document.addEventListener('DOMContentLoaded', function () {
    // Hashtags Chart
    fetch('/api/hashtags')
        .then(response => response.json())
        .then(data => {
            let topHashtags = data.slice(0, 20);
            createHashtagsChart(topHashtags);
        });

    // Influencers Chart
    fetch('/api/influencers')
        .then(response => response.json())
        .then(data => {
            let topInfluencers = data.slice(0, 20);
            createInfluencersChart(topInfluencers);
        });

    // Timeline Chart
    fetch('/api/timeline')
        .then(response => response.json())
        .then(data => {
            createTimelineChart(data);
        });
});

// Function to create Hashtags Chart
function createHashtagsChart(data) {
    let svgWidth = 800, svgHeight = 500;
    let svg = d3.select("#hashtags-chart").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    let margin = { top: 20, right: 20, bottom: 150, left: 60 },
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;

    let g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleBand()
        .domain(data.map(d => d.hashtag))
        .range([0, width])
        .padding(0.1);

    let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .nice()
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(y));

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.hashtag))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count));
}

// Function to create Influencers Chart
function createInfluencersChart(data) {
    let svgWidth = 800, svgHeight = 500;
    let svg = d3.select("#influencers-chart").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    let margin = { top: 20, right: 20, bottom: 150, left: 60 },
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;

    let g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleBand()
        .domain(data.map(d => d.user))
        .range([0, width])
        .padding(0.1);

    let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.followers)])
        .nice()
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -5)
        .attr("x", -height / 2)
        .attr("dy", ".35em")
        .style("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(y));

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.user))
        .attr("y", d => y(d.followers))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.followers));
}

// Function to create Timeline Chart
function createTimelineChart(data) {
    let svgWidth = 800, svgHeight = 500;
    let svg = d3.select("#timeline-chart").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    let margin = { top: 20, right: 20, bottom: 50, left: 60 },
        width = svgWidth - margin.left - margin.right,
        height = svgHeight - margin.top - margin.bottom;

    let g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse the date / time
    let parseDate = d3.timeParse("%Y-%m-%d");

    data.forEach(d => {
        d.date = parseDate(d.date);
        d.count = +d.count;
    });

    let x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0]);

    let line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.count));

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));

    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);
}