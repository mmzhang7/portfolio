import { fetchJSON, renderProjects, updateProjectCount } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const countElement = document.querySelector('#project_count');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let query = '';
let selectedIndex = -1;
let currentData = [];
let matchingYears = new Set();

function renderPieChart(p) {
  let svg = d3.select('#projects-pie-plot');
  let legend = d3.select('.legend');
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();


  let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year,
  );

  currentData = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });


  matchingYears.clear();
  if (query) {
    projects
      .filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
      })
      .forEach(project => matchingYears.add(project.year));
  }

  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(currentData);
  let arcs = arcData.map((d) => arcGenerator(d));
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcs.forEach((arc, index) => {
    const year = currentData[index].label;

    svg.append('path')
      .attr('d', arc)
      .attr('fill', colors(index))
      .attr('data-index', index)
      .attr('class', [
        selectedIndex === index ? 'selected' : '',
        query && !matchingYears.has(year) ? 'dimmed' : ''
      ].join(' ').trim())
      .on('click', () => handleSelection(index));
  });


  currentData.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('data-index', idx)
      .attr('class', [
        'legend-item',
        selectedIndex === idx ? 'selected' : '',
        query && !matchingYears.has(d.label) ? 'dimmed' : ''
      ].join(' ').trim())
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => handleSelection(idx));
  });
}

function handleSelection(index) {
  selectedIndex = selectedIndex === index ? -1 : index;
  updateFilteredProjects();
}

function filterProjects() {
  let filtered = projects;
  if (query) {
    filtered = filtered.filter(project => {
      const values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query.toLowerCase());
    });
  }
  if (selectedIndex !== -1 && currentData[selectedIndex]) {
    const selectedYear = currentData[selectedIndex].label;
    filtered = filtered.filter(p => p.year === selectedYear);
  }

  return filtered;
}

function updateFilteredProjects() {
  const filteredProjects = filterProjects();
  updateProjectCount(filteredProjects, countElement);
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(projects); 
}

function handleSearch(searchValue) {
  query = searchValue;
  updateFilteredProjects();
}

searchInput.addEventListener('input', e => handleSearch(e.target.value));

updateProjectCount(projects, countElement);
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);