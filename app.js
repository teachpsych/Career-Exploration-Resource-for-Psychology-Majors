const jobslist = document.getElementById('jobslist');
const searchBar = document.getElementById('searchBar');
let jobData = [];

searchBar.addEventListener('keyup', (e) => {
    const searchString = e.target.value.toLowerCase();
    const searchWords = searchString.split(' ').filter(word => word.length > 0);

    // If search string is empty, display all jobs
    if (searchWords.length === 0) {
        displayJobs(jobData.flatMap(category => {
            return Object.entries(category.jobs).map(([jobTitle, job]) => ({
                main_category: category.main_category,
                jobTitle,
                job
            }));
        }));
        return;
    }

    // Filter jobs based on search string
    const filteredJobs = jobData.flatMap(category => {
        return Object.entries(category.jobs)
            .filter(([jobTitle, job]) => {
                // Check if job title matches any of the search words
                const jobTitleMatch = searchWords.some(word => jobTitle.toLowerCase().includes(word));

                // Check if any link's category or URL matches any of the search words
                const linksMatch = job.links.some(link =>
                    searchWords.some(word => 
                        link.url.toLowerCase().includes(word) || 
                        link.category.toLowerCase().includes(word)
                    )
                );

                return jobTitleMatch || linksMatch;
            })
            .map(([jobTitle, job]) => ({
                main_category: category.main_category,
                jobTitle,
                job
            }));
    });

    displayJobs(filteredJobs);
});

const loadJobs = async () => {
    try {
        const res = await fetch('jobs.json'); // Adjust the path if necessary
        jobData = await res.json(); // Load all categories and jobs
        displayJobs(jobData.flatMap(category => {
            return Object.entries(category.jobs).map(([jobTitle, job]) => ({
                main_category: category.main_category,
                jobTitle,
                job
            }));
        }));
    } catch (err) {
        console.error(err);
    }
};

const displayJobs = (jobs) => {
    let lastCategory = '';

    const htmlString = jobs
        .map(({ main_category, jobTitle, job }) => {
            // Check if the main category has changed
            const isNewCategory = main_category !== lastCategory;
            lastCategory = main_category;

            const linksHtml = job.links
                .map(link => `
                    <li class="link">
                        <span class="category">${link.category}</span>
                        <a href="${link.url}" target="_blank">${link.url}</a>
                    </li>
                `)
                .join('');

            return `
                ${isNewCategory ? `<h2 class="main-category">${main_category}</h2>` : ''}
                <div class="job-section">
                    <h3 class="job-title">${jobTitle}</h3>
                    <ul class="links-list">
                        ${linksHtml}
                    </ul>
                </div>
            `;
        })
        .join('');
    
    jobslist.innerHTML = htmlString;
};

// Load jobs data when the page is ready
document.addEventListener('DOMContentLoaded', loadJobs);
