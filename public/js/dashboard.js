document.addEventListener('DOMContentLoaded', function() {
    let stockData;

    // Performance optimization: Debounce zoom function
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Set up dimensions
    const margin = { 
        top: 30, 
        right: 70,
        bottom: 60,
        left: 100 
    };
    
    // Get container width
    const container = document.querySelector('#stockChart');
    const containerWidth = container.clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const volumeHeight = 100;

    // Create SVG containers
    const stockSvg = d3.select('#stockChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const volumeSvg = d3.select('#volumeChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', volumeHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleTime().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);
    const volumeScale = d3.scaleLinear().range([volumeHeight, 0]);

    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 5])
        .extent([[0, 0], [width, height]])
        .on('zoom', zoomed);

    // Add zoom behavior to stock chart
    stockSvg.append('rect')
        .attr('class', 'zoom-panel')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .call(zoom);

    // Add clip path
    stockSvg.append('defs').append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);

    // Create groups for chart elements
    const stockGroup = stockSvg.append('g')
        .attr('clip-path', 'url(#clip)');

    async function fetchData() {
        try {
            const response = await fetch('/api/tesla-data');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            stockData = data.map(d => ({
                date: new Date(d.date),
                open: +d.open,
                high: +d.high,
                low: +d.low,
                close: +d.close,
                volume: +d.volume
            })).sort((a, b) => a.date - b.date);

            updateCharts();
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to load data');
        }
    }

    function updateCharts() {
        // Update scales
        xScale.domain(d3.extent(stockData, d => d.date));
        yScale.domain([
            d3.min(stockData, d => d.low) * 0.95,
            d3.max(stockData, d => d.high) * 1.05
        ]);
        volumeScale.domain([0, d3.max(stockData, d => d.volume)]);

        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.close));

        // Create area generator
        const area = d3.area()
            .x(d => xScale(d.date))
            .y0(height)
            .y1(d => yScale(d.close));

        // Update stock chart
        stockGroup.selectAll('*').remove();
        
        // Add area
        stockGroup.append('path')
            .datum(stockData)
            .attr('class', 'area')
            .attr('d', area);

        // Add line
        stockGroup.append('path')
            .datum(stockData)
            .attr('class', 'line')
            .attr('d', line);

        // Add axes
        stockSvg.selectAll('.axis').remove();
        
        stockSvg.append('g')
            .attr('class', 'x-axis axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        stockSvg.append('g')
            .attr('class', 'y-axis axis')
            .call(d3.axisLeft(yScale));

        // Update volume chart
        volumeSvg.selectAll('*').remove();

        volumeSvg.selectAll('rect')
            .data(stockData)
            .enter()
            .append('rect')
            .attr('class', 'volume-bar')
            .attr('x', d => xScale(d.date))
            .attr('y', d => volumeScale(d.volume))
            .attr('width', width / stockData.length * 0.8)
            .attr('height', d => volumeHeight - volumeScale(d.volume));

        volumeSvg.append('g')
            .attr('class', 'x-axis axis')
            .attr('transform', `translate(0,${volumeHeight})`)
            .call(d3.axisBottom(xScale));

        volumeSvg.append('g')
            .attr('class', 'y-axis axis')
            .call(d3.axisLeft(volumeScale));

        // Update stock information
        updateStockInfo();
    }

    function zoomed(event) {
        const newX = event.transform.rescaleX(xScale);
        const newY = event.transform.rescaleY(yScale);

        // Update axes
        stockSvg.select('.x-axis').call(d3.axisBottom(newX));
        stockSvg.select('.y-axis').call(d3.axisLeft(newY));

        // Update line and area
        stockGroup.select('.line')
            .attr('d', d3.line()
                .x(d => newX(d.date))
                .y(d => newY(d.close))
            );

        stockGroup.select('.area')
            .attr('d', d3.area()
                .x(d => newX(d.date))
                .y0(height)
                .y1(d => newY(d.close))
            );
    }

    // Add reset zoom button
    d3.select('#stockChart')
        .append('button')
        .attr('class', 'zoom-reset')
        .text('Reset Zoom')
        .on('click', () => {
            stockSvg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });

    // Initialize
    fetchData();

    // Handle window resize
    window.addEventListener('resize', debounce(() => {
        const newWidth = container.clientWidth - margin.left - margin.right;
        
        // Update SVG dimensions
        d3.select('#stockChart svg')
            .attr('width', newWidth + margin.left + margin.right);
        
        d3.select('#volumeChart svg')
            .attr('width', newWidth + margin.left + margin.right);

        // Update scales
        xScale.range([0, newWidth]);
        
        // Update charts
        updateCharts();
    }, 250));

    // Add this new function to update stock information
    function updateStockInfo() {
        const latestData = stockData[stockData.length - 1];
        const previousData = stockData[stockData.length - 2];
        
        const priceChange = latestData.close - previousData.close;
        const percentChange = (priceChange / previousData.close) * 100;
        
        // Format numbers
        const formatPrice = d3.format("$,.2f");
        const formatPercent = d3.format("+.2f");
        const formatVolume = d3.format(",.0f");
        
        // Update current price
        document.getElementById('currentPrice').innerHTML = `
            <div class="info-label">Current Price</div>
            <div class="info-value">${formatPrice(latestData.close)}</div>
        `;
        
        // Update price change
        const priceChangeElement = document.getElementById('priceChange');
        priceChangeElement.innerHTML = `
            <div class="info-label">Change (24h)</div>
            <div class="info-value">
                ${formatPrice(priceChange)} (${formatPercent(percentChange)}%)
            </div>
        `;
        priceChangeElement.className = `price-change ${priceChange >= 0 ? 'positive' : 'negative'}`;
        
        // Update volume
        document.getElementById('volume').innerHTML = `
            <div class="info-label">Volume</div>
            <div class="info-value">${formatVolume(latestData.volume)}</div>
        `;

        // Add high/low information
        document.getElementById('highLow').innerHTML = `
            <div class="info-label">Day Range</div>
            <div class="info-value">
                ${formatPrice(latestData.low)} - ${formatPrice(latestData.high)}
            </div>
        `;
    }
}); 