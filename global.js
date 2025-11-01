console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "https://github.com/mmzhang7", title: "Profile" },
];
    
let nav = document.querySelector('nav');
if (!nav) {
  nav = document.createElement("nav");
  document.body.prepend(nav);
}

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/portfolio/";         // GitHub Pages repo name

for (let p of pages) {
  let url = p.url;
  url = !url.startsWith('http') ? BASE_PATH + url : url;
  let title = p.title;
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);
  if (a.host === location.host && a.pathname === location.pathname) {
  a.classList.add('current');
  }
  if (a.host !== location.host) {
    a.target = "_blank";
  }
   
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="auto">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector(".color-scheme select");

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}


function applyTheme(value) {
  if (value === "auto") {
    document.documentElement.removeAttribute("data-theme");
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
  } else if (value === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.style.backgroundColor = "white";
    document.body.style.color = "black";
  } else if (value === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.style.backgroundColor = "black";
    document.body.style.color = "white";
  }
}


let savedTheme = localStorage.getItem("theme") || "auto";
select.value = savedTheme;
applyTheme(savedTheme);


select.addEventListener("input", (e) => {
  const value = e.target.value;
  localStorage.setItem("theme", value);
  applyTheme(value);
});


function updateAutoLabel() {
  const autoOption = select.querySelector('option[value="auto"]');
  if (!autoOption) return; // safeguard

  autoOption.textContent = systemPrefersDark()
    ? "Automatic (Dark)"
    : "Automatic (Light)";


  if (select.value === "auto") applyTheme("auto");
}


window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateAutoLabel);


updateAutoLabel();


let form = document.querySelector("form");
form?.addEventListener("submit", (event) => {
  event.preventDefault();

  let data = new FormData(form);
  let params = [];

  // Encode all form fields
  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
    console.log(name, value);
  }

  let url = `${form.action}?${params.join("&")}`;
  location.href = url;
});

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(project, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';
  for (let proj of project) {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${proj.title}</${headingLevel}>
      <img src="${proj.image}" alt="${proj.title}">
      <p>${proj.description}</p>
      <span class="year">${proj.year}</span>
    `;
    containerElement.appendChild(article);
  }
}

export function updateProjectCount(projects, countElement) {
    const totalProjects = projects.length;
    const projectWord = totalProjects === 1 ? 'project' : 'projects';
    countElement.innerHTML = `
        <p>Showing <strong>${totalProjects}</strong> ${projectWord} in total</p>
    `;
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}