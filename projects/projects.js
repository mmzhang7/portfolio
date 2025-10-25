import { fetchJSON, renderProjects, updateProjectCount } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const countElement = document.querySelector('#project_count');
updateProjectCount(projects, countElement);
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');