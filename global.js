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
    
let nav = document.createElement("nav");
document.body.prepend(nav);

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
			<option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
		</select>
	</label>`,
);

const select = document.querySelector(".color-scheme select");

if ("colorScheme" in localStorage) {
  document.documentElement.style.setProperty("color-scheme", localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

select.addEventListener("input", function (event) {
  console.log("color scheme changed to", event.target.value);
  document.documentElement.style.setProperty("color-scheme", event.target.value);
  localStorage.colorScheme = event.target.value;
});

let prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
let autoOption = select.querySelector('option[value="light dark"]');
autoOption.textContent = prefersDark
  ? "Automatic (Dark)"
  : "Automatic (Light)";
  
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  let autoOption = select.querySelector('option[value="light dark"]');
  autoOption.textContent = e.matches
    ? "Automatic (Dark)"
    : "Automatic (Light)";
});

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