document.addEventListener('DOMContentLoaded', function() {
    let stockData;
    let width;
    let currentTimeRange = 'ALL';

    // Set up dimensions
    const margin = { 
        top: 40,
        right: 90,
        bottom: 60,
        left: 90
    };
    
    // Get container width
    const container = document.querySelector('#stockChart');
    width = container.clientWidth - margin.left - margin.right;
    const height = 500;
    const volumeHeight = 150;

    // Create SVG containers
    const stockSvg = d3.select('#stockChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const stockGroup = stockSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const volumeSvg = d3.select('#volumeChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', volumeHeight + margin.top + margin.bottom);

    const volumeGroup = volumeSvg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Create scales
    const xScale = d3.scaleTime().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);
    const volumeScale = d3.scaleLinear().range([volumeHeight, 0]);

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .extent([[0, 0], [width, height]])
        .on('zoom', zoomed);

    stockSvg.call(zoom);

    function zoomed(event) {
        const newXScale = event.transform.rescaleX(xScale);
        stockGroup.selectAll('.line')
            .attr('d', d3.line()
                .x(d => newXScale(d.date))
                .y(d => yScale(d.close))
                .curve(d3.curveMonotoneX));
                
        stockGroup.selectAll('.area')
            .attr('d', d3.area()
                .x(d => newXScale(d.date))
                .y0(height)
                .y1(d => yScale(d.close))
                .curve(d3.curveMonotoneX));

        stockGroup.selectAll('.x-axis').call(d3.axisBottom(newXScale));
        
        // Update data points
        stockGroup.selectAll('.data-point')
            .attr('cx', d => newXScale(d.date));
    }

    // Add event listeners for filters
    document.getElementById('timeRange').addEventListener('change', function(e) {
        currentTimeRange = e.target.value;
        filterData();
    });

    function filterData() {
        if (!stockData) return;

        let filteredData = [...stockData];
        const now = new Date();

        switch(currentTimeRange) {
            case '1M':
                filteredData = stockData.filter(d => 
                    d.date >= d3.timeMonth.offset(now, -1));
                break;
            case '3M':
                filteredData = stockData.filter(d => 
                    d.date >= d3.timeMonth.offset(now, -3));
                break;
            case '6M':
                filteredData = stockData.filter(d => 
                    d.date >= d3.timeMonth.offset(now, -6));
                break;
            case '1Y':
                filteredData = stockData.filter(d => 
                    d.date >= d3.timeYear.offset(now, -1));
                break;
        }

        updateCharts(filteredData);
    }

    function updateCharts(data = stockData) {
        if (!data || data.length === 0) {
            showError('No data available to display');
            return;
        }

        // Clear previous content
        stockGroup.selectAll('*').remove();
        volumeGroup.selectAll('*').remove();

        // Update scales
        xScale.domain(d3.extent(data, d => d.date));
        yScale.domain([
            d3.min(data, d => d.low) * 0.95,
            d3.max(data, d => d.high) * 1.05
        ]);
        volumeScale.domain([0, d3.max(data, d => d.volume)]);

        // Add area
        const area = d3.area()
            .x(d => xScale(d.date))
            .y0(height)
            .y1(d => yScale(d.close))
            .curve(d3.curveMonotoneX);

        stockGroup.append('path')
            .datum(data)
            .attr('class', 'area')
            .attr('d', area);

        // Add line
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.close))
            .curve(d3.curveMonotoneX);

        stockGroup.append('path')
            .datum(data)
            .attr('class', 'line')
            .attr('d', line);

        // Add data points
        stockGroup.selectAll('.data-point')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.close))
            .attr('r', 3)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                    
                tooltip.html(`
                    <div class="tooltip-date">${d3.timeFormat("%B %d, %Y")(d.date)}</div>
                    <div class="tooltip-price">
                        <div>Open: $${d.open.toFixed(2)}</div>
                        <div>High: $${d.high.toFixed(2)}</div>
                        <div>Low: $${d.low.toFixed(2)}</div>
                        <div>Close: $${d.close.toFixed(2)}</div>
                        <div>Volume: ${d3.format(",")(d.volume)}</div>
                    </div>
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 3);
                    
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Add axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(width > 800 ? 10 : 5)
            .tickFormat(d3.timeFormat("%b %d, %Y"));

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => `$${d3.format(",.2f")(d)}`);

        stockGroup.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        stockGroup.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Add labels
        stockGroup.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 20)
            .attr('x', -height/2)
            .attr('text-anchor', 'middle')
            .text('Price (USD)');

        // Add volume bars
        volumeGroup.selectAll('.volume-bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'volume-bar')
            .attr('x', d => xScale(d.date))
            .attr('y', d => volumeScale(d.volume))
            .attr('width', Math.max(1, width / data.length * 0.8))
            .attr('height', d => volumeHeight - volumeScale(d.volume))
            .attr('fill', (d, i) => {
                if (i === 0) return '#90CAF9';
                return d.close > data[i - 1].close ? '#4CAF50' : '#EF5350';
            });

        // Add volume axes
        volumeGroup.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${volumeHeight})`)
            .call(d3.axisBottom(xScale)
                .ticks(width > 800 ? 10 : 5)
                .tickFormat(d3.timeFormat("%b %d, %Y")))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        volumeGroup.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(volumeScale)
                .tickFormat(d => {
                    const format = d3.format('.2s');
                    return format(d).replace(/G/, 'B');
                }));

        // Add volume label
        volumeGroup.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 20)
            .attr('x', -volumeHeight/2)
            .attr('text-anchor', 'middle')
            .text('Volume');

        updateStockInfo(data);
    }

    function showLoading() {
        const chartContainer = document.querySelector('.chart-container');
        const existingOverlay = chartContainer.querySelector('.loading-overlay');
        if (!existingOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading"></div>
                <div class="loading-text">Loading data...</div>
            `;
            chartContainer.appendChild(overlay);
        }
    }

    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    function showError(message) {
        const chartContainer = document.querySelector('.chart-container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const existingError = chartContainer.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        chartContainer.appendChild(errorDiv);
    }

    async function fetchData() {
        try {
            showLoading();
            const response = await fetch('/api/tesla-data');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error('No data received');
            }

            stockData = data.map(d => ({
                date: new Date(d.date),
                open: +d.open,
                high: +d.high,
                low: +d.low,
                close: +d.close,
                volume: +d.volume
            })).sort((a, b) => a.date - b.date);

            console.log('Data loaded:', stockData.length, 'records');
            updateCharts();
            
        } catch (error) {
            console.error('Error loading data:', error);
            showError(`Failed to load data: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    function updateStockInfo(data = stockData) {
        if (!data || data.length < 2) return;

        const latest = data[data.length - 1];
        const prev = data[data.length - 2];
        
        document.getElementById('currentPrice').innerHTML = `
            <div class="info-label">Current Price</div>
            <div class="info-value">$${latest.close.toFixed(2)}</div>
        `;

        const change = latest.close - prev.close;
        const percentChange = (change / prev.close) * 100;
        
        document.getElementById('priceChange').innerHTML = `
            <div class="info-label">Change</div>
            <div class="info-value ${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)} 
                (${change >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)
            </div>
        `;
        
        document.getElementById('volume').innerHTML = `
            <div class="info-label">Volume</div>
            <div class="info-value">${latest.volume.toLocaleString()}</div>
        `;
    }

    // Initialize
    fetchData();

    // Add window resize handler
    window.addEventListener('resize', () => {
        width = container.clientWidth - margin.left - margin.right;
        stockSvg.attr('width', width + margin.left + margin.right);
        volumeSvg.attr('width', width + margin.left + margin.right);
        xScale.range([0, width]);
        if (stockData) {
            updateCharts();
        }
    });
}); 