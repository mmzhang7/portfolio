import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';
let xScale, yScale;

let commitProgress = 100;

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // or just +row.line
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    data.sort((a, b) => a.datetime - b.datetime);
    
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            const additions = lines.filter(d => d.change === 'added').length;
            const deletions = lines.filter(d => d.change === 'removed').length;
            const netChange = additions - deletions;
            const files = [...new Set(lines.map(d => d.file))];
            const fileCount = files.length;
            const maxDepth = d3.max(lines, d => d.depth);
            const avgDepth = d3.mean(lines, d => d.depth);
            const maxLength = d3.max(lines, d => d.length);
            const avgLength = d3.mean(lines, d => d.length);
            const hour = datetime.getHours();
            const dayOfWeek = datetime.getDay();

            // Create the return object
            const ret = {
                id: commit,
                url: 'https://github.com/YOUR_REPO/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
                additions: additions,
                deletions: deletions,
                netChange: netChange,
                fileCount: fileCount,
                files: files,
                maxDepth: maxDepth,
                avgDepth: avgDepth,
                maxLength: maxLength,
                avgLength: avgLength,
                hour: hour,
                dayOfWeek: dayOfWeek,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6
            };

            // Add the lines array as a non-enumerable property
            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false
            });

            return ret;
        });
}

function getTimeOfDay(hour) {
    if (hour < 5 || hour >= 21) return 'Night 💤';
    if (hour < 12) return 'Morning 🌇';
    if (hour < 17) return 'Afternoon 🌤️';
    if (hour < 21) return 'Evening 🌆';
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Commits');
    dl.append('dd').text(commits.length);

    const files = d3.groups(data, d => d.file);
    const fileLengths = files.map(([file, lines]) => lines.length);

    dl.append('dt').text('# Files');
    dl.append('dd').text(files.length.toLocaleString());

    const maxFileLength = d3.max(fileLengths);
    const longestFile = files.find(([file, lines]) => lines.length === maxFileLength)[0];
    dl.append('dt').text('Longest File');
    dl.append('dd').html(`<span title="${longestFile}">${maxFileLength} lines</span>`);

    const avgFileLength = d3.mean(fileLengths);
    dl.append('dt').text('Mean File Length');
    dl.append('dd').text(`${Math.round(avgFileLength)} lines`);

    const avgLineLength = d3.mean(data, d => d.length);
    dl.append('dt').text('Mean Line Length');
    dl.append('dd').text(`${avgLineLength.toFixed(1)} chars`);

    const workByPeriod = d3.rollups(
        data,
        (v) => v.length,
        (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }),
    );
    const maxPeriod = d3.greatest(workByPeriod, d => d[1])?.[0];

    const periodEmoji = {
        morning: 'Morning 🌇',
        afternoon: 'Afternoon 🌤️',
        evening: 'Evening 🌆',
        night: 'Night 💤',
    };

    const match = maxPeriod?.toLowerCase().match(/^(at|in the)\s+(.*)$/i);
    const prefix = match ? match[1] : 'at';
    const period = match ? match[2].trim() : maxPeriod?.toLowerCase();

    const label = periodEmoji[period] || maxPeriod;

    dl.append('dt').text('Peak Work Time');
    dl.append('dd').text(`${prefix} ${label}`);
}


function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');


    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);


    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis')
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis')
        .call(yAxis);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt() // Change only this line
        .domain([minLines, maxLines])
        .range([5, 50]);
    const dots = svg.append('g').attr('class', 'dots');
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    dots
        .selectAll('circle')
        .data(sortedCommits, d => d.commit)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.6)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.6);
            updateTooltipVisibility(false);
        });
    createBrushSelector(svg, usableArea);

    svg.selectAll('.dots').raise();
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    time.textContent = commit.datetime?.toLocaleString('en', {
        timeStyle: 'short',
    });
    author.textContent = commit.author || 'Unknown';
    lines.textContent = commit.lines.length || 0;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.pageX}px`;
    tooltip.style.top = `${event.pageY}px`;
}

function createBrushSelector(svg, usableArea) {
    const brush = d3.brush()
        .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .on('start brush end', brushed);

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Raise dots and everything after overlay
    svg.selectAll('.dots, .overlay ~ *').raise();

}

function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function brushed(event) {
    const selection = event.selection;

    d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? commits.filter(d => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;

    return selectedCommits;
}

function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);

    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type,
    );

    // Update DOM with breakdown
    container.innerHTML = '';

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
            <dt>${language.toUpperCase()}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
}


let data = await loadData();
let commits = processCommits(data);

let filteredCommits;

let timeScale = d3
    .scaleTime()
    .domain([
        d3.min(commits, (d) => d.datetime),
        d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);
let commitMaxTime;


function onTimeSliderChange() {
    commitProgress = parseInt(this.value);
    commitMaxTime = timeScale.invert(commitProgress);

    const timeElement = document.getElementById('commit-time');
    timeElement.textContent = commitMaxTime.toLocaleString(undefined, {
        dateStyle: "long",
        timeStyle: "short"
    });

    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
}

// Initialize the slider and time display
function initTimeSlider() {
    const slider = document.getElementById('commit-progress');

    // Set initial value to 100 (max)
    slider.value = commitProgress;

    // Add event listener
    slider.addEventListener('input', onTimeSliderChange);

    // Call once to initialize the time display
    onTimeSliderChange.call(slider);
}

function updateScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart').select('svg');

    xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    const xAxis = d3.axisBottom(xScale);

    // CHANGE: we should clear out the existing xAxis and then create a new one.
    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);

    const dots = svg.select('g.dots');

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    dots
        .selectAll('circle')
        .data(sortedCommits, d => d.commit)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
}


filteredCommits = commits;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap((d) => d.lines);
    let files = d3
        .groups(lines, (d) => d.file)
        .map(([name, lines]) => {
            return { name, lines };
        })
        .sort((a, b) => b.lines.length - a.lines.length);

    let filesContainer = d3
        .select('#files')
        .selectAll('div')
        .data(files, (d) => d.name)
        .join(
            // This code only runs when the div is initially rendered
            (enter) =>
                enter.append('div').call((div) => {
                    div.append('dt').append('code');
                    div.select('dt').append('small'); // Prep for line count
                    div.append('dd');
                }),
        );

    // This code updates the div info
    filesContainer.select('dt').html((d) => `
                <code>${d.name}</code>
                <small>${d.lines.length} lines</small>
            `);
    filesContainer
        .select('dd')
        .selectAll('div')
        .data((d) => d.lines)
        .join('div')
        .attr('style', (d) => `--color: ${colors(d.type)}`)
        .attr('class', 'loc');
}

renderScatterPlot(data, commits);
renderCommitInfo(data, commits);

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had done victoriously, and with great triumph. I did not think about the next long assignment, for I had earned my rest.
	`,
  );

// Remove the slider HTML and use this scroll-based approach
function onStepEnter(response) {
  const stepDateTime = response.element.__data__.datetime;
  console.log(stepDateTime);
  filteredCommits = commits.filter((d) => d.datetime <= stepDateTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
  const timeElement = document.getElementById('commit-time');
  if (timeElement) {
    timeElement.textContent = stepDateTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short"
    });
  }
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

  window.addEventListener('resize', scroller.resize);
// Initialize slider functionality
initTimeSlider();

// Initial empty tooltip
renderTooltipContent({});
